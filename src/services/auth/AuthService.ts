// AuthService - Authentication service for MetX prompting tool

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
    // TODO: Implement actual Supabase authentication
    // This is a placeholder implementation
    try {
      if (email === 'demo@meteomatics.com' && password === 'demo123') {
        return {
          user: { id: '1', email, created_at: new Date().toISOString() },
          error: null
        }
      } else {
        return {
          user: null,
          error: { message: 'Invalid email or password' }
        }
      }
    } catch (error) {
      return {
        user: null,
        error: { message: 'An unexpected error occurred' }
      }
    }
  }

  static async signUp(email: string, password: string): Promise<AuthResult> {
    // TODO: Implement actual Supabase authentication
    // This is a placeholder implementation
    try {
      // Simulate validation
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

      // Simulate email already exists check
      if (email === 'existing@meteomatics.com') {
        return {
          user: null,
          error: { message: 'Email already registered' }
        }
      }

      // Simulate successful signup
      return {
        user: { 
          id: Math.random().toString(36).substr(2, 9), 
          email, 
          created_at: new Date().toISOString() 
        },
        error: null
      }
    } catch (error) {
      return {
        user: null,
        error: { message: 'An unexpected error occurred' }
      }
    }
  }

  static async signOut(): Promise<{ error: { message: string } | null }> {
    // TODO: Implement actual Supabase sign out
    try {
      return { error: null }
    } catch (error) {
      return { error: { message: 'Failed to sign out' } }
    }
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    // TODO: Implement actual Supabase current user check
    return null
  }
} 