import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GenerationForm } from './GenerationForm'
import type { Model, Prompt } from '../../types/database'

// Mock the GenerationService
vi.mock('../../services/generation/GenerationService', () => ({
  GenerationService: {
    estimateTokens: vi.fn(),
    checkCostGuardrails: vi.fn(),
    checkCostGuardrailsForGeneration: vi.fn(),
    executeParallelGeneration: vi.fn(),
    createProgressTracker: vi.fn(),
    processPromptTemplate: vi.fn(),
  },
}))

import { GenerationService } from '../../services/generation/GenerationService'

describe('GenerationForm', () => {
  const mockModels: Model[] = [
    { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', price_per_1k_tokens: 0.06 },
    { id: 'o3', name: 'o3', provider: 'openai', price_per_1k_tokens: 0.15 },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', price_per_1k_tokens: 0.005 }
  ]

  const mockPrompts: Prompt[] = [
    {
      id: 'prompt-1',
      name: 'MetX Default',
      description: 'Default MetX dashboard template',
      template_text: 'Generate MetX dashboard for: {{user_input}}',
      json_prefix: '{"dashboard": {',
      json_suffix: '}}',
      use_placeholder: true,
      is_default: false,
      version: 1,
      created_by: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ]

  const mockOnGenerate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Set up default mock returns
    ;(GenerationService.estimateTokens as any).mockReturnValue(100)
    ;(GenerationService.checkCostGuardrails as any).mockReturnValue({
      canProceed: true,
      totalCost: 0.05
    })
    ;(GenerationService.checkCostGuardrailsForGeneration as any).mockReturnValue({
      canProceed: true,
      totalCost: 0.05
    })
    ;(GenerationService.createProgressTracker as any).mockReturnValue({
      user_input_id: 'test-123',
      status: 'pending',
      completed_models: [],
      total_models: 1,
      current_model: undefined
    })
    ;(GenerationService.processPromptTemplate as any).mockImplementation((template: string, input: string) => 
      template.replace('{{user_input}}', input)
    )
  })

  it('renders generation form with all required fields', () => {
    render(
      <GenerationForm
        models={mockModels}
        prompts={mockPrompts}
        onGenerate={mockOnGenerate}
      />
    )

    expect(screen.getByLabelText('Describe your MetX dashboard requirements')).toBeInTheDocument()
    expect(screen.getByText('Upload Input Image (optional)')).toBeInTheDocument()
    expect(screen.getByText('Select Models')).toBeInTheDocument()
    expect(screen.getByText('Select Prompt Template')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument()
  })

  it('displays all available models with checkboxes', () => {
    render(
      <GenerationForm
        models={mockModels}
        prompts={mockPrompts}
        onGenerate={mockOnGenerate}
      />
    )

    expect(screen.getByLabelText('GPT-4.1')).toBeInTheDocument()
    expect(screen.getByLabelText('o3')).toBeInTheDocument()
    expect(screen.getByLabelText('GPT-4o')).toBeInTheDocument()
    
    expect(screen.getByText('0.06 CHF/1k tokens')).toBeInTheDocument()
    expect(screen.getByText('0.15 CHF/1k tokens')).toBeInTheDocument()
    expect(screen.getByText('0.005 CHF/1k tokens')).toBeInTheDocument()
  })

  it('displays prompt templates in dropdown', () => {
    render(
      <GenerationForm
        models={mockModels}
        prompts={mockPrompts}
        onGenerate={mockOnGenerate}
      />
    )

    const promptSelect = screen.getByDisplayValue('MetX Default')
    expect(promptSelect).toBeInTheDocument()
  })

  it('validates that text input is required', async () => {
    const user = userEvent.setup()
    render(
      <GenerationForm
        models={mockModels}
        prompts={mockPrompts}
        onGenerate={mockOnGenerate}
      />
    )

    const generateButton = screen.getByRole('button', { name: 'Run' })
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Please describe your dashboard requirements')).toBeInTheDocument()
    })
  })

  it('validates that at least one model is selected', async () => {
    const user = userEvent.setup()
    render(
      <GenerationForm
        models={mockModels}
        prompts={mockPrompts}
        onGenerate={mockOnGenerate}
      />
    )

    const textInput = screen.getByLabelText('Describe your MetX dashboard requirements')
    await user.type(textInput, 'Show temperature data for Switzerland')

    const generateButton = screen.getByRole('button', { name: 'Run' })
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Please select at least one model')).toBeInTheDocument()
    })
  })

  it('updates cost estimation when input changes', async () => {
    const user = userEvent.setup()
    ;(GenerationService.checkCostGuardrailsForGeneration as any).mockReturnValue({
      canProceed: true,
      totalCost: 0.075
    })

    render(
      <GenerationForm
        models={mockModels}
        prompts={mockPrompts}
        onGenerate={mockOnGenerate}
      />
    )

    const textInput = screen.getByLabelText('Describe your MetX dashboard requirements')
    const gpt4Checkbox = screen.getByLabelText('GPT-4.1')

    await user.type(textInput, 'Show temperature and precipitation data')
    await user.click(gpt4Checkbox)

    await waitFor(() => {
      expect(screen.getByText(/Estimated cost: 0.0750 CHF/)).toBeInTheDocument()
    })
  })

  it('shows cost warning when threshold is exceeded', async () => {
    const user = userEvent.setup()
    ;(GenerationService.checkCostGuardrailsForGeneration as any).mockReturnValue({
      canProceed: false,
      totalCost: 0.25,
      warning: 'Estimated cost exceeds maximum threshold'
    })

    render(
      <GenerationForm
        models={mockModels}
        prompts={mockPrompts}
        onGenerate={mockOnGenerate}
      />
    )

    const textInput = screen.getByLabelText('Describe your MetX dashboard requirements')
    const gpt4Checkbox = screen.getByLabelText('GPT-4.1')
    const o3Checkbox = screen.getByLabelText('o3')

    await user.type(textInput, 'Complex dashboard with multiple layers')
    await user.click(gpt4Checkbox)
    await user.click(o3Checkbox)

    await waitFor(() => {
      expect(screen.getByText(/Estimated cost exceeds maximum threshold/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled()
    })
  })

  it('handles file upload for input images', async () => {
    const user = userEvent.setup()
    render(
      <GenerationForm
        models={mockModels}
        prompts={mockPrompts}
        onGenerate={mockOnGenerate}
      />
    )

    const fileInput = screen.getByLabelText('Upload Input Image (optional)')
    const file = new File(['dummy content'], 'test-map.png', { type: 'image/png' })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText(/Selected:.*test-map\.png/)).toBeInTheDocument()
    })
  })

  it('submits generation request with correct data', async () => {
    const user = userEvent.setup()
    ;(GenerationService.executeParallelGeneration as any).mockResolvedValue({
      results: [
        {
          model_id: 'gpt-4.1',
          success: true,
          content: '{"layers": ["temperature"]}',
          cost_chf: 0.06
        }
      ],
      total_cost_chf: 0.06,
      total_latency_ms: 2000
    })

    render(
      <GenerationForm
        models={mockModels}
        prompts={mockPrompts}
        onGenerate={mockOnGenerate}
      />
    )

    const textInput = screen.getByLabelText('Describe your MetX dashboard requirements')
    const gpt4Checkbox = screen.getByLabelText('GPT-4.1')
    const generateButton = screen.getByRole('button', { name: 'Run' })

    await user.type(textInput, 'Show temperature data for Switzerland')
    await user.click(gpt4Checkbox)
    await user.click(generateButton)

    await waitFor(() => {
      expect(mockOnGenerate).toHaveBeenCalledWith({
        text: 'Show temperature data for Switzerland',
        selectedModels: [mockModels[0]],
        selectedPrompt: mockPrompts[0],
        inputImage: null
      })
    })
  })

  it('shows loading state during generation', async () => {
    const user = userEvent.setup()
    ;(GenerationService.executeParallelGeneration as any).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )

    render(
      <GenerationForm
        models={mockModels}
        prompts={mockPrompts}
        onGenerate={mockOnGenerate}
      />
    )

    const textInput = screen.getByLabelText('Describe your MetX dashboard requirements')
    const gpt4Checkbox = screen.getByLabelText('GPT-4.1')
    const generateButton = screen.getByRole('button', { name: 'Run' })

    await user.type(textInput, 'Show temperature data')
    await user.click(gpt4Checkbox)
    await user.click(generateButton)

    expect(screen.getByRole('button', { name: 'Running...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Running...' })).toBeDisabled()
  })

  it('displays progress information during generation', async () => {
    const user = userEvent.setup()
    let progressCallback: ((progress: any) => void) | undefined

    ;(GenerationService.executeParallelGeneration as any).mockImplementation(
      (prompt: string, models: any[], imageUrl: any, onProgress: any) => {
        progressCallback = onProgress
        return new Promise(resolve => {
          setTimeout(() => {
            if (progressCallback) {
              progressCallback({
                status: 'running',
                current_model: 'gpt-4.1',
                completed_models: [],
                total_models: 1
              })
            }
            resolve({ results: [], total_cost_chf: 0, total_latency_ms: 1000 })
          }, 100)
        })
      }
    )

    render(
      <GenerationForm
        models={mockModels}
        prompts={mockPrompts}
        onGenerate={mockOnGenerate}
      />
    )

    const textInput = screen.getByLabelText('Describe your MetX dashboard requirements')
    const gpt4Checkbox = screen.getByLabelText('GPT-4.1')
    const generateButton = screen.getByRole('button', { name: 'Run' })

    await user.type(textInput, 'Show temperature data')
    await user.click(gpt4Checkbox)
    await user.click(generateButton)

    await waitFor(() => {
      // Check for progress indication - could be "Running..." or progress text
      const runningButton = screen.queryByText(/Running/)
      const progressText = screen.queryByText(/Currently running/)
      expect(runningButton || progressText).toBeTruthy()
    }, { timeout: 3000 })
  })

  it('displays the processed prompt after generation', async () => {
    const user = userEvent.setup()
    ;(GenerationService.executeParallelGeneration as any).mockResolvedValue({
      results: [
        {
          model_id: 'gpt-4.1',
          success: true,
          content: '{"layers": ["temperature"]}',
          cost_chf: 0.06
        }
      ],
      total_cost_chf: 0.06,
      total_latency_ms: 2000
    })

    render(
      <GenerationForm
        models={mockModels}
        prompts={mockPrompts}
        onGenerate={mockOnGenerate}
      />
    )

    const textInput = screen.getByLabelText('Describe your MetX dashboard requirements')
    const gpt4Checkbox = screen.getByLabelText('GPT-4.1')
    const generateButton = screen.getByRole('button', { name: 'Run' })

    await user.type(textInput, 'Show temperature data for Switzerland')
    await user.click(gpt4Checkbox)
    await user.click(generateButton)

    // Wait for generation to complete and prompt to be displayed
    await waitFor(() => {
      expect(screen.getByText('Complete Prompt Sent to LLM')).toBeInTheDocument()
      expect(screen.getByText('View Full Prompt')).toBeInTheDocument()
    })

    // Click to expand the prompt
    const viewPromptButton = screen.getByText('View Full Prompt')
    await user.click(viewPromptButton)

    // Verify the processed prompt is displayed
    await waitFor(() => {
      expect(screen.getByText('Hide Prompt')).toBeInTheDocument()
      expect(screen.getByText('Generate MetX dashboard for: Show temperature data for Switzerland', { exact: false })).toBeInTheDocument()
      expect(screen.getByText(/This is the exact prompt sent to the API after variable replacement/)).toBeInTheDocument()
    })

    // Click to hide the prompt
    const hidePromptButton = screen.getByText('Hide Prompt')
    await user.click(hidePromptButton)

    // Verify the prompt is hidden
    await waitFor(() => {
      expect(screen.getByText('View Full Prompt')).toBeInTheDocument()
      expect(screen.queryByText('Hide Prompt')).not.toBeInTheDocument()
    })
  })

  it('shows processing state when results are being processed', async () => {
    render(
      <GenerationForm
        models={mockModels}
        prompts={mockPrompts}
        isProcessingResults={true}
        onGenerate={mockOnGenerate}
      />
    )

    // Verify processing indicator is shown
    expect(screen.getByText('Processing Results')).toBeInTheDocument()
    expect(screen.getByText('Processing responses and saving results...')).toBeInTheDocument()
    
    // Verify button shows processing state
    expect(screen.getByRole('button', { name: 'Processing Results...' })).toBeDisabled()
    
    // Verify form is disabled during processing
    expect(screen.getByLabelText('Describe your MetX dashboard requirements')).toBeDisabled()
  })

  it('selects default prompt instead of first prompt', () => {
    const promptsWithDefault: Prompt[] = [
      {
        id: 'prompt-1',
        name: 'First Prompt',
        description: 'First prompt (not default)',
        template_text: 'First template: {{user_input}}',
        json_prefix: '{"dashboard": {',
        json_suffix: '}}',
        use_placeholder: true,
        is_default: false,
        version: 1,
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'prompt-2',
        name: 'Default Prompt',
        description: 'This is the default prompt',
        template_text: 'Default template: {{user_input}}',
        json_prefix: '{"dashboard": {',
        json_suffix: '}}',
        use_placeholder: true,
        is_default: true,
        version: 1,
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]

    render(
      <GenerationForm
        models={mockModels}
        prompts={promptsWithDefault}
        onGenerate={mockOnGenerate}
      />
    )

    // Verify the default prompt is selected, not the first one
    const promptSelect = screen.getByDisplayValue('Default Prompt')
    expect(promptSelect).toBeInTheDocument()
  })
}) 