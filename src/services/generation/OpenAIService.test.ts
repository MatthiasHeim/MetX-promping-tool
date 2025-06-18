import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenAIService } from './OpenAIService'
import type { Model } from '../../types/database'

// Mock OpenAI with proper hoisting
const mockCreate = vi.fn()

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate
      }
    }
  }))
}))

describe('OpenAIService - Real OpenAI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock environment variable for tests
    process.env.VITE_OPENAI_API_KEY = 'sk-test-key-for-tests'
  })

  const mockModel: Model = {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    price_per_1k_tokens: 0.005
  }

  describe('generateCompletion', () => {
    it('should successfully generate completion with text only', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: '{"layers": [{"type": "temperature"}]}'
          }
        }],
        usage: {
          total_tokens: 150
        }
      })

      const result = await OpenAIService.generateCompletion(
        'Show temperature data for Switzerland',
        mockModel
      )

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: 'Show temperature data for Switzerland'
        }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4000
      })

      expect(result.success).toBe(true)
      expect(result.content).toBe('{"layers": [{"type": "temperature"}]}')
      expect(result.tokens_used).toBe(150)
      expect(result.latency_ms).toBeGreaterThanOrEqual(0)
    })

    it('should handle text + image input', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: '{"layers": [{"type": "precipitation"}]}'
          }
        }],
        usage: {
          total_tokens: 200
        }
      })

      const result = await OpenAIService.generateCompletion(
        'Analyze this weather map',
        mockModel,
        'https://example.com/weather-map.png'
      )

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this weather map'
            },
            {
              type: 'image_url',
              image_url: {
                url: 'https://example.com/weather-map.png'
              }
            }
          ]
        }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4000
      })

      expect(result.success).toBe(true)
      expect(result.tokens_used).toBe(200)
    })

    it('should handle OpenAI API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'))

      const result = await OpenAIService.generateCompletion(
        'Test prompt',
        mockModel
      )

      expect(result.success).toBe(false)
      expect(result.error?.error_type).toBe('rate_limit')
      expect(result.error?.message).toBe('API rate limit exceeded')
      expect(result.error?.retryable).toBe(true)
    })

    it('should handle authentication errors', async () => {
      mockCreate.mockRejectedValue(new Error('Invalid API key'))

      const result = await OpenAIService.generateCompletion(
        'Test prompt',
        mockModel
      )

      expect(result.success).toBe(false)
      expect(result.error?.error_type).toBe('auth')
      expect(result.error?.retryable).toBe(false)
    })

    it('should handle timeout errors', async () => {
      mockCreate.mockRejectedValue(new Error('Request timeout'))

      const result = await OpenAIService.generateCompletion(
        'Test prompt',
        mockModel
      )

      expect(result.success).toBe(false)
      expect(result.error?.error_type).toBe('timeout')
      expect(result.error?.retryable).toBe(true)
    })

    it('should validate required parameters', async () => {
      await expect(
        OpenAIService.generateCompletion('', mockModel)
      ).rejects.toThrow('Prompt is required')

      await expect(
        OpenAIService.generateCompletion('Test', { ...mockModel, id: '' })
      ).rejects.toThrow('Model ID is required')
    })

    it('should handle empty response content', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: null
          }
        }],
        usage: {
          total_tokens: 50
        }
      })

      const result = await OpenAIService.generateCompletion(
        'Test prompt',
        mockModel
      )

      expect(result.success).toBe(false)
      expect(result.error?.error_type).toBe('invalid_response')
      expect(result.error?.message).toBe('Empty response from OpenAI')
    })
  })

  describe('executeParallelGeneration', () => {
    it('should execute multiple models in parallel', async () => {
      const models: Model[] = [
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', price_per_1k_tokens: 0.005 },
        { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai', price_per_1k_tokens: 0.0004 }
      ]

      mockCreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: '{"layers": ["temp"]}' } }],
          usage: { total_tokens: 100 }
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: '{"layers": ["wind"]}' } }],
          usage: { total_tokens: 80 }
        })

      const progressCallback = vi.fn()
      const result = await OpenAIService.executeParallelGeneration(
        'Test prompt',
        models,
        undefined,
        progressCallback
      )

      expect(result.results).toHaveLength(2)
      expect(result.results[0].success).toBe(true)
      expect(result.results[1].success).toBe(true)
      expect(result.total_cost_chf).toBeGreaterThan(0)
      expect(progressCallback).toHaveBeenCalled()
    })

    it('should handle mixed success/failure scenarios', async () => {
      const models: Model[] = [
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', price_per_1k_tokens: 0.005 },
        { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai', price_per_1k_tokens: 0.0004 }
      ]

      mockCreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: '{"layers": ["temp"]}' } }],
          usage: { total_tokens: 100 }
        })
        .mockRejectedValueOnce(new Error('API error'))

      const result = await OpenAIService.executeParallelGeneration(
        'Test prompt',
        models
      )

      expect(result.results).toHaveLength(2)
      expect(result.results[0].success).toBe(true)
      expect(result.results[1].success).toBe(false)
      expect(result.results[1].error).toBeDefined()
    })
  })

  describe('validateApiKey', () => {
    it('should validate API key is configured', () => {
      expect(() => OpenAIService.validateApiKey()).not.toThrow()
    })

    it('should throw error when API key is missing', () => {
      const originalEnv = process.env.VITE_OPENAI_API_KEY
      delete process.env.VITE_OPENAI_API_KEY

      expect(() => OpenAIService.validateApiKey()).toThrow('OpenAI API key is not configured')

      process.env.VITE_OPENAI_API_KEY = originalEnv
    })
  })
}) 