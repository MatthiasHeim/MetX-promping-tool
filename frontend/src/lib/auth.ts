import { supabase } from './supabase'
import type { User, AuthError } from '@supabase/supabase-js'

export interface AuthResult {
  user: User | null
  error: AuthError | { message: string } | null
}

export interface SignOutResult {
  error: AuthError | { message: string } | null
}

export class AuthService {
  // Email validation regex
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate password requirements
  private isValidPassword(password: string): boolean {
    return password.length >= 6
  }

  async signUp(email: string, password: string): Promise<AuthResult> {
    // Validate email format
    if (!this.isValidEmail(email)) {
      return {
        user: null,
        error: { message: 'Invalid email format' },
      }
    }

    // Validate password length
    if (!this.isValidPassword(password)) {
      return {
        user: null,
        error: { message: 'Password must be at least 6 characters long' },
      }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      return {
        user: data.user,
        error,
      }
    } catch (error) {
      return {
        user: null,
        error: { message: 'An unexpected error occurred during sign up' },
      }
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return {
        user: data.user,
        error,
      }
    } catch (error) {
      return {
        user: null,
        error: { message: 'An unexpected error occurred during sign in' },
      }
    }
  }

  async signOut(): Promise<SignOutResult> {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      return {
        error: { message: 'An unexpected error occurred during sign out' },
      }
    }
  }

  async getCurrentUser(): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.getUser()

      return {
        user: data.user,
        error,
      }
    } catch (error) {
      return {
        user: null,
        error: { message: 'An unexpected error occurred while getting user' },
      }
    }
  }

  // Subscribe to auth state changes
  onAuthStateChange(
    callback: (event: string, session: any) => void
  ) {
    return supabase.auth.onAuthStateChange(callback)
  }
} 