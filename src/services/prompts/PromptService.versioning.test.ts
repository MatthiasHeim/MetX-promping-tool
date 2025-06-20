import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PromptService } from './PromptService'
import { supabase } from '../../lib/supabase'

// Mock the supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}))

describe('PromptService Versioning', () => {
  const mockPromptId = 'test-prompt-id'
  const mockVersions = [
    {
      id: 'version-1',
      prompt_id: mockPromptId,
      version_number: 2,
      name: 'Test Prompt v2',
      description: 'Updated version',
      template_text: 'Updated template',
      json_prefix: '{"updated": true',
      json_suffix: '}',
      use_placeholder: true,
      created_by: null,
      created_at: '2023-01-02T00:00:00.000Z',
      is_active: true
    },
    {
      id: 'version-2',
      prompt_id: mockPromptId,
      version_number: 1,
      name: 'Test Prompt v1',
      description: 'Original version',
      template_text: 'Original template',
      json_prefix: '{"original": true',
      json_suffix: '}',
      use_placeholder: false,
      created_by: null,
      created_at: '2023-01-01T00:00:00.000Z',
      is_active: false
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPromptVersions', () => {
    it('should fetch all versions for a prompt', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({ data: mockVersions, error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder
      } as any)

      const result = await PromptService.getPromptVersions(mockPromptId)

      expect(supabase.from).toHaveBeenCalledWith('prompt_versions')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('prompt_id', mockPromptId)
      expect(mockOrder).toHaveBeenCalledWith('version_number', { ascending: false })
      expect(result).toEqual(mockVersions)
    })

    it('should handle errors when fetching versions', async () => {
      const mockError = { message: 'Database error' }
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder
      } as any)

      await expect(PromptService.getPromptVersions(mockPromptId))
        .rejects.toThrow('Failed to fetch prompt versions: Database error')
    })
  })

  describe('getPromptVersion', () => {
    it('should fetch a specific version', async () => {
      const targetVersion = mockVersions[0]
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({ data: targetVersion, error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      } as any)

      const result = await PromptService.getPromptVersion(mockPromptId, 2)

      expect(supabase.from).toHaveBeenCalledWith('prompt_versions')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('prompt_id', mockPromptId)
      expect(mockEq).toHaveBeenCalledWith('version_number', 2)
      expect(result).toEqual(targetVersion)
    })

    it('should return null when version not found', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } 
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      } as any)

      const result = await PromptService.getPromptVersion(mockPromptId, 999)

      expect(result).toBeNull()
    })
  })

  describe('rollbackPromptToVersion', () => {
    it('should rollback to a specific version', async () => {
      const mockUpdatedPrompt = {
        id: mockPromptId,
        name: 'Test Prompt v1',
        description: 'Original version',
        template_text: 'Original template',
        json_prefix: '{"original": true',
        json_suffix: '}',
        use_placeholder: false,
        is_default: false,
        version: 1,
        current_version: 1,
        is_active: true,
        created_by: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-03T00:00:00.000Z'
      }

      // Mock the RPC call
      vi.mocked(supabase.rpc).mockResolvedValue({ 
        data: true, 
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      })

      // Mock fetchPromptById
      vi.spyOn(PromptService, 'fetchPromptById').mockResolvedValue(mockUpdatedPrompt)

      const result = await PromptService.rollbackPromptToVersion(mockPromptId, 1)

      expect(supabase.rpc).toHaveBeenCalledWith('rollback_prompt_to_version', {
        prompt_id_param: mockPromptId,
        version_number_param: 1
      })
      expect(PromptService.fetchPromptById).toHaveBeenCalledWith(mockPromptId)
      expect(result).toEqual(mockUpdatedPrompt)
    })

    it('should handle rollback errors', async () => {
      const mockError = { 
        message: 'Version not found',
        details: '',
        hint: '',
        code: 'P0001',
        name: 'PostgrestError'
      }
      vi.mocked(supabase.rpc).mockResolvedValue({ 
        data: null, 
        error: mockError,
        count: null,
        status: 400,
        statusText: 'Bad Request'
      })

      await expect(PromptService.rollbackPromptToVersion(mockPromptId, 999))
        .rejects.toThrow('Failed to rollback prompt: Version not found')
    })

    it('should handle error when fetching updated prompt after rollback', async () => {
      // Mock successful RPC call
      vi.mocked(supabase.rpc).mockResolvedValue({ 
        data: true, 
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      })
      
      // Mock fetchPromptById returning null
      vi.spyOn(PromptService, 'fetchPromptById').mockResolvedValue(null)

      await expect(PromptService.rollbackPromptToVersion(mockPromptId, 1))
        .rejects.toThrow('Failed to fetch updated prompt after rollback')
    })
  })

  describe('getCurrentVersion', () => {
    it('should fetch the current active version number', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: { version_number: 2 }, 
        error: null 
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      } as any)

      const result = await PromptService.getCurrentVersion(mockPromptId)

      expect(supabase.from).toHaveBeenCalledWith('prompt_versions')
      expect(mockSelect).toHaveBeenCalledWith('version_number')
      expect(mockEq).toHaveBeenCalledWith('prompt_id', mockPromptId)
      expect(mockEq).toHaveBeenCalledWith('is_active', true)
      expect(result).toBe(2)
    })

    it('should handle errors when fetching current version', async () => {
      const mockError = { message: 'Database error' }
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      } as any)

      await expect(PromptService.getCurrentVersion(mockPromptId))
        .rejects.toThrow('Failed to fetch current version: Database error')
    })
  })

  describe('fetchPromptsWithVersions', () => {
    it('should fetch prompts with their version information', async () => {
      const mockPromptsWithVersions = [
        {
          id: mockPromptId,
          name: 'Test Prompt',
          description: 'Test description',
          template_text: 'Test template',
          version: 2,
          current_version: 2,
          prompt_versions: [
            {
              version_number: 2,
              is_active: true
            }
          ]
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({ 
        data: mockPromptsWithVersions, 
        error: null 
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder
      } as any)

      const result = await PromptService.fetchPromptsWithVersions()

      expect(supabase.from).toHaveBeenCalledWith('prompts')
      expect(mockSelect).toHaveBeenCalledWith(`
          *,
          prompt_versions!inner(
            version_number,
            is_active
          )
        `)
      expect(mockEq).toHaveBeenCalledWith('prompt_versions.is_active', true)
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true })
      expect(result).toEqual(mockPromptsWithVersions)
    })

    it('should handle errors when fetching prompts with versions', async () => {
      const mockError = { message: 'Database error' }
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder
      } as any)

      await expect(PromptService.fetchPromptsWithVersions())
        .rejects.toThrow('Failed to fetch prompts with versions: Database error')
    })
  })
}) 