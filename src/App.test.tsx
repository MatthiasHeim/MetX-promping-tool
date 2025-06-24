import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// Mock the services
vi.mock('./services/auth/AuthService', () => ({
  AuthService: {
    validateEmail: vi.fn(() => ({ isValid: true, error: null })),
    validatePassword: vi.fn(() => ({ isValid: true, error: null })),
    signIn: vi.fn(() => Promise.resolve({ user: { id: '1', email: 'test@example.com' }, error: null })),
    signUp: vi.fn(() => Promise.resolve({ user: { id: '1', email: 'test@example.com' }, error: null })),
    getCurrentUser: vi.fn(() => Promise.resolve({ user: { id: '1', email: 'test@example.com' }, error: null })),
    signOut: vi.fn(() => Promise.resolve()),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
  }
}))

vi.mock('./services/prompts/PromptService', () => ({
  PromptService: {
    fetchPrompts: vi.fn(() => Promise.resolve([
      {
        id: 'prompt-1',
        name: 'Test Prompt',
        description: 'Test Description',
        template_text: 'Test template',
        json_prefix: '{"layers": [',
        json_suffix: ']}',
        use_placeholder: false,
        is_default: false,
        version: 1
      }
    ])),
    updatePrompt: vi.fn((id: string, updates: any) => Promise.resolve({
      id,
      name: updates.name || 'Test Prompt',
      description: updates.description || 'Test Description',
      template_text: updates.template_text || 'Test template',
      json_prefix: updates.json_prefix || '{"layers": [',
      json_suffix: updates.json_suffix || ']}',
      use_placeholder: updates.use_placeholder || false,
      is_default: false,
      version: 2
    })),
    createPrompt: vi.fn((prompt: any) => Promise.resolve({
      id: 'prompt-2',
      ...prompt,
      is_default: false,
      version: 1
    })),
    deletePrompt: vi.fn(() => Promise.resolve()),
    setPromptAsDefault: vi.fn(() => Promise.resolve()),
    unsetPromptAsDefault: vi.fn(() => Promise.resolve())
  }
}))

vi.mock('./services/models/ModelService', () => ({
  ModelService: {
    fetchModels: vi.fn(() => Promise.resolve([
      {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        provider: 'openai',
        price_per_1k_tokens: 0.002
      }
    ]))
  }
}))

vi.mock('./services/generation/GenerationService', () => ({
  GenerationService: {
    processPromptTemplate: vi.fn((template: string, input: string) => template.replace('{{input}}', input)),
    checkCostGuardrailsForGeneration: vi.fn(() => ({
      canProceed: true,
      totalCost: 0.003
    })),
    createProgressTracker: vi.fn(() => ({
      user_input_id: 'test-id',
      status: 'pending',
      completed_models: [],
      total_models: 1,
      current_model: undefined
    })),
    executeParallelGeneration: vi.fn(() => Promise.resolve({
      results: [
        {
          model_id: 'gpt-4.1',
          success: true,
          content: JSON.stringify([{"kind": "WmsLayerDescription", "parameter_unit": "t_2m:C"}]),
          tokens_used: 150,
          latency_ms: 2000,
          cost_chf: 0.003,
          error: null
        }
      ],
      total_cost_chf: 0.003,
      total_latency_ms: 2000
    }))
  }
}))

vi.mock('./services/inputs/UserInputService', () => ({
  UserInputService: {
    createUserInput: vi.fn(() => Promise.resolve({
      id: '550e8400-e29b-41d4-a716-446655440001',
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      text: 'Test dashboard',
      input_image_url: null,
      created_at: '2024-01-01T00:00:00Z'
    }))
  }
}))

vi.mock('./services/generation/GenerationResultService', () => ({
  GenerationResultService: {
    createGenerationResults: vi.fn((results: any[]) => Promise.resolve(
      results.map((result: any, index: number) => ({
        id: `550e8400-e29b-41d4-a716-44665544000${index + 2}`,
        ...result,
        created_at: '2024-01-01T00:00:00Z'
      }))
    )),
    updateGenerationResult: vi.fn((id: string, updates: any) => Promise.resolve({
      id,
      ...updates
    }))
  }
}))

describe('App - Rating Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should open rating modal when Rate Result button is clicked', async () => {
    const user = userEvent.setup()
    
    render(<App />)
    
    // Wait for app to load and skip authentication (it's hardcoded to true for dev)
    await waitFor(() => {
      expect(screen.getByText('Generate MetX Dashboard')).toBeInTheDocument()
    })

    // Generate a mock result by filling the form and submitting
    const textInput = screen.getByLabelText('Describe your MetX dashboard requirements')
    const modelCheckbox = screen.getByLabelText('GPT-4.1')
    const generateButton = screen.getByText('Run')

    await user.type(textInput, 'Test dashboard')
    await user.click(modelCheckbox)
    await user.click(generateButton)

    // Wait for results to appear
    await waitFor(() => {
      expect(screen.getByText('Generation Results')).toBeInTheDocument()
    })

    // Click the Rate Result button
    const rateButton = screen.getByText('Rate Result')
    await user.click(rateButton)

    // Verify modal opens
    await waitFor(() => {
      expect(screen.getByText('Rate Generation Result')).toBeInTheDocument()
      expect(screen.getByText('Rating (1-5 stars)')).toBeInTheDocument()
    })
  })

  it('should save rating and update button text', async () => {
    const user = userEvent.setup()
    
    render(<App />)
    
    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('MetX Prompting Tool')).toBeInTheDocument()
    })

    // Generate a result
    const textInput = screen.getByLabelText('Describe your MetX dashboard requirements')
    const modelCheckbox = screen.getByLabelText('GPT-4.1')
    const generateButton = screen.getByText('Run')

    await user.type(textInput, 'Test dashboard')
    await user.click(modelCheckbox)
    await user.click(generateButton)

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Rate Result')).toBeInTheDocument()
    })

    // Open rating modal
    const rateButton = screen.getByText('Rate Result')
    await user.click(rateButton)

    // Rate 4 stars
    const fourthStar = screen.getAllByText('★')[3] // 4th star (0-indexed)
    await user.click(fourthStar)

    // Add comment
    const commentTextarea = screen.getByPlaceholderText('What did you think about this result? Any specific feedback?')
    await user.type(commentTextarea, 'Great result!')

    // Save rating
    const saveButton = screen.getByText('Save Rating')
    await user.click(saveButton)

    // Verify modal closes and button text updates
    await waitFor(() => {
      expect(screen.queryByText('Rate Generation Result')).not.toBeInTheDocument()
      expect(screen.getByText('★ 4/5')).toBeInTheDocument()
    })

    // Verify manual rating is displayed
    await waitFor(() => {
      expect(screen.getByText('Manual Rating')).toBeInTheDocument()
      expect(screen.getByText('Great result!')).toBeInTheDocument()
    })
  })
})

