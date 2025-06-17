import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SignUpForm } from './SignUpForm'

// Mock the AuthService
vi.mock('../../services/auth/AuthService', () => ({
  AuthService: {
    signUp: vi.fn(),
    validateEmail: vi.fn(),
    validatePassword: vi.fn(),
  },
}))

import { AuthService } from '../../services/auth/AuthService'

describe('SignUpForm', () => {
  const mockOnSwitchToSignIn = vi.fn()
  const mockOnSignUpSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Set up default mock returns
    ;(AuthService.validateEmail as any).mockReturnValue({ isValid: true, error: null })
    ;(AuthService.validatePassword as any).mockReturnValue({ isValid: true, error: null })
  })

  it('renders sign up form with all required fields', () => {
    render(
      <SignUpForm 
        onSwitchToSignIn={mockOnSwitchToSignIn}
        onSignUpSuccess={mockOnSignUpSuccess}
      />
    )

    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    expect(screen.getByText('Join the MetX prompting tool')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
    expect(screen.getByText('Already have an account?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('validates email format in real-time', async () => {
    ;(AuthService.validateEmail as any).mockReturnValue({ 
      isValid: false, 
      error: 'Please enter a valid email address' 
    })

    render(
      <SignUpForm 
        onSwitchToSignIn={mockOnSwitchToSignIn}
        onSignUpSuccess={mockOnSignUpSuccess}
      />
    )

    const emailInput = screen.getByLabelText('Email')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.blur(emailInput)

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('validates password strength', async () => {
    ;(AuthService.validatePassword as any).mockReturnValue({ 
      isValid: false, 
      error: 'Password must be at least 8 characters long' 
    })

    render(
      <SignUpForm 
        onSwitchToSignIn={mockOnSwitchToSignIn}
        onSignUpSuccess={mockOnSignUpSuccess}
      />
    )

    const passwordInput = screen.getByLabelText('Password')
    fireEvent.change(passwordInput, { target: { value: '123' } })
    fireEvent.blur(passwordInput)

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
    })
  })

  it('validates password confirmation matches', async () => {
    render(
      <SignUpForm 
        onSwitchToSignIn={mockOnSwitchToSignIn}
        onSignUpSuccess={mockOnSignUpSuccess}
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

  it('submits form with valid data', async () => {
    ;(AuthService.signUp as any).mockResolvedValue({ 
      user: { id: '123', email: 'test@example.com' },
      error: null 
    })

    render(
      <SignUpForm 
        onSwitchToSignIn={mockOnSwitchToSignIn}
        onSignUpSuccess={mockOnSignUpSuccess}
      />
    )

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(AuthService.signUp).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockOnSignUpSuccess).toHaveBeenCalledWith({ 
        id: '123', 
        email: 'test@example.com' 
      })
    })
  })

  it('shows loading state during form submission', async () => {
    ;(AuthService.signUp as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ user: {}, error: null }), 100))
    )

    render(
      <SignUpForm 
        onSwitchToSignIn={mockOnSwitchToSignIn}
        onSignUpSuccess={mockOnSignUpSuccess}
      />
    )

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    expect(screen.getByRole('button', { name: 'Creating Account...' })).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('displays error message on sign up failure', async () => {
    ;(AuthService.signUp as any).mockResolvedValue({ 
      user: null,
      error: { message: 'Email already registered' }
    })

    render(
      <SignUpForm 
        onSwitchToSignIn={mockOnSwitchToSignIn}
        onSignUpSuccess={mockOnSignUpSuccess}
      />
    )

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument()
    })
  })

  it('navigates to sign in when switch button is clicked', () => {
    render(
      <SignUpForm 
        onSwitchToSignIn={mockOnSwitchToSignIn}
        onSignUpSuccess={mockOnSignUpSuccess}
      />
    )

    const switchButton = screen.getByRole('button', { name: 'Sign in' })
    fireEvent.click(switchButton)

    expect(mockOnSwitchToSignIn).toHaveBeenCalledTimes(1)
  })

  it('disables sign in navigation during loading', async () => {
    ;(AuthService.signUp as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ user: {}, error: null }), 100))
    )

    render(
      <SignUpForm 
        onSwitchToSignIn={mockOnSwitchToSignIn}
        onSignUpSuccess={mockOnSignUpSuccess}
      />
    )

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    const switchButton = screen.getByRole('button', { name: 'Sign in' })
    expect(switchButton).toBeDisabled()
  })
}) 