import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PromptService } from './PromptService'
import type { CreatePromptRequest, UpdatePromptRequest } from './PromptService'
import type { Prompt } from '../../types/database'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          range: vi.fn(() => ({
            data: [],
            error: null
          }))
        })),
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        })),
        or: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null
        }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id' } },
        error: null
      }))
    }
  }
}))

describe('PromptService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllPrompts', () => {
    it('should fetch all prompts with default options', async () => {
      const mockPrompts: Prompt[] = [
        {
          id: 'prompt-1',
          name: 'Test Prompt',
          description: 'Test Description',
          template_text: 'Test template',
          json_prefix: '',
          json_suffix: '',
          use_placeholder: false,
          version: 1,
          created_by: 'user-1',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ]

      const { supabase } = await import('../../lib/supabase')
      const mockQuery = {
        order: vi.fn(() => ({
          range: vi.fn(() => ({
            data: mockPrompts,
            error: null
          }))
        }))
      }
      
      ;(supabase.from as any).mockReturnValue({
        select: vi.fn(() => mockQuery)
      })

      const result = await PromptService.getAllPrompts()
      
      expect(result).toEqual(mockPrompts)
      expect(supabase.from).toHaveBeenCalledWith('prompts')
    })

    it('should handle errors when fetching prompts', async () => {
      const { supabase } = await import('../../lib/supabase')
      const mockQuery = {
        order: vi.fn(() => ({
          range: vi.fn(() => ({
            data: null,
            error: { message: 'Database error' }
          }))
        }))
      }
      
      ;(supabase.from as any).mockReturnValue({
        select: vi.fn(() => mockQuery)
      })

      await expect(PromptService.getAllPrompts()).rejects.toThrow('Failed to fetch prompts: Database error')
    })
  })

  describe('searchPrompts', () => {
    it('should search prompts by query', async () => {
      const mockPrompts: Prompt[] = [
        {
          id: 'prompt-1',
          name: 'Aviation Prompt',
          description: 'Aviation weather',
          template_text: 'Aviation template',
          json_prefix: '',
          json_suffix: '',
          use_placeholder: false,
          version: 1,
          created_by: 'user-1',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ]

      const { supabase } = await import('../../lib/supabase')
      const mockQuery = {
        or: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn(() => ({
              data: mockPrompts,
              error: null
            }))
          }))
        }))
      }
      
      ;(supabase.from as any).mockReturnValue({
        select: vi.fn(() => mockQuery)
      })

      const result = await PromptService.searchPrompts('aviation')
      
      expect(result).toEqual(mockPrompts)
      expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%aviation%,description.ilike.%aviation%,template_text.ilike.%aviation%')
    })

    it('should return all prompts when search query is empty', async () => {
      const getAllPromptsSpy = vi.spyOn(PromptService, 'getAllPrompts').mockResolvedValue([])
      
      await PromptService.searchPrompts('')
      
      expect(getAllPromptsSpy).toHaveBeenCalled()
    })
  })

  describe('createPrompt', () => {
    it('should create a new prompt', async () => {
      const createRequest: CreatePromptRequest = {
        name: 'New Prompt',
        description: 'New Description',
        template_text: 'New template',
        json_prefix: '{"prefix":',
        json_suffix: '}',
        use_placeholder: true
      }

      const mockCreatedPrompt: Prompt = {
        id: 'new-prompt-id',
        ...createRequest,
        version: 1,
        created_by: 'test-user-id',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      }

      const { supabase } = await import('../../lib/supabase')
      const mockInsert = {
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: mockCreatedPrompt,
            error: null
          }))
        }))
      }
      
      ;(supabase.from as any).mockReturnValue({
        insert: vi.fn(() => mockInsert)
      })

      const result = await PromptService.createPrompt(createRequest)
      
      expect(result).toEqual(mockCreatedPrompt)
      expect(supabase.from).toHaveBeenCalledWith('prompts')
    })

    it('should throw error when user is not authenticated', async () => {
      const { supabase } = await import('../../lib/supabase')
      ;(supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const createRequest: CreatePromptRequest = {
        name: 'New Prompt',
        template_text: 'New template'
      }

      await expect(PromptService.createPrompt(createRequest)).rejects.toThrow('User must be authenticated to create prompts')
    })
  })

  describe('validatePromptTemplate', () => {
    it('should validate a correct template', () => {
      const template = 'Generate weather for {{location}} with {{parameters}}'
      
      const result = PromptService.validatePromptTemplate(template)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.placeholders).toEqual(['location', 'parameters'])
    })

    it('should detect unmatched braces', () => {
      const template = 'Generate weather for {{location with {{parameters}}'
      
      const result = PromptService.validatePromptTemplate(template)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Unmatched braces in template')
    })

    it('should detect empty placeholders', () => {
      const template = 'Generate weather for {{}} with {{parameters}}'
      
      const result = PromptService.validatePromptTemplate(template)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Empty placeholder found')
    })

    it('should detect template too short', () => {
      const template = 'Short'
      
      const result = PromptService.validatePromptTemplate(template)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Template must be at least 10 characters long')
    })
  })

  describe('processTemplate', () => {
    it('should replace placeholders with variables', () => {
      const template = 'Generate weather for {{location}} with {{parameters}}'
      const variables = {
        location: 'Switzerland',
        parameters: 'temperature, precipitation'
      }
      
      const result = PromptService.processTemplate(template, variables)
      
      expect(result).toBe('Generate weather for Switzerland with temperature, precipitation')
    })

    it('should handle templates with no placeholders', () => {
      const template = 'Generate standard weather dashboard'
      const variables = {}
      
      const result = PromptService.processTemplate(template, variables)
      
      expect(result).toBe('Generate standard weather dashboard')
    })

    it('should handle placeholders with whitespace', () => {
      const template = 'Generate weather for {{ location }} with {{  parameters  }}'
      const variables = {
        location: 'Switzerland',
        parameters: 'temperature'
      }
      
      const result = PromptService.processTemplate(template, variables)
      
      expect(result).toBe('Generate weather for Switzerland with temperature')
    })
  })

  describe('getTemplateStats', () => {
    it('should calculate template statistics correctly', () => {
      const template = 'Generate weather dashboard for {{location}} with {{parameters}} data'
      
      const stats = PromptService.getTemplateStats(template)
      
      expect(stats.characterCount).toBe(template.length)
      expect(stats.wordCount).toBe(9) // 9 words excluding placeholders
      expect(stats.placeholderCount).toBe(2)
      expect(stats.estimatedTokens).toBe(Math.ceil(9 * 1.3))
    })

    it('should handle empty template', () => {
      const template = ''
      
      const stats = PromptService.getTemplateStats(template)
      
      expect(stats.characterCount).toBe(0)
      expect(stats.wordCount).toBe(0)
      expect(stats.placeholderCount).toBe(0)
      expect(stats.estimatedTokens).toBe(0)
    })
  })
}) 