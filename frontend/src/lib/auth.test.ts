import { describe, it, expect, vi } from 'vitest'
import { AuthService } from './auth'

// Mock the entire supabase module to avoid environment issues
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(),
    },
  },
}))

describe('AuthService', () => {
  const authService = new AuthService()

  describe('validation', () => {
    it('should validate email format correctly', async () => {
      const resultValid = await authService.signUp('test@example.com', 'password123')
      const resultInvalid = await authService.signUp('invalid-email', 'password123')

      // Valid email should not have validation error
      expect(resultValid.error?.message).not.toBe('Invalid email format')
      
      // Invalid email should have validation error
      expect(resultInvalid.error?.message).toBe('Invalid email format')
    })

    it('should validate password length correctly', async () => {
      const resultValid = await authService.signUp('test@example.com', 'password123')
      const resultInvalid = await authService.signUp('test@example.com', '123')

      // Valid password should not have validation error
      expect(resultValid.error?.message).not.toBe('Password must be at least 6 characters long')
      
      // Short password should have validation error
      expect(resultInvalid.error?.message).toBe('Password must be at least 6 characters long')
    })
  })

  describe('service methods', () => {
    it('should have all required methods', () => {
      expect(typeof authService.signUp).toBe('function')
      expect(typeof authService.signIn).toBe('function')
      expect(typeof authService.signOut).toBe('function')
      expect(typeof authService.getCurrentUser).toBe('function')
      expect(typeof authService.onAuthStateChange).toBe('function')
    })

    it('should call signIn method without errors', async () => {
      const result = await authService.signIn('test@example.com', 'password123')
      expect(result).toBeDefined()
      expect(result.user).toBeNull()
      expect(result.error).toBeNull()
    })

    it('should call signOut method without errors', async () => {
      const result = await authService.signOut()
      expect(result).toBeDefined()
      expect(result.error).toBeNull()
    })

    it('should call getCurrentUser method without errors', async () => {
      const result = await authService.getCurrentUser()
      expect(result).toBeDefined()
      expect(result.user).toBeNull()
      expect(result.error).toBeNull()
    })
  })
}) 