import OpenAI from 'openai'
import type { Model, GenerationError, GenerationProgress, GenerationStatus } from '../../types/database'

export interface OpenAIGenerationResult {
  success: boolean;
  content?: string;
  tokens_used?: number;
  latency_ms: number;
  error?: GenerationError;
}

export interface OpenAIParallelResult {
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

export class OpenAIService {
  private static openai: OpenAI | null = null

  /**
   * Initialize OpenAI client with API key validation
   */
  private static getClient(): OpenAI {
    if (!this.openai) {
      this.validateApiKey()
      this.openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true // For frontend usage - in production, use backend proxy
      })
    }
    return this.openai
  }

  /**
   * Validate that OpenAI API key is configured
   */
  static validateApiKey(): void {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY environment variable.')
    }
    
    // Check if API key has the correct format (should start with 'sk-')
    if (!apiKey.startsWith('sk-')) {
      throw new Error('OpenAI API key appears to be invalid. It should start with "sk-".')
    }
    
    // Check if API key has reasonable length (OpenAI keys are typically 51 characters)
    if (apiKey.length < 20) {
      throw new Error('OpenAI API key appears to be too short. Please check your API key.')
    }
    
    console.log('OpenAI API key validation passed')
  }

  /**
   * Generate completion using OpenAI API
   */
  static async generateCompletion(
    prompt: string,
    model: Model,
    imageUrl?: string
  ): Promise<OpenAIGenerationResult> {
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

      // Prepare completion parameters - o3 models have different requirements
      const completionParams: any = {
        model: model.id,
        messages,
        response_format: { type: 'json_object' }
      }
      
      // o3 models have specific parameter requirements
      if (model.id.startsWith('o3') || model.id.includes('o3')) {
        // o3 models use max_completion_tokens and only support temperature: 1 (default)
        completionParams.max_completion_tokens = 4000
        completionParams.temperature = 1 // o3 only supports default temperature
      } else {
        // Other models use standard parameters
        completionParams.max_tokens = 4000
        completionParams.temperature = 0.7
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
            message: 'Empty response from OpenAI',
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
      console.error(`OpenAI API error for model ${model.id}:`, error)
      
      const generationError = this.handleOpenAIError(error as Error, model.id)

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
  ): Promise<OpenAIParallelResult> {
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
    const finalResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        // Get the model for better error context
        const model = models[index]
        const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason)
        
        console.error(`Generation failed for model ${model?.id || 'unknown'}:`, result.reason)
        
        return {
          model_id: model?.id || 'unknown',
          success: false,
          latency_ms: 0,
          cost_chf: 0,
          error: {
            model_id: model?.id || 'unknown',
            error_type: 'unknown' as const,
            message: `Generation failed: ${errorMessage}`,
            retryable: true
          }
        }
      }
    })

    const totalCost = finalResults.reduce((sum, result) => sum + result.cost_chf, 0)
    const totalLatency = finalResults.reduce((sum, result) => sum + result.latency_ms, 0)

    // Mark progress as completed
    progress = this.updateProgress(progress, 'completed')
    if (onProgress) {
      onProgress(progress)
    }

    return {
      results: finalResults,
      total_cost_chf: totalCost,
      total_latency_ms: totalLatency
    }
  }

  /**
   * Calculate cost based on model pricing and token usage
   */
  private static calculateCost(model: Model, tokensUsed: number): number {
    return (tokensUsed / 1000) * model.price_per_1k_tokens
  }

  /**
   * Handle OpenAI-specific errors and categorize them
   */
  private static handleOpenAIError(error: Error, modelId: string): GenerationError {
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