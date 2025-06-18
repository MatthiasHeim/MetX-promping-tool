// AuthService - Authentication service for MetX prompting tool

import { supabase } from '../../lib/supabase'

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthResult {
  user: AuthUser | null;
  error: { message: string } | null;
}

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export class AuthService {
  static validateEmail(email: string): ValidationResult {
    if (!email) {
      return { isValid: false, error: 'Email is required' }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' }
    }

    return { isValid: true, error: null }
  }

  static validatePassword(password: string): ValidationResult {
    if (!password) {
      return { isValid: false, error: 'Password is required' }
    }

    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' }
    }

    // Check for at least one number or special character
    if (!/(?=.*[\d\W])/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one number or special character' }
    }

    return { isValid: true, error: null }
  }

  static async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        // Handle common Supabase auth errors
        let errorMessage = 'An error occurred during sign in'
        if (error.message.includes('Invalid login credentials') || 
            error.message.includes('Email not confirmed') ||
            error.message.includes('Invalid email or password')) {
          errorMessage = 'Invalid email or password'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account'
        }

        return {
          user: null,
          error: { message: errorMessage }
        }
      }

      if (!data.user) {
        return {
          user: null,
          error: { message: 'Invalid email or password' }
        }
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          created_at: data.user.created_at
        },
        error: null
      }
    } catch (error) {
      console.error('Sign in error:', error)
      return {
        user: null,
        error: { message: 'Network error occurred. Please try again.' }
      }
    }
  }

  static async signUp(email: string, password: string): Promise<AuthResult> {
    try {
      // Validate input before making API call
      const emailValidation = this.validateEmail(email)
      const passwordValidation = this.validatePassword(password)

      if (!emailValidation.isValid) {
        return {
          user: null,
          error: { message: emailValidation.error || 'Invalid email' }
        }
      }

      if (!passwordValidation.isValid) {
        return {
          user: null,
          error: { message: passwordValidation.error || 'Invalid password' }
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) {
        // Handle common Supabase auth errors
        let errorMessage = error.message
        if (error.message.includes('already registered')) {
          errorMessage = 'Email already registered'
        } else if (error.message.includes('Password should be')) {
          errorMessage = 'Password does not meet requirements'
        }

        return {
          user: null,
          error: { message: errorMessage }
        }
      }

      if (!data.user) {
        return {
          user: null,
          error: { message: 'Failed to create account' }
        }
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          created_at: data.user.created_at
        },
        error: null
      }
    } catch (error) {
      console.error('Sign up error:', error)
      return {
        user: null,
        error: { message: 'Network error occurred. Please try again.' }
      }
    }
  }

  static async signOut(): Promise<{ error: { message: string } | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return { error: { message: error.message } }
      }
      
      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error: { message: 'Failed to sign out' } }
    }
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data, error } = await supabase.auth.getUser()
      
      if (error || !data.user) {
        return null
      }

      return {
        id: data.user.id,
        email: data.user.email!,
        created_at: data.user.created_at
      }
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  /**
   * Subscribe to authentication state changes
   */
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at
        })
      } else {
        callback(null)
      }
    })
  }
} 