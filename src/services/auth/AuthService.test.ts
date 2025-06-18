import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthService } from './AuthService'
import { supabase } from '../../lib/supabase'

// Mock the supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    }
  }
}))

describe('AuthService - Real Supabase Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('signUp', () => {
    it('should successfully sign up a new user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@meteomatics.com',
        created_at: '2025-01-01T00:00:00Z'
      }

      const mockSupabaseResponse = {
        data: {
          user: mockUser,
          session: { access_token: 'token-123' }
        },
        error: null
      }

      ;(supabase.auth.signUp as any).mockResolvedValue(mockSupabaseResponse)

      const result = await AuthService.signUp('test@meteomatics.com', 'SecurePass123!')

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@meteomatics.com',
        password: 'SecurePass123!'
      })
      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle email validation errors', async () => {
      const result = await AuthService.signUp('invalid-email', 'SecurePass123!')

      expect(result.user).toBeNull()
      expect(result.error?.message).toBe('Please enter a valid email address')
      expect(supabase.auth.signUp).not.toHaveBeenCalled()
    })

    it('should handle password validation errors', async () => {
      const result = await AuthService.signUp('test@meteomatics.com', '123')

      expect(result.user).toBeNull()
      expect(result.error?.message).toBe('Password must be at least 8 characters long')
      expect(supabase.auth.signUp).not.toHaveBeenCalled()
    })

    it('should handle Supabase signup errors', async () => {
      const mockError = {
        message: 'Email already registered',
        status: 422
      }

      ;(supabase.auth.signUp as any).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      })

      const result = await AuthService.signUp('existing@meteomatics.com', 'SecurePass123!')

      expect(result.user).toBeNull()
      expect(result.error?.message).toBe('Email already registered')
    })

    it('should handle network errors during signup', async () => {
      ;(supabase.auth.signUp as any).mockRejectedValue(new Error('Network error'))

      const result = await AuthService.signUp('test@meteomatics.com', 'SecurePass123!')

      expect(result.user).toBeNull()
      expect(result.error?.message).toBe('Network error occurred. Please try again.')
    })
  })

  describe('signIn', () => {
    it('should successfully sign in with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@meteomatics.com',
        created_at: '2025-01-01T00:00:00Z'
      }

      const mockSupabaseResponse = {
        data: {
          user: mockUser,
          session: { access_token: 'token-123' }
        },
        error: null
      }

      ;(supabase.auth.signInWithPassword as any).mockResolvedValue(mockSupabaseResponse)

      const result = await AuthService.signIn('test@meteomatics.com', 'SecurePass123!')

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@meteomatics.com',
        password: 'SecurePass123!'
      })
      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle invalid credentials', async () => {
      const mockError = {
        message: 'Invalid login credentials',
        status: 400
      }

      ;(supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      })

      const result = await AuthService.signIn('test@meteomatics.com', 'WrongPassword')

      expect(result.user).toBeNull()
      expect(result.error?.message).toBe('Invalid email or password')
    })

    it('should handle network errors during signin', async () => {
      ;(supabase.auth.signInWithPassword as any).mockRejectedValue(new Error('Connection failed'))

      const result = await AuthService.signIn('test@meteomatics.com', 'SecurePass123!')

      expect(result.user).toBeNull()
      expect(result.error?.message).toBe('Network error occurred. Please try again.')
    })
  })

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      ;(supabase.auth.signOut as any).mockResolvedValue({ error: null })

      const result = await AuthService.signOut()

      expect(supabase.auth.signOut).toHaveBeenCalled()
      expect(result.error).toBeNull()
    })

    it('should handle signout errors', async () => {
      const mockError = { message: 'Failed to sign out' }
      ;(supabase.auth.signOut as any).mockResolvedValue({ error: mockError })

      const result = await AuthService.signOut()

      expect(result.error?.message).toBe('Failed to sign out')
    })
  })

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@meteomatics.com',
        created_at: '2025-01-01T00:00:00Z'
      }

      ;(supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await AuthService.getCurrentUser()

      expect(supabase.auth.getUser).toHaveBeenCalled()
      expect(result).toEqual(mockUser)
    })

    it('should return null when not authenticated', async () => {
      ;(supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await AuthService.getCurrentUser()

      expect(result).toBeNull()
    })

    it('should handle errors when getting current user', async () => {
      ;(supabase.auth.getUser as any).mockRejectedValue(new Error('Token expired'))

      const result = await AuthService.getCurrentUser()

      expect(result).toBeNull()
    })
  })

  describe('validation methods', () => {
    describe('validateEmail', () => {
      it('should validate correct email formats', () => {
        expect(AuthService.validateEmail('test@meteomatics.com')).toEqual({
          isValid: true,
          error: null
        })
        expect(AuthService.validateEmail('user.name+tag@example.co.uk')).toEqual({
          isValid: true,
          error: null
        })
      })

      it('should reject invalid email formats', () => {
        expect(AuthService.validateEmail('')).toEqual({
          isValid: false,
          error: 'Email is required'
        })
        expect(AuthService.validateEmail('invalid-email')).toEqual({
          isValid: false,
          error: 'Please enter a valid email address'
        })
        expect(AuthService.validateEmail('test@')).toEqual({
          isValid: false,
          error: 'Please enter a valid email address'
        })
      })
    })

    describe('validatePassword', () => {
      it('should validate strong passwords', () => {
        expect(AuthService.validatePassword('SecurePass123!')).toEqual({
          isValid: true,
          error: null
        })
        expect(AuthService.validatePassword('mypassword1')).toEqual({
          isValid: true,
          error: null
        })
      })

      it('should reject weak passwords', () => {
        expect(AuthService.validatePassword('')).toEqual({
          isValid: false,
          error: 'Password is required'
        })
        expect(AuthService.validatePassword('short')).toEqual({
          isValid: false,
          error: 'Password must be at least 8 characters long'
        })
        expect(AuthService.validatePassword('passwordonly')).toEqual({
          isValid: false,
          error: 'Password must contain at least one number or special character'
        })
      })
    })
  })
}) 