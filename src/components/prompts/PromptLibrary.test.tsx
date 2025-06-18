import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PromptLibrary } from './PromptLibrary'
import type { Prompt } from '../../types/database'

// Mock the PromptService
vi.mock('../../services/prompts/PromptService', () => ({
  PromptService: {
    getAllPrompts: vi.fn(),
    createPrompt: vi.fn(),
    updatePrompt: vi.fn(),
    deletePrompt: vi.fn(),
    searchPrompts: vi.fn(),
  },
}))

import { PromptService } from '../../services/prompts/PromptService'

describe('PromptLibrary', () => {
  const mockPrompts: Prompt[] = [
    {
      id: 'prompt-1',
      name: 'MetX Default Template',
      description: 'Standard MetX dashboard configuration',
      template_text: 'Generate a comprehensive weather dashboard for {{location}} showing {{parameters}}',
      json_prefix: '{"layers": [',
      json_suffix: ']}',
      use_placeholder: true,
      version: 1,
      created_by: 'user-1',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'prompt-2',
      name: 'Aviation Weather',
      description: 'Aviation-specific weather parameters',
      template_text: 'Create aviation weather dashboard with METAR, TAF, and wind data',
      json_prefix: '{"aviation": true, "layers": [',
      json_suffix: ']}',
      use_placeholder: false,
      version: 2,
      created_by: 'user-2',
      created_at: '2025-01-02T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z'
    }
  ]

  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnCreate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(PromptService.getAllPrompts as any).mockResolvedValue(mockPrompts)
    ;(PromptService.searchPrompts as any).mockResolvedValue(mockPrompts)
  })

  it('should render prompt library with list of prompts', async () => {
    render(
      <PromptLibrary 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    )

    expect(screen.getByText('Prompt Library')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('MetX Default Template')).toBeInTheDocument()
      expect(screen.getByText('Aviation Weather')).toBeInTheDocument()
    })
  })

  it('should display prompt details correctly', async () => {
    render(
      <PromptLibrary 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Standard MetX dashboard configuration')).toBeInTheDocument()
      expect(screen.getByText('Aviation-specific weather parameters')).toBeInTheDocument()
      expect(screen.getByText('Version 1')).toBeInTheDocument()
      expect(screen.getByText('Version 2')).toBeInTheDocument()
    })
  })

  it('should handle search functionality', async () => {
    const user = userEvent.setup()
    
    render(
      <PromptLibrary 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search prompts...')
    await user.type(searchInput, 'aviation')

    await waitFor(() => {
      expect(PromptService.searchPrompts).toHaveBeenCalledWith('aviation')
    })
  })

  it('should handle create new prompt', async () => {
    const user = userEvent.setup()
    
    render(
      <PromptLibrary 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    )

    const createButton = screen.getByText('Create New Prompt')
    await user.click(createButton)

    expect(mockOnCreate).toHaveBeenCalled()
  })

  it('should handle edit prompt', async () => {
    const user = userEvent.setup()
    
    render(
      <PromptLibrary 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    )

    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit')
      expect(editButtons).toHaveLength(2)
    })

    const editButtons = screen.getAllByText('Edit')
    await user.click(editButtons[0])

    expect(mockOnEdit).toHaveBeenCalledWith(mockPrompts[0])
  })

  it('should handle delete prompt with confirmation', async () => {
    const user = userEvent.setup()
    
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    
    render(
      <PromptLibrary 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    )

    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete')
      expect(deleteButtons).toHaveLength(2)
    })

    const deleteButtons = screen.getAllByText('Delete')
    await user.click(deleteButtons[0])

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this prompt?')
    expect(mockOnDelete).toHaveBeenCalledWith(mockPrompts[0])
    
    confirmSpy.mockRestore()
  })

  it('should not delete prompt if user cancels confirmation', async () => {
    const user = userEvent.setup()
    
    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    
    render(
      <PromptLibrary 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    )

    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete')
      expect(deleteButtons).toHaveLength(2)
    })

    const deleteButtons = screen.getAllByText('Delete')
    await user.click(deleteButtons[0])

    expect(confirmSpy).toHaveBeenCalled()
    expect(mockOnDelete).not.toHaveBeenCalled()
    
    confirmSpy.mockRestore()
  })

  it('should filter prompts by search term', async () => {
    const user = userEvent.setup()
    const filteredPrompts = [mockPrompts[1]] // Only aviation prompt
    
    ;(PromptService.searchPrompts as any).mockResolvedValue(filteredPrompts)
    
    render(
      <PromptLibrary 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search prompts...')
    await user.type(searchInput, 'aviation')

    await waitFor(() => {
      expect(screen.getByText('Aviation Weather')).toBeInTheDocument()
      expect(screen.queryByText('MetX Default Template')).not.toBeInTheDocument()
    })
  })

  it('should show loading state', () => {
    ;(PromptService.getAllPrompts as any).mockReturnValue(new Promise(() => {})) // Never resolves
    
    render(
      <PromptLibrary 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    )

    expect(screen.getByText('Loading prompts...')).toBeInTheDocument()
  })

  it('should show empty state when no prompts', async () => {
    ;(PromptService.getAllPrompts as any).mockResolvedValue([])
    
    render(
      <PromptLibrary 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No prompts found')).toBeInTheDocument()
    })
  })

  it('should show error state on fetch failure', async () => {
    ;(PromptService.getAllPrompts as any).mockRejectedValue(new Error('Failed to fetch'))
    
    render(
      <PromptLibrary 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Error loading prompts')).toBeInTheDocument()
    })
  })
}) 