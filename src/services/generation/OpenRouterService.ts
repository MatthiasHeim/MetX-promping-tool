import OpenAI from 'openai'
import type { Model, GenerationError, GenerationProgress, GenerationStatus } from '../../types/database'

export interface OpenRouterGenerationResult {
  success: boolean;
  content?: string;
  tokens_used?: number;
  latency_ms: number;
  error?: GenerationError;
}

export interface OpenRouterParallelResult {
  results: Array<{
    model_id: string;
    success: boolean;
    content?: string;
    tokens_used?: number;
    latency_ms: number;
    cost_chf: number;
    error?: GenerationError;
  }>;
  total_cost_chf: number;
  total_latency_ms: number;
}

export class OpenRouterService {
  private static openrouter: OpenAI | null = null

  /**
   * Initialize OpenRouter client with API key validation
   */
  private static getClient(): OpenAI {
    if (!this.openrouter) {
      this.validateApiKey()
      this.openrouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
        dangerouslyAllowBrowser: true, // For frontend usage - in production, use backend proxy
        defaultHeaders: {
          'HTTP-Referer': 'https://metx.ai', // Optional. Site URL for rankings on openrouter.ai
          'X-Title': 'MetX Weather Dashboard Generator', // Optional. Site title for rankings on openrouter.ai
        }
      })
    }
    return this.openrouter
  }

  /**
   * Validate that OpenRouter API key is configured
   */
  static validateApiKey(): void {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
    
    if (!apiKey) {
      throw new Error('OpenRouter API key is not configured. Please set VITE_OPENROUTER_API_KEY environment variable.')
    }
    
    // Check if API key has reasonable length (OpenRouter keys are typically longer than OpenAI)
    if (apiKey.length < 20) {
      throw new Error('OpenRouter API key appears to be too short. Please check your API key.')
    }
    
    console.log('OpenRouter API key validation passed')
  }

  /**
   * Generate completion using OpenRouter API
   */
  static async generateCompletion(
    prompt: string,
    model: Model,
    imageUrl?: string
  ): Promise<OpenRouterGenerationResult> {
    // Validation
    if (!prompt) {
      throw new Error('Prompt is required')
    }
    if (!model.id) {
      throw new Error('Model ID is required')
    }

    const startTime = Date.now()
    const client = this.getClient()

    try {
      // Prepare messages based on whether we have an image
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'user',
          content: imageUrl ? [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ] : prompt
        }
      ]

      // Prepare completion parameters
      const completionParams: any = {
        model: model.id,
        messages,
        response_format: { type: 'json_object' },
        max_tokens: 4000,
        temperature: 0.7
      }

      const completion = await client.chat.completions.create(completionParams)

      const latency = Date.now() - startTime
      const content = completion.choices[0]?.message?.content

      if (!content) {
        return {
          success: false,
          latency_ms: latency,
          error: {
            model_id: model.id,
            error_type: 'invalid_response',
            message: 'Empty response from OpenRouter',
            retryable: true
          }
        }
      }

      return {
        success: true,
        content,
        tokens_used: completion.usage?.total_tokens || 0,
        latency_ms: latency
      }
    } catch (error) {
      const latency = Date.now() - startTime
      
      // Log detailed error information for debugging
      console.error(`OpenRouter API error for model ${model.id}:`, error)
      
      const generationError = this.handleOpenRouterError(error as Error, model.id)

      return {
        success: false,
        latency_ms: latency,
        error: generationError
      }
    }
  }

  /**
   * Execute generation for multiple models in parallel
   */
  static async executeParallelGeneration(
    prompt: string,
    models: Model[],
    imageUrl?: string,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<OpenRouterParallelResult> {
    const userInputId = `temp-${Date.now()}`
    let progress = this.createProgressTracker(userInputId, models.map(m => m.id))
    
    if (onProgress) {
      onProgress(progress)
    }

    // Execute all models in parallel using Promise.allSettled
    const modelPromises = models.map(async (model) => {
      // Update progress to show current model
      progress = this.updateProgress(progress, 'running', model.id)
      if (onProgress) {
        onProgress(progress)
      }

      const result = await this.generateCompletion(prompt, model, imageUrl)
      const cost = result.tokens_used ? this.calculateCost(model, result.tokens_used) : 0

      // Update progress to mark model as completed
      progress = this.updateProgress(progress, 'running', undefined, model.id)
      if (onProgress) {
        onProgress(progress)
      }

      return {
        model_id: model.id,
        success: result.success,
        content: result.content,
        tokens_used: result.tokens_used,
        latency_ms: result.latency_ms,
        cost_chf: cost,
        error: result.error
      }
    })

    const results = await Promise.allSettled(modelPromises)
    
    // Process results
    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        // Handle rejected promises
        const model = models[index]
        return {
          model_id: model.id,
          success: false,
          latency_ms: 0,
          cost_chf: 0,
          error: this.handleOpenRouterError(result.reason, model.id)
        }
      }
    })

    // Calculate totals
    const totalCost = processedResults.reduce((sum, result) => sum + result.cost_chf, 0)
    const totalLatency = Math.max(...processedResults.map(result => result.latency_ms))

    // Final progress update
    progress = this.updateProgress(progress, 'completed')
    if (onProgress) {
      onProgress(progress)
    }

    return {
      results: processedResults,
      total_cost_chf: totalCost,
      total_latency_ms: totalLatency
    }
  }

  /**
   * Calculate cost based on model pricing
   */
  private static calculateCost(model: Model, tokensUsed: number): number {
    const costPerThousandTokens = model.price_per_1k_tokens
    const cost = (tokensUsed / 1000) * costPerThousandTokens
    return Math.round(cost * 10000) / 10000 // Round to 4 decimal places
  }

  /**
   * Handle OpenRouter API errors
   */
  private static handleOpenRouterError(error: Error, modelId: string): GenerationError {
    console.error('OpenRouter API Error:', error)
    
    const message = error.message.toLowerCase()
    
    let errorType: GenerationError['error_type'] = 'unknown'
    let retryable = false
    
    if (message.includes('timeout') || message.includes('time out')) {
      errorType = 'timeout'
      retryable = true
    } else if (message.includes('rate limit') || message.includes('too many requests')) {
      errorType = 'rate_limit'
      retryable = true
    } else if (message.includes('api key') || message.includes('unauthorized') || message.includes('authentication')) {
      errorType = 'auth'
      retryable = false
    } else if (message.includes('invalid') && message.includes('response')) {
      errorType = 'invalid_response'
      retryable = true
    }
    
    return {
      model_id: modelId,
      error_type: errorType,
      message: error.message,
      retryable
    }
  }

  /**
   * Create progress tracker for generation
   */
  private static createProgressTracker(userInputId: string, modelIds: string[]): GenerationProgress {
    return {
      user_input_id: userInputId,
      status: 'pending',
      completed_models: [],
      total_models: modelIds.length,
      current_model: undefined
    }
  }

  /**
   * Update progress tracker
   */
  private static updateProgress(
    progress: GenerationProgress,
    status: GenerationStatus,
    currentModel?: string,
    completedModel?: string
  ): GenerationProgress {
    const updated = { ...progress }
    
    updated.status = status
    
    if (currentModel !== undefined) {
      updated.current_model = currentModel
    }
    
    if (completedModel) {
      if (!updated.completed_models.includes(completedModel)) {
        updated.completed_models.push(completedModel)
      }
      updated.current_model = undefined
    }
    
    // Mark as completed if all models are done
    if (updated.completed_models.length === updated.total_models && status === 'running') {
      updated.status = 'completed'
    }
    
    return updated
  }
} 