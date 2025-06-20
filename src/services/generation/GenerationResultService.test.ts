import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GenerationResultService } from './GenerationResultService'

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({})),
        single: vi.fn(),
        limit: vi.fn(() => ({})),
        range: vi.fn(() => ({}))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }))
}

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}))

// Mock EvaluationService
vi.mock('../evaluation/EvaluationService', () => ({
  EvaluationService: {
    generateOverallEvaluation: vi.fn(() => ({
      overallScore: 0.8,
      rationale: 'Test evaluation',
      criteria: {
        parameterCompleteness: { score: 0.9, rationale: 'Good parameters' },
        structureQuality: { score: 0.8, rationale: 'Valid structure' },
        layerCount: { score: 0.7, rationale: '2 layers found', layerCount: 2 },
        costEfficiency: { score: 0.9, rationale: 'Cost efficient' },
        performance: { score: 0.8, rationale: 'Good performance' }
      }
    }))
  }
}))

describe('GenerationResultService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createGenerationResult', () => {
    it('should create a generation result successfully', async () => {
      const mockResult = {
        id: 'result-1',
        user_input_id: 'input-1',
        prompt_id: 'prompt-1',
        model_id: 'gpt-4.1',
        user_id: 'user-1',
        raw_json: { test: 'data' },
        final_json: { complete: 'data' },
        cost_chf: 0.05,
        latency_ms: 2000,
        created_at: '2024-01-01T00:00:00Z'
      }

      const insertData = {
        user_input_id: 'input-1',
        prompt_id: 'prompt-1',
        model_id: 'gpt-4.1',
        user_id: 'user-1',
        raw_json: { test: 'data' },
        final_json: { complete: 'data' },
        cost_chf: 0.05,
        latency_ms: 2000
      }

      // Mock successful database response
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockResult,
        error: null
      })

      const result = await GenerationResultService.createGenerationResult(insertData)

      expect(result).toEqual(mockResult)
      expect(mockSupabase.from).toHaveBeenCalledWith('generation_results')
    })

    it('should throw error when required fields are missing', async () => {
      const invalidData = {
        user_input_id: '',
        prompt_id: 'prompt-1',
        model_id: 'gpt-4.1',
        user_id: 'user-1'
      }

      await expect(
        GenerationResultService.createGenerationResult(invalidData)
      ).rejects.toThrow('User input ID is required')
    })

    it('should handle database errors', async () => {
      const insertData = {
        user_input_id: 'input-1',
        prompt_id: 'prompt-1',
        model_id: 'gpt-4.1',
        user_id: 'user-1'
      }

      // Mock database error
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(
        GenerationResultService.createGenerationResult(insertData)
      ).rejects.toThrow('Failed to create generation result: Database error')
    })
  })

  describe('createGenerationResults', () => {
    it('should create multiple generation results in batch', async () => {
      const mockResults = [
        {
          id: 'result-1',
          user_input_id: 'input-1',
          prompt_id: 'prompt-1',
          model_id: 'gpt-4.1',
          user_id: 'user-1',
          cost_chf: 0.05,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'result-2',
          user_input_id: 'input-1',
          prompt_id: 'prompt-1',
          model_id: 'o3',
          user_id: 'user-1',
          cost_chf: 0.08,
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      const insertData = [
        {
          user_input_id: 'input-1',
          prompt_id: 'prompt-1',
          model_id: 'gpt-4.1',
          user_id: 'user-1',
          cost_chf: 0.05
        },
        {
          user_input_id: 'input-1',
          prompt_id: 'prompt-1',
          model_id: 'o3',
          user_id: 'user-1',
          cost_chf: 0.08
        }
      ]

      // Mock successful batch insert
      mockSupabase.from().insert().select.mockResolvedValue({
        data: mockResults,
        error: null
      })

      const results = await GenerationResultService.createGenerationResults(insertData)

      expect(results).toEqual(mockResults)
      expect(results).toHaveLength(2)
    })

    it('should validate all results in batch', async () => {
      const invalidData = [
        {
          user_input_id: 'input-1',
          prompt_id: 'prompt-1',
          model_id: 'gpt-4.1',
          user_id: 'user-1'
        },
        {
          user_input_id: '', // Invalid
          prompt_id: 'prompt-1',
          model_id: 'o3',
          user_id: 'user-1'
        }
      ]

      await expect(
        GenerationResultService.createGenerationResults(invalidData)
      ).rejects.toThrow('All generation results must have user_input_id, prompt_id, model_id, and user_id')
    })
  })

  describe('getGenerationResultsByUserInput', () => {
    it('should fetch generation results for a user input', async () => {
      const mockResults = [
        {
          id: 'result-1',
          user_input_id: 'input-1',
          model_id: 'gpt-4.1',
          cost_chf: 0.05
        }
      ]

      // Mock query chain
      const mockQuery = {
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: mockResults,
            error: null
          }))
        }))
      }
      
      mockSupabase.from().select.mockReturnValue(mockQuery)

      const results = await GenerationResultService.getGenerationResultsByUserInput('input-1')

      expect(results).toEqual(mockResults)
      expect(mockQuery.eq).toHaveBeenCalledWith('user_input_id', 'input-1')
    })

    it('should throw error for missing user input ID', async () => {
      await expect(
        GenerationResultService.getGenerationResultsByUserInput('')
      ).rejects.toThrow('User input ID is required')
    })
  })

  describe('getGenerationResultsByUser', () => {
    it('should fetch generation results for a user with pagination', async () => {
      const mockResults = [
        {
          id: 'result-1',
          user_id: 'user-1',
          model_id: 'gpt-4.1'
        }
      ]

      // Mock complex query chain for pagination
      const mockRange = vi.fn(() => Promise.resolve({
        data: mockResults,
        error: null
      }))
      
      const mockLimit = vi.fn(() => ({
        range: mockRange
      }))
      
      const mockOrder = vi.fn(() => ({
        limit: mockLimit
      }))
      
      const mockEq = vi.fn(() => ({
        order: mockOrder
      }))
      
      mockSupabase.from().select.mockReturnValue({
        eq: mockEq
      })

      const results = await GenerationResultService.getGenerationResultsByUser('user-1', 10, 0)

      expect(results).toEqual(mockResults)
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockLimit).toHaveBeenCalledWith(10)
      expect(mockRange).toHaveBeenCalledWith(0, 9)
    })
  })

  describe('updateGenerationResult', () => {
    it('should update a generation result with manual rating', async () => {
      const mockUpdatedResult = {
        id: 'result-1',
        manual_score: 4,
        manual_comment: 'Good result'
      }

      const updates = {
        manual_score: 4,
        manual_comment: 'Good result'
      }

      // Mock update chain
      const mockSingle = vi.fn(() => Promise.resolve({
        data: mockUpdatedResult,
        error: null
      }))
      
      const mockSelect = vi.fn(() => ({
        single: mockSingle
      }))
      
      const mockEq = vi.fn(() => ({
        select: mockSelect
      }))
      
      mockSupabase.from().update.mockReturnValue({
        eq: mockEq
      })

      const result = await GenerationResultService.updateGenerationResult('result-1', updates)

      expect(result).toEqual(mockUpdatedResult)
      expect(mockEq).toHaveBeenCalledWith('id', 'result-1')
    })
  })

  describe('getGenerationStats', () => {
    it('should calculate generation statistics for a user', async () => {
      const mockData = [
        { cost_chf: 0.05, latency_ms: 2000, model_id: 'gpt-4.1' },
        { cost_chf: 0.08, latency_ms: 3000, model_id: 'o3' },
        { cost_chf: 0.03, latency_ms: 1500, model_id: 'gpt-4.1' }
      ]

      // Mock select query
      const mockEq = vi.fn(() => Promise.resolve({
        data: mockData,
        error: null
      }))
      
      mockSupabase.from().select.mockReturnValue({
        eq: mockEq
      })

      const stats = await GenerationResultService.getGenerationStats('user-1')

      expect(stats).toEqual({
        total_generations: 3,
        total_cost_chf: 0.16,
        avg_latency_ms: 2167, // (2000 + 3000 + 1500) / 3 = 2166.67 rounded to 2167
        models_used: ['gpt-4.1', 'o3']
      })
    })

    it('should handle empty results for stats', async () => {
      // Mock empty results
      const mockEq = vi.fn(() => Promise.resolve({
        data: [],
        error: null
      }))
      
      mockSupabase.from().select.mockReturnValue({
        eq: mockEq
      })

      const stats = await GenerationResultService.getGenerationStats('user-1')

      expect(stats).toEqual({
        total_generations: 0,
        total_cost_chf: 0,
        avg_latency_ms: 0,
        models_used: []
      })
    })
  })
}) 