import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnSwitchToSignUp = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form with all required fields', () => {
    render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onSwitchToSignUp={mockOnSwitchToSignUp}
        isLoading={false}
        error={null}
      />
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
  })

  it('should validate email field', async () => {
    const user = userEvent.setup()
    render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onSwitchToSignUp={mockOnSwitchToSignUp}
        isLoading={false}
        error={null}
      />
    )

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    // Try to submit with invalid email and valid password
    await user.type(emailInput, 'invalid-email')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument()
    })
  })

  it('should validate password field', async () => {
    const user = userEvent.setup()
    render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onSwitchToSignUp={mockOnSwitchToSignUp}
        isLoading={false}
        error={null}
      />
    )

    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    // Try to submit with short password
    await user.type(passwordInput, '123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    })
  })

  it('should call onSubmit with form data when form is valid', async () => {
    const user = userEvent.setup()
    render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onSwitchToSignUp={mockOnSwitchToSignUp}
        isLoading={false}
        error={null}
      />
    )

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('should show loading state when isLoading is true', () => {
    render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onSwitchToSignUp={mockOnSwitchToSignUp}
        isLoading={true}
        error={null}
      />
    )

    const submitButton = screen.getByRole('button', { name: /signing in/i })
    expect(submitButton).toBeDisabled()
  })

  it('should display error message when error prop is provided', () => {
    const errorMessage = 'Invalid credentials'
    render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onSwitchToSignUp={mockOnSwitchToSignUp}
        isLoading={false}
        error={errorMessage}
      />
    )

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('should call onSwitchToSignUp when sign up link is clicked', async () => {
    const user = userEvent.setup()
    render(
      <LoginForm
        onSubmit={mockOnSubmit}
        onSwitchToSignUp={mockOnSwitchToSignUp}
        isLoading={false}
        error={null}
      />
    )

    const signUpLink = screen.getByRole('button', { name: /sign up/i })
    await user.click(signUpLink)

    expect(mockOnSwitchToSignUp).toHaveBeenCalled()
  })
}) 