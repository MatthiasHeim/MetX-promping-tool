import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface LoginFormProps {
  onSubmit: (data: { email: string; password: string }) => void
  onSwitchToSignUp?: () => void
  isLoading: boolean
  error: string | null
  showSignUpOption?: boolean
}

interface FormErrors {
  email?: string
  password?: string
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onSwitchToSignUp,
  isLoading,
  error,
  showSignUpOption = false,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }))
    }
  }

  return (
    <div className="bg-white shadow-xl rounded-lg px-6 py-8 max-w-md mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h1>
        <p className="text-gray-600">
          Access the MetX prompting tool
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="demo.meteomatics@gmail.com"
            value={formData.email}
            onChange={handleInputChange('email')}
            className={cn(
              'input-field',
              errors.email && 'input-field-error'
            )}
            disabled={isLoading}
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
            autoComplete="current-password"
            value={formData.password}
            onChange={handleInputChange('password')}
            className={cn(
              'input-field',
              errors.password && 'input-field-error'
            )}
            disabled={isLoading}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            'w-full btn-primary',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {showSignUpOption && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToSignUp}
              className="text-blue-600 hover:underline font-medium"
              disabled={isLoading}
            >
              Sign up
            </button>
          </p>
        </div>
      )}
    </div>
  )
} 