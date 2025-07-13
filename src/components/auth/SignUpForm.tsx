import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { AuthService, type ValidationResult } from '../../services/auth/AuthService'

interface SignUpFormProps {
  onSwitchToSignIn: () => void
}

export function SignUpForm({ onSwitchToSignIn }: SignUpFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validateField = (field: string, value: string): ValidationResult => {
    switch (field) {
      case 'email':
        return AuthService.validateEmail(value)
      case 'password':
        return AuthService.validatePassword(value)
      case 'confirmPassword':
        if (value !== formData.password) {
          return { isValid: false, error: 'Passwords do not match' }
        }
        return { isValid: true, error: null }
      default:
        return { isValid: true, error: null }
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    if (submitError) {
      setSubmitError(null)
    }
  }

  const handleInputBlur = (field: string, value: string) => {
    const validation = validateField(field, value)
    if (!validation.isValid && validation.error) {
      setErrors(prev => ({ ...prev, [field]: validation.error! }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all fields
    const emailValidation = validateField('email', formData.email)
    const passwordValidation = validateField('password', formData.password)
    const confirmPasswordValidation = validateField('confirmPassword', formData.confirmPassword)

    const newErrors: Record<string, string> = {}
    if (!emailValidation.isValid && emailValidation.error) {
      newErrors.email = emailValidation.error
    }
    if (!passwordValidation.isValid && passwordValidation.error) {
      newErrors.password = passwordValidation.error
    }
    if (!confirmPasswordValidation.isValid && confirmPasswordValidation.error) {
      newErrors.confirmPassword = confirmPasswordValidation.error
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    setIsLoading(true)
    setSubmitError(null)

    try {
      const result = await AuthService.signUp(formData.email, formData.password)
      
      if (result.error) {
        setSubmitError(result.error.message)
      } else if (result.user) {
        // Show success message and prompt for email confirmation
        setSubmitError(null)
        alert('Account created successfully! Please check your email and click the confirmation link before signing in.')
        onSwitchToSignIn()
      }
    } catch {
      setSubmitError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = formData.email && formData.password && formData.confirmPassword && 
    Object.keys(errors).length === 0

  return (
    <div className="bg-white shadow-xl rounded-lg px-6 py-8 max-w-md mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h1>
        <p className="text-gray-600">
          Join the MetX prompting tool
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        {submitError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{submitError}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleInputBlur('email', e.target.value)}
            placeholder="Enter your email"
            disabled={isLoading}
            className={cn(
              'input-field',
              errors.email && 'input-field-error'
            )}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('password', e.target.value)}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleInputBlur('password', e.target.value)}
            placeholder="Enter your password"
            disabled={isLoading}
            className={cn(
              'input-field',
              errors.password && 'input-field-error'
            )}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('confirmPassword', e.target.value)}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleInputBlur('confirmPassword', e.target.value)}
            placeholder="Confirm your password"
            disabled={isLoading}
            className={cn(
              'input-field',
              errors.confirmPassword && 'input-field-error'
            )}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !isFormValid}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onSwitchToSignIn}
            className="text-blue-600 hover:underline font-medium"
            disabled={isLoading}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
} 