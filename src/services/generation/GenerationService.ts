// GenerationService - Core generation pipeline for MetX prompting tool
import { OpenAIService } from './OpenAIService'
import { OpenRouterService } from './OpenRouterService'
import type { 
  Model, 
  GenerationProgress, 
  GenerationStatus,
  CostGuardrailResult,
  GenerationError 
} from '../../types/database'

export class GenerationService {
  
  // Cost calculation methods
  static calculateCost(model: Model, estimatedTokens: number): number {
    const cost = (estimatedTokens / 1000) * model.price_per_1k_tokens
    return Math.round(cost * 10000) / 10000 // Round to 4 decimal places
  }

  static estimateTokens(text: string, hasImage: boolean = false): number {
    // Rough estimation: ~1.3 tokens per word for English text
    const wordCount = text.split(' ').length
    const textTokens = Math.ceil(wordCount * 1.3)
    
    // Add standard image token cost if image is present
    const imageTokens = hasImage ? 765 : 0
    
    return textTokens + imageTokens
  }

  static estimateTokensForGeneration(
    userInput: string, 
    promptTemplate: string, 
    hasImage: boolean = false
  ): number {
    // Process the full prompt that will be sent to the LLM
    const fullPrompt = this.processPromptTemplate(promptTemplate, userInput)
    
    // Estimate tokens for the complete prompt
    return this.estimateTokens(fullPrompt, hasImage)
  }

  static checkCostGuardrails(
    models: Model[], 
    estimatedTokens: number, 
    maxCostChf: number
  ): CostGuardrailResult {
    const totalCost = models.reduce((sum, model) => {
      return sum + this.calculateCost(model, estimatedTokens)
    }, 0)

    if (totalCost > maxCostChf) {
      return {
        canProceed: false,
        totalCost,
        warning: `Estimated cost (${totalCost.toFixed(4)} CHF) exceeds maximum cost threshold (${maxCostChf} CHF)`
      }
    }

    return {
      canProceed: true,
      totalCost
    }
  }

  static checkCostGuardrailsForGeneration(
    models: Model[],
    userInput: string,
    promptTemplate: string,
    hasImage: boolean = false,
    maxCostChf: number = 0.20
  ): CostGuardrailResult {
    const estimatedTokens = this.estimateTokensForGeneration(userInput, promptTemplate, hasImage)
    return this.checkCostGuardrails(models, estimatedTokens, maxCostChf)
  }

  // Prompt template processing
  static processPromptTemplate(template: string, userInput: string): string {
    // Support both new {{user_input}} and legacy {{output}} placeholders
    return template
      .replace(/\{\{user_input\}\}/g, userInput)
      .replace(/\{\{output\}\}/g, userInput) // Keep for backward compatibility
  }

  // JSON processing methods
  static processJsonOutput(content: string, prefix?: string, suffix?: string): string {
    const finalPrefix = prefix || ''
    const finalSuffix = suffix || ''
    return finalPrefix + content + finalSuffix
  }

  static validateJson(jsonString: string): boolean {
    try {
      JSON.parse(jsonString)
      return true
    } catch {
      return false
    }
  }

  // Progress tracking methods
  static createProgressTracker(userInputId: string, modelIds: string[]): GenerationProgress {
    return {
      user_input_id: userInputId,
      status: 'pending',
      completed_models: [],
      total_models: modelIds.length,
      current_model: undefined
    }
  }

  static updateProgress(
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

  // Error handling
  static handleGenerationError(error: Error, modelId: string): GenerationError {
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

  // Model execution methods supporting both OpenAI and OpenRouter
  static async executeGeneration(
    prompt: string,
    model: Model,
    imageUrl?: string
  ): Promise<{
    success: boolean;
    content?: string;
    tokens_used?: number;
    latency_ms: number;
    error?: GenerationError;
  }> {
    try {
      // Route to appropriate service based on model provider
      if (model.provider === 'openrouter') {
        return await OpenRouterService.generateCompletion(prompt, model, imageUrl)
      } else {
        // Default to OpenAI service for 'openai' provider and others
        return await OpenAIService.generateCompletion(prompt, model, imageUrl)
      }
    } catch (error) {
      return {
        success: false,
        latency_ms: 0,
        error: this.handleGenerationError(error as Error, model.id)
      }
    }
  }

  static async executeParallelGeneration(
    prompt: string,
    models: Model[],
    imageUrl?: string,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<{
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
  }> {
    try {
      // Separate models by provider
      const openaiModels = models.filter(model => model.provider !== 'openrouter')
      const openrouterModels = models.filter(model => model.provider === 'openrouter')
      
      // Execute in parallel across providers
      const promises: Promise<any>[] = []
      
      if (openaiModels.length > 0) {
        promises.push(OpenAIService.executeParallelGeneration(prompt, openaiModels, imageUrl, onProgress))
      }
      
      if (openrouterModels.length > 0) {
        promises.push(OpenRouterService.executeParallelGeneration(prompt, openrouterModels, imageUrl, onProgress))
      }
      
      const results = await Promise.all(promises)
      
      // Combine results from all providers
      const combinedResults = results.reduce((acc, result) => {
        acc.results.push(...result.results)
        acc.total_cost_chf += result.total_cost_chf
        acc.total_latency_ms = Math.max(acc.total_latency_ms, result.total_latency_ms)
        return acc
      }, {
        results: [] as any[],
        total_cost_chf: 0,
        total_latency_ms: 0
      })
      
      return combinedResults
    } catch (error) {
      // Fallback error handling
      const results = models.map(model => ({
        model_id: model.id,
        success: false,
        latency_ms: 0,
        cost_chf: 0,
        error: this.handleGenerationError(error as Error, model.id)
      }))
      
      return {
        results,
        total_cost_chf: 0,
        total_latency_ms: 0
      }
    }
  }
} 