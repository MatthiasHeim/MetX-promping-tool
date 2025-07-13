import { describe, it, expect, vi } from 'vitest'
import { PromptService } from './PromptService'

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          // Mock successful fetch
          data: [
            {
              id: 'test-id-1',
              name: 'Test Prompt',
              description: 'A test prompt',
              template_text: 'Test template: {{user_input}}',
              json_prefix: '{"test": {',
              json_suffix: '}}',
              use_placeholder: true,
              version: 1,
              created_by: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ],
          error: null
        })),
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'test-id-1',
              name: 'Test Prompt',
              description: 'A test prompt',
              template_text: 'Test template: {{user_input}}',
              json_prefix: '{"test": {',
              json_suffix: '}}',
              use_placeholder: true,
              version: 1,
              created_by: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'new-test-id',
              name: 'New Test Prompt',
              description: 'A new test prompt',
              template_text: 'New test template: {{user_input}}',
              json_prefix: '{"new": {',
              json_suffix: '}}',
              use_placeholder: true,
              version: 1,
              created_by: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'test-id-1',
                name: 'Updated Test Prompt',
                description: 'An updated test prompt',
                template_text: 'Updated test template: {{user_input}}',
                json_prefix: '{"updated": {',
                json_suffix: '}}',
                use_placeholder: true,
                version: 2,
                created_by: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T01:00:00Z'
              },
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
        data: { user: { id: 'test-user-id' } }
      }))
    }
  }
}))

describe('PromptService', () => {
  it('should fetch prompts successfully', async () => {
    const prompts = await PromptService.fetchPrompts()
    
    expect(prompts).toHaveLength(1)
    expect(prompts[0].name).toBe('Test Prompt')
          expect(prompts[0].template_text).toBe('Test template: {{user_input}}')
  })

  it('should create a new prompt successfully', async () => {
    const newPrompt = {
      name: 'New Test Prompt',
      description: 'A new test prompt',
              template_text: 'New test template: {{user_input}}',
      json_prefix: '{"new": {',
      json_suffix: '}}',
      use_placeholder: true
    }

    const createdPrompt = await PromptService.createPrompt(newPrompt)
    
    expect(createdPrompt.id).toBe('new-test-id')
    expect(createdPrompt.name).toBe('New Test Prompt')
          expect(createdPrompt.template_text).toBe('New test template: {{user_input}}')
  })

  it('should update a prompt successfully', async () => {
    const updates = {
      name: 'Updated Test Prompt',
      description: 'An updated test prompt'
    }

    const updatedPrompt = await PromptService.updatePrompt('test-id-1', updates)
    
    expect(updatedPrompt.name).toBe('Updated Test Prompt')
    expect(updatedPrompt.version).toBe(2)
  })

  it('should delete a prompt successfully', async () => {
    await expect(PromptService.deletePrompt('test-id-1')).resolves.not.toThrow()
  })
}) 