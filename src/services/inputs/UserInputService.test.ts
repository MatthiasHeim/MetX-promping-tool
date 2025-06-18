import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserInputService } from './UserInputService'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { 
              id: 'input-123', 
              user_id: 'user-123', 
              text: 'test text',
              input_image_url: null,
              created_at: '2025-01-01T00:00:00Z'
            }, 
            error: null 
          }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: [], 
            error: null 
          })),
          single: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: null 
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ 
          data: { path: 'test-path' }, 
          error: null 
        })),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://example.com/image.png' }
        })),
        remove: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }
  }
}))

describe('UserInputService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createUserInput', () => {
    it('should create user input successfully without image', async () => {
      const result = await UserInputService.createUserInput('user-123', 'test text')
      
      expect(result).toBeDefined()
      expect(result.user_id).toBe('user-123')
      expect(result.text).toBe('test text')
    })

    it('should validate required parameters', async () => {
      await expect(
        UserInputService.createUserInput('', 'test')
      ).rejects.toThrow('User ID is required')

      await expect(
        UserInputService.createUserInput('user-123', '')
      ).rejects.toThrow('Text input is required')
    })

    it('should handle image upload', async () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })
      
      const result = await UserInputService.createUserInput('user-123', 'test text', mockFile)
      
      expect(result).toBeDefined()
      expect(result.user_id).toBe('user-123')
    })
  })

  describe('getUserInputs', () => {
    it('should fetch user inputs successfully', async () => {
      const result = await UserInputService.getUserInputs('user-123')
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should validate user ID parameter', async () => {
      await expect(
        UserInputService.getUserInputs('')
      ).rejects.toThrow('User ID is required')
    })
  })

  describe('getUserInputById', () => {
    it('should fetch user input by ID', async () => {
      const result = await UserInputService.getUserInputById('input-123')
      
      expect(result).toBeNull() // Mock returns null
    })

    it('should validate input ID parameter', async () => {
      await expect(
        UserInputService.getUserInputById('')
      ).rejects.toThrow('Input ID is required')
    })
  })

  describe('deleteUserInput', () => {
    it('should validate required parameters', async () => {
      await expect(
        UserInputService.deleteUserInput('', 'user-123')
      ).rejects.toThrow('Input ID is required')

      await expect(
        UserInputService.deleteUserInput('input-123', '')
      ).rejects.toThrow('User ID is required')
    })
  })
}) 