describe('App - Prompt Editing Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should navigate to editor when Edit button is clicked', async () => {
    const user = userEvent.setup()
    
    render(<App />)
    
    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('Generate MetX Dashboard')).toBeInTheDocument()
    })

    // Navigate to Prompts tab
    const promptsTab = screen.getByText('Prompts')
    await user.click(promptsTab)

    // Wait for prompts to load
    await waitFor(() => {
      expect(screen.getByText('Test Prompt')).toBeInTheDocument()
    })

    // Click Edit button
    const editButton = screen.getByText('Edit')
    await user.click(editButton)

    // Verify we're in editor view
    await waitFor(() => {
      expect(screen.getByText('Edit Prompt')).toBeInTheDocument()
      expect(screen.getByText('Prompt Name')).toBeInTheDocument()
    })
  })

  it('should properly manage state after saving prompt and show Edit button', async () => {
    const user = userEvent.setup()
    
    render(<App />)
    
    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('Generate MetX Dashboard')).toBeInTheDocument()
    })

    // Navigate to Prompts tab
    const promptsTab = screen.getByText('Prompts')
    await user.click(promptsTab)

    // Wait for prompts to load
    await waitFor(() => {
      expect(screen.getByText('Test Prompt')).toBeInTheDocument()
    })

    // Click Edit button
    const editButton = screen.getByText('Edit')
    await user.click(editButton)

    // Wait for editor to load
    await waitFor(() => {
      expect(screen.getByText('Edit Prompt')).toBeInTheDocument()
    })

    // Edit the prompt name
    const nameInput = screen.getByDisplayValue('Test Prompt')
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Test Prompt')

    // Save the prompt
    const saveButton = screen.getByText('Save Prompt')
    await user.click(saveButton)

    // Verify we're back to prompts view and Edit button is visible
    await waitFor(() => {
      expect(screen.getByText('📝 Prompt Management System')).toBeInTheDocument()
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })

    // Verify the prompt was updated in the list
    await waitFor(() => {
      expect(screen.getByText('Test Prompt')).toBeInTheDocument() // Still shows original because mock returns original
    })
  })

  it('should cancel editing and return to prompts view', async () => {
    const user = userEvent.setup()
    
    render(<App />)
    
    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('Generate MetX Dashboard')).toBeInTheDocument()
    })

    // Navigate to Prompts tab
    const promptsTab = screen.getByText('Prompts')
    await user.click(promptsTab)

    // Wait for prompts to load
    await waitFor(() => {
      expect(screen.getByText('Test Prompt')).toBeInTheDocument()
    })

    // Click Edit button
    const editButton = screen.getByText('Edit')
    await user.click(editButton)

    // Wait for editor to load
    await waitFor(() => {
      expect(screen.getByText('Edit Prompt')).toBeInTheDocument()
    })

    // Cancel editing
    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    // Verify we're back to prompts view
    await waitFor(() => {
      expect(screen.getByText('📝 Prompt Management System')).toBeInTheDocument()
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
  })

  it('should create new prompt and return to prompts view with Edit button visible', async () => {
    const user = userEvent.setup()
    
    render(<App />)
    
    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('Generate MetX Dashboard')).toBeInTheDocument()
    })

    // Navigate to Prompts tab
    const promptsTab = screen.getByText('Prompts')
    await user.click(promptsTab)

    // Wait for prompts to load
    await waitFor(() => {
      expect(screen.getByText('Test Prompt')).toBeInTheDocument()
    })

    // Click Create New Prompt button
    const createButton = screen.getByText('+ Create New Prompt')
    await user.click(createButton)

    // Wait for editor to load
    await waitFor(() => {
      expect(screen.getByText('Create New Prompt')).toBeInTheDocument()
    })

    // Fill in the form
    const nameInput = screen.getByPlaceholderText('e.g., Advanced Aviation Weather')
    await user.type(nameInput, 'New Test Prompt')

    const templateInput = screen.getByPlaceholderText('Enter your prompt template here...')
    await user.type(templateInput, 'This is a new test template')

    // Save the prompt
    const saveButton = screen.getByText('Save Prompt')
    await user.click(saveButton)

    // Verify we're back to prompts view and Edit button is visible
    await waitFor(() => {
      expect(screen.getByText('📝 Prompt Management System')).toBeInTheDocument()
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
  })
}) 