import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { ModelSelection } from './ModelSelection'
import type { Model } from '../../types/database'

describe('ModelSelection', () => {
  const mockModels: Model[] = [
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'openrouter', price_per_1k_tokens: 0.000750, is_pinned: true },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'openrouter', price_per_1k_tokens: 0.003000, is_pinned: true },
    { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', price_per_1k_tokens: 0.06, is_pinned: false },
    { id: 'o3', name: 'o3', provider: 'openai', price_per_1k_tokens: 0.15, is_pinned: false },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', price_per_1k_tokens: 0.005, is_pinned: false }
  ]

  const mockOnModelToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays pinned models prominently', () => {
    render(
      <ModelSelection
        models={mockModels}
        selectedModelIds={[]}
        onModelToggle={mockOnModelToggle}
        isLoading={false}
      />
    )

    // Pinned models should be visible by default
    expect(screen.getByLabelText('Gemini 2.5 Flash')).toBeInTheDocument()
    expect(screen.getByLabelText('Gemini 2.5 Pro')).toBeInTheDocument()
    expect(screen.getByText('0.000750 CHF/1k tokens')).toBeInTheDocument()
    expect(screen.getByText('0.003000 CHF/1k tokens')).toBeInTheDocument()
  })

  it('shows additional models button with correct count', () => {
    render(
      <ModelSelection
        models={mockModels}
        selectedModelIds={[]}
        onModelToggle={mockOnModelToggle}
        isLoading={false}
      />
    )

    // Should show button with count of non-pinned models
    expect(screen.getByText('Additional Models (3)')).toBeInTheDocument()
  })

  it('hides additional models by default', () => {
    render(
      <ModelSelection
        models={mockModels}
        selectedModelIds={[]}
        onModelToggle={mockOnModelToggle}
        isLoading={false}
      />
    )

    // Additional models should not be visible initially
    expect(screen.queryByLabelText('GPT-4.1')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('o3')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('GPT-4o')).not.toBeInTheDocument()
  })

  it('shows additional models when button is clicked', () => {
    render(
      <ModelSelection
        models={mockModels}
        selectedModelIds={[]}
        onModelToggle={mockOnModelToggle}
        isLoading={false}
      />
    )

    // Click the additional models button
    const additionalModelsButton = screen.getByText('Additional Models (3)')
    fireEvent.click(additionalModelsButton)

    // Additional models should now be visible
    expect(screen.getByLabelText('GPT-4.1')).toBeInTheDocument()
    expect(screen.getByLabelText('o3')).toBeInTheDocument()
    expect(screen.getByLabelText('GPT-4o')).toBeInTheDocument()
  })

  it('toggles additional models visibility on button click', () => {
    render(
      <ModelSelection
        models={mockModels}
        selectedModelIds={[]}
        onModelToggle={mockOnModelToggle}
        isLoading={false}
      />
    )

    const additionalModelsButton = screen.getByText('Additional Models (3)')

    // Click to show additional models
    fireEvent.click(additionalModelsButton)
    expect(screen.getByLabelText('GPT-4.1')).toBeInTheDocument()

    // Click again to hide additional models
    fireEvent.click(additionalModelsButton)
    expect(screen.queryByLabelText('GPT-4.1')).not.toBeInTheDocument()
  })

  it('calls onModelToggle when model is selected', () => {
    render(
      <ModelSelection
        models={mockModels}
        selectedModelIds={[]}
        onModelToggle={mockOnModelToggle}
        isLoading={false}
      />
    )

    // Click on a pinned model
    const geminiFlashCheckbox = screen.getByLabelText('Gemini 2.5 Flash')
    fireEvent.click(geminiFlashCheckbox)

    expect(mockOnModelToggle).toHaveBeenCalledWith('google/gemini-2.5-flash')
  })

  it('shows selected models as checked', () => {
    render(
      <ModelSelection
        models={mockModels}
        selectedModelIds={['google/gemini-2.5-flash', 'google/gemini-2.5-pro']}
        onModelToggle={mockOnModelToggle}
        isLoading={false}
      />
    )

    const geminiFlashCheckbox = screen.getByLabelText('Gemini 2.5 Flash') as HTMLInputElement
    const geminiProCheckbox = screen.getByLabelText('Gemini 2.5 Pro') as HTMLInputElement

    expect(geminiFlashCheckbox.checked).toBe(true)
    expect(geminiProCheckbox.checked).toBe(true)
  })

  it('displays error message when provided', () => {
    const errorMessage = 'Please select at least one model'
    render(
      <ModelSelection
        models={mockModels}
        selectedModelIds={[]}
        onModelToggle={mockOnModelToggle}
        isLoading={false}
        error={errorMessage}
      />
    )

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('disables all checkboxes when loading', () => {
    render(
      <ModelSelection
        models={mockModels}
        selectedModelIds={[]}
        onModelToggle={mockOnModelToggle}
        isLoading={true}
      />
    )

    const geminiFlashCheckbox = screen.getByLabelText('Gemini 2.5 Flash') as HTMLInputElement
    const geminiProCheckbox = screen.getByLabelText('Gemini 2.5 Pro') as HTMLInputElement

    expect(geminiFlashCheckbox.disabled).toBe(true)
    expect(geminiProCheckbox.disabled).toBe(true)
  })

  it('handles case when no pinned models exist', () => {
    const modelsWithoutPinned: Model[] = [
      { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', price_per_1k_tokens: 0.06, is_pinned: false },
      { id: 'o3', name: 'o3', provider: 'openai', price_per_1k_tokens: 0.15, is_pinned: false }
    ]

    render(
      <ModelSelection
        models={modelsWithoutPinned}
        selectedModelIds={[]}
        onModelToggle={mockOnModelToggle}
        isLoading={false}
      />
    )

    // Should only show the additional models button
    expect(screen.getByText('Additional Models (2)')).toBeInTheDocument()
    expect(screen.queryByLabelText('GPT-4.1')).not.toBeInTheDocument()
  })

  it('handles case when no additional models exist', () => {
    const onlyPinnedModels: Model[] = [
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'openrouter', price_per_1k_tokens: 0.000750, is_pinned: true },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'openrouter', price_per_1k_tokens: 0.003000, is_pinned: true }
    ]

    render(
      <ModelSelection
        models={onlyPinnedModels}
        selectedModelIds={[]}
        onModelToggle={mockOnModelToggle}
        isLoading={false}
      />
    )

    // Should show pinned models but no additional models button
    expect(screen.getByLabelText('Gemini 2.5 Flash')).toBeInTheDocument()
    expect(screen.getByLabelText('Gemini 2.5 Pro')).toBeInTheDocument()
    expect(screen.queryByText(/Additional Models/)).not.toBeInTheDocument()
  })
}) 