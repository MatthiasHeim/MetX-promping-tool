import React, { useState, useEffect } from 'react'
import { PromptService } from '../../services/prompts/PromptService'
import type { Prompt } from '../../types/database'

interface PromptLibraryProps {
  onEdit: (prompt: Prompt) => void
  onDelete: (prompt: Prompt) => void
  onCreate: () => void
}

export function PromptLibrary({ onEdit, onDelete, onCreate }: PromptLibraryProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Load prompts on component mount and when search changes
  useEffect(() => {
    loadPrompts()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      searchPrompts()
    } else {
      loadPrompts()
    }
  }, [searchQuery])

  const loadPrompts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await PromptService.getAllPrompts()
      setPrompts(data)
    } catch (err) {
      setError('Error loading prompts')
      console.error('Failed to load prompts:', err)
    } finally {
      setLoading(false)
    }
  }

  const searchPrompts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await PromptService.searchPrompts(searchQuery)
      setPrompts(data)
    } catch (err) {
      setError('Error searching prompts')
      console.error('Failed to search prompts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (prompt: Prompt) => {
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      onDelete(prompt)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading prompts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadPrompts}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Prompt Library</h1>
        <button
          onClick={onCreate}
          className="btn-primary"
        >
          Create New Prompt
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {/* Prompts List */}
      {prompts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No prompts found</p>
          <button
            onClick={onCreate}
            className="btn-primary"
          >
            Create Your First Prompt
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="card">
              {/* Prompt Header */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {prompt.name}
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Version {prompt.version}
                  </span>
                </div>
                {prompt.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {prompt.description}
                  </p>
                )}
              </div>

              {/* Template Preview */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Template Preview:</p>
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-700 line-clamp-3">
                  {prompt.template_text}
                </div>
              </div>

              {/* Metadata */}
              <div className="mb-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Created:</span>
                  <span>{formatDate(prompt.created_at)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Updated:</span>
                  <span>{formatDate(prompt.updated_at)}</span>
                </div>
                                 {prompt.use_placeholder && (
                   <div className="flex items-center text-xs text-blue-600">
                     <span>Uses {`{{output}}`} placeholder</span>
                   </div>
                 )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onEdit(prompt)}
                  className="flex-1 btn-secondary text-sm py-1"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(prompt)}
                  className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 