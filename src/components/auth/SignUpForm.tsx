import React, { useState } from 'react'
import { AuthService, type AuthUser, type ValidationResult } from '../../services/auth/AuthService'

interface SignUpFormProps {
  onSwitchToSignIn: () => void
  onSignUpSuccess: (user: AuthUser) => void
}

export function SignUpForm({ onSwitchToSignIn, onSignUpSuccess }: SignUpFormProps) {
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
        onSignUpSuccess(result.user)
      }
    } catch (error) {
      setSubmitError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = formData.email && formData.password && formData.confirmPassword && 
    Object.keys(errors).length === 0

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
        <p className="text-gray-600">
          Join the MetX prompting tool
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{submitError}</p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleInputBlur('email', e.target.value)}
            placeholder="Enter your email"
            disabled={isLoading}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('password', e.target.value)}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleInputBlur('password', e.target.value)}
            placeholder="Enter your password"
            disabled={isLoading}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('confirmPassword', e.target.value)}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleInputBlur('confirmPassword', e.target.value)}
            placeholder="Confirm your password"
            disabled={isLoading}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !isFormValid}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="text-center">
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