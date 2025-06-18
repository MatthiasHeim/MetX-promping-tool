import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModelService } from './ModelService'
import type { Model } from '../../types/database'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          then: vi.fn()
        })),
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}))

describe('ModelService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchModels', () => {
    it('should fetch models successfully', async () => {
      const mockModels: Model[] = [
        { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai', price_per_1k_tokens: 0.0004 },
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', price_per_1k_tokens: 0.005 },
        { id: 'o3', name: 'o3', provider: 'openai', price_per_1k_tokens: 0.002 }
      ]

      const mockSupabase = await import('../../lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockModels, error: null }))
        }))
      }))
      
      mockSupabase.supabase.from = mockFrom

      const result = await ModelService.fetchModels()

      expect(mockFrom).toHaveBeenCalledWith('models')
      expect(result).toEqual(mockModels)
    })

    it('should handle fetch errors', async () => {
      const mockError = { message: 'Database error' }
      
      const mockSupabase = await import('../../lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
        }))
      }))
      
      mockSupabase.supabase.from = mockFrom

      await expect(ModelService.fetchModels()).rejects.toThrow('Failed to fetch models: Database error')
    })

    it('should return empty array when no models found', async () => {
      const mockSupabase = await import('../../lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
      
      mockSupabase.supabase.from = mockFrom

      const result = await ModelService.fetchModels()

      expect(result).toEqual([])
    })
  })

  describe('fetchModelById', () => {
    it('should fetch a single model by ID', async () => {
      const mockModel: Model = {
        id: 'gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        provider: 'openai',
        price_per_1k_tokens: 0.0004
      }

      const mockSupabase = await import('../../lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockModel, error: null }))
          }))
        }))
      }))
      
      mockSupabase.supabase.from = mockFrom

      const result = await ModelService.fetchModelById('gpt-4.1-mini')

      expect(result).toEqual(mockModel)
    })

    it('should return null when model not found', async () => {
      const mockError = { code: 'PGRST116', message: 'Not found' }
      
      const mockSupabase = await import('../../lib/supabase')
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
          }))
        }))
      }))
      
      mockSupabase.supabase.from = mockFrom

      const result = await ModelService.fetchModelById('non-existent')

      expect(result).toBeNull()
    })
  })
}) 