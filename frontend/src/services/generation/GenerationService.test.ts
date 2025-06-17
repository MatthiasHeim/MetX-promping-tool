import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GenerationService } from './GenerationService'
import type { Model, CreateGenerationRequest, GenerationProgress } from '../../types/database'

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }))
}))

describe('GenerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Cost Calculation', () => {
    it('should calculate cost correctly for GPT-4.1', () => {
      const model: Model = {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        provider: 'openai',
        price_per_1k_tokens: 0.06
      }

      const estimatedTokens = 1000
      const cost = GenerationService.calculateCost(model, estimatedTokens)
      
      expect(cost).toBe(0.06) // 1000 tokens * 0.06 per 1k tokens
    })

    it('should calculate cost correctly for o3', () => {
      const model: Model = {
        id: 'o3',
        name: 'o3',
        provider: 'openai', 
        price_per_1k_tokens: 0.15
      }

      const estimatedTokens = 2500
      const cost = GenerationService.calculateCost(model, estimatedTokens)
      
      expect(cost).toBe(0.375) // 2500 tokens * 0.15 per 1k tokens
    })

    it('should calculate cost correctly for GPT-4o', () => {
      const model: Model = {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        price_per_1k_tokens: 0.005
      }

      const estimatedTokens = 5000
      const cost = GenerationService.calculateCost(model, estimatedTokens)
      
      expect(cost).toBe(0.025) // 5000 tokens * 0.005 per 1k tokens
    })

    it('should round cost to 4 decimal places', () => {
      const model: Model = {
        id: 'gpt-4.1',
        name: 'GPT-4.1', 
        provider: 'openai',
        price_per_1k_tokens: 0.06
      }

      const estimatedTokens = 333
      const cost = GenerationService.calculateCost(model, estimatedTokens)
      
      expect(cost).toBe(0.0200) // 333 * 0.06 / 1000 = 0.01998, rounded to 0.0200
    })
  })

  describe('Cost Estimation', () => {
    it('should estimate tokens based on input text length', () => {
      const text = 'Generate a MetX dashboard with temperature and precipitation data for Switzerland'
      const estimatedTokens = GenerationService.estimateTokens(text)
      
      // Rough estimation: ~1.3 tokens per word
      const wordCount = text.split(' ').length
      const expectedTokens = Math.ceil(wordCount * 1.3)
      
      expect(estimatedTokens).toBeCloseTo(expectedTokens, 10)
    })

    it('should include image tokens in estimation when image is provided', () => {
      const text = 'Generate dashboard based on this map'
      const hasImage = true
      const estimatedTokens = GenerationService.estimateTokens(text, hasImage)
      
      const textTokens = Math.ceil(text.split(' ').length * 1.3)
      const expectedTokens = textTokens + 765 // Standard image token cost
      
      expect(estimatedTokens).toBe(expectedTokens)
    })
  })

  describe('Cost Guardrails', () => {
    it('should reject generation if total cost exceeds threshold', () => {
      const models: Model[] = [
        { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', price_per_1k_tokens: 0.06 },
        { id: 'o3', name: 'o3', provider: 'openai', price_per_1k_tokens: 0.15 }
      ]

      const estimatedTokens = 5000 // This would cost: 0.30 + 0.75 = 1.05 CHF
      const maxCostChf = 0.20

      const result = GenerationService.checkCostGuardrails(models, estimatedTokens, maxCostChf)
      
      expect(result.canProceed).toBe(false)
      expect(result.totalCost).toBe(1.05)
      expect(result.warning).toContain('exceeds maximum cost')
    })

    it('should allow generation if cost is within threshold', () => {
      const models: Model[] = [
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', price_per_1k_tokens: 0.005 }
      ]

      const estimatedTokens = 2000 // This would cost: 0.01 CHF
      const maxCostChf = 0.20

      const result = GenerationService.checkCostGuardrails(models, estimatedTokens, maxCostChf)
      
      expect(result.canProceed).toBe(true)
      expect(result.totalCost).toBe(0.01)
      expect(result.warning).toBeUndefined()
    })
  })

  describe('Prompt Template Processing', () => {
    it('should replace {{output}} placeholder correctly', () => {
      const template = 'Generate a MetX dashboard based on: {{output}}'
      const userInput = 'temperature data for Switzerland'
      const processed = GenerationService.processPromptTemplate(template, userInput)
      
      expect(processed).toBe('Generate a MetX dashboard based on: temperature data for Switzerland')
    })

    it('should handle template without placeholder', () => {
      const template = 'Generate a standard MetX dashboard'
      const userInput = 'temperature data'
      const processed = GenerationService.processPromptTemplate(template, userInput)
      
      expect(processed).toBe('Generate a standard MetX dashboard')
    })

    it('should handle multiple placeholders', () => {
      const template = 'Create {{output}} dashboard for {{output}} visualization'
      const userInput = 'weather'
      const processed = GenerationService.processPromptTemplate(template, userInput)
      
      expect(processed).toBe('Create weather dashboard for weather visualization')
    })
  })

  describe('JSON Processing', () => {
    it('should concatenate prefix, content, and suffix', () => {
      const prefix = '{"version": "1.0", "dashboard": {'
      const content = '"layers": ["temperature"], "region": "CH"'
      const suffix = '}}'
      
      const result = GenerationService.processJsonOutput(content, prefix, suffix)
      
      expect(result).toBe('{"version": "1.0", "dashboard": {"layers": ["temperature"], "region": "CH"}}')
    })

    it('should handle empty prefix and suffix', () => {
      const content = '{"layers": ["temperature"]}'
      
      const result = GenerationService.processJsonOutput(content, '', '')
      
      expect(result).toBe('{"layers": ["temperature"]}')
    })

    it('should validate JSON structure', () => {
      const validJson = '{"layers": ["temperature"]}'
      const invalidJson = '{"layers": ["temperature"'
      
      expect(GenerationService.validateJson(validJson)).toBe(true)
      expect(GenerationService.validateJson(invalidJson)).toBe(false)
    })
  })

  describe('Generation Progress Tracking', () => {
    it('should create initial progress state', () => {
      const userInputId = 'test-input-123'
      const modelIds = ['gpt-4.1', 'o3', 'gpt-4o']
      
      const progress = GenerationService.createProgressTracker(userInputId, modelIds)
      
      expect(progress.user_input_id).toBe(userInputId)
      expect(progress.status).toBe('pending')
      expect(progress.completed_models).toEqual([])
      expect(progress.total_models).toBe(3)
      expect(progress.current_model).toBeUndefined()
    })

    it('should update progress when model starts', () => {
      const progress: GenerationProgress = {
        user_input_id: 'test-123',
        status: 'pending',
        completed_models: [],
        total_models: 2,
        current_model: undefined
      }

      const updated = GenerationService.updateProgress(progress, 'running', 'gpt-4.1')
      
      expect(updated.status).toBe('running')
      expect(updated.current_model).toBe('gpt-4.1')
    })

    it('should update progress when model completes', () => {
      const progress: GenerationProgress = {
        user_input_id: 'test-123',
        status: 'running',
        completed_models: [],
        total_models: 2,
        current_model: 'gpt-4.1'
      }

      const updated = GenerationService.updateProgress(progress, 'running', undefined, 'gpt-4.1')
      
      expect(updated.completed_models).toContain('gpt-4.1')
      expect(updated.current_model).toBeUndefined()
    })

    it('should mark as completed when all models finish', () => {
      const progress: GenerationProgress = {
        user_input_id: 'test-123',
        status: 'running',
        completed_models: ['gpt-4.1'],
        total_models: 2,
        current_model: 'o3'
      }

      const updated = GenerationService.updateProgress(progress, 'running', undefined, 'o3')
      
      expect(updated.status).toBe('completed')
      expect(updated.completed_models).toEqual(['gpt-4.1', 'o3'])
    })
  })

  describe('Error Handling', () => {
    it('should handle API timeout errors', () => {
      const error = new Error('Request timeout')
      const handled = GenerationService.handleGenerationError(error, 'gpt-4.1')
      
      expect(handled.model_id).toBe('gpt-4.1')
      expect(handled.error_type).toBe('timeout')
      expect(handled.message).toContain('timeout')
      expect(handled.retryable).toBe(true)
    })

    it('should handle API rate limit errors', () => {
      const error = new Error('Rate limit exceeded')
      const handled = GenerationService.handleGenerationError(error, 'o3')
      
      expect(handled.model_id).toBe('o3')
      expect(handled.error_type).toBe('rate_limit')
      expect(handled.retryable).toBe(true)
    })

    it('should handle invalid API key errors', () => {
      const error = new Error('Invalid API key')
      const handled = GenerationService.handleGenerationError(error, 'gpt-4o')
      
      expect(handled.error_type).toBe('auth')
      expect(handled.retryable).toBe(false)
    })
  })
}) 