import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SignUpForm } from './SignUpForm'
import { AuthService } from '../../services/auth/AuthService'

// Mock the AuthService
vi.mock('../../services/auth/AuthService', () => ({
  AuthService: {
    validateEmail: vi.fn((email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!email) {
        return { isValid: false, error: 'Email is required' }
      }
      if (!emailRegex.test(email)) {
        return { isValid: false, error: 'Please enter a valid email address' }
      }
      return { isValid: true, error: null }
    }),
    validatePassword: vi.fn((password: string) => {
      if (!password) {
        return { isValid: false, error: 'Password is required' }
      }
      if (password.length < 8) {
        return { isValid: false, error: 'Password must be at least 8 characters long' }
      }
      return { isValid: true, error: null }
    }),
    signUp: vi.fn()
  }
}))

// Mock the utils
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}))

describe('SignUpForm', () => {
  const mockOnSwitchToSignIn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(
      <SignUpForm
        onSwitchToSignIn={mockOnSwitchToSignIn}
      />
    )

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
  })

  it('shows validation errors for invalid input', async () => {
    render(
      <SignUpForm
        onSwitchToSignIn={mockOnSwitchToSignIn}
      />
    )

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')

    // Test invalid email
    fireEvent.blur(emailInput, { target: { value: 'invalid-email' } })
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })

    // Test short password
    fireEvent.blur(passwordInput, { target: { value: '123' } })
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
    })
  })

  it('shows error when passwords do not match', async () => {
    render(
      <SignUpForm
        onSwitchToSignIn={mockOnSwitchToSignIn}
      />
    )

    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')

    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } })
    fireEvent.blur(confirmPasswordInput)

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  it('successfully signs up a user and shows confirmation message', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({
      user: { id: '123', email: 'test@example.com', created_at: '2023-01-01' },
      error: null
    })
    ;(AuthService.signUp as any) = mockSignUp

    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(
      <SignUpForm
        onSwitchToSignIn={mockOnSwitchToSignIn}
      />
    )

    // Fill out the form with valid data
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123!' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123!' } })

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123!')
      expect(alertSpy).toHaveBeenCalledWith('Account created successfully! Please check your email and click the confirmation link before signing in.')
      expect(mockOnSwitchToSignIn).toHaveBeenCalled()
    })

    alertSpy.mockRestore()
  })

  it('shows error message when signup fails', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({
      user: null,
      error: { message: 'Email already registered' }
    })
    ;(AuthService.signUp as any) = mockSignUp

    render(
      <SignUpForm
        onSwitchToSignIn={mockOnSwitchToSignIn}
      />
    )

    // Fill out the form with valid data
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'existing@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123!' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123!' } })

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const mockSignUp = vi.fn().mockImplementation(() => new Promise(() => {})) // Never resolves
    ;(AuthService.signUp as any) = mockSignUp

    render(
      <SignUpForm
        onSwitchToSignIn={mockOnSwitchToSignIn}
      />
    )

    // Fill out the form with valid data
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123!' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123!' } })

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Creating Account...' })).toBeDisabled()
    })
  })

  it('disables submit button when form is invalid', () => {
    render(
      <SignUpForm
        onSwitchToSignIn={mockOnSwitchToSignIn}
      />
    )

    const submitButton = screen.getByRole('button', { name: 'Create Account' })
    expect(submitButton).toBeDisabled()

    // Fill out only email
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    expect(submitButton).toBeDisabled()

    // Fill out email and password
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123!' } })
    expect(submitButton).toBeDisabled()

    // Fill out all fields
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123!' } })
    expect(submitButton).toBeEnabled()
  })

  it('shows switch to sign in link', () => {
    render(
      <SignUpForm
        onSwitchToSignIn={mockOnSwitchToSignIn}
      />
    )

    const switchLink = screen.getByText('Sign in')
    expect(switchLink).toBeInTheDocument()

    fireEvent.click(switchLink)
    expect(mockOnSwitchToSignIn).toHaveBeenCalled()
  })
}) 