import React, { useState, useEffect } from 'react'
import { PromptService } from '../../services/prompts/PromptService'
import type { Prompt, CreatePromptRequest, UpdatePromptRequest } from '../../services/prompts/PromptService'

interface PromptEditorProps {
  prompt?: Prompt | null
  onSave: (prompt: Prompt) => void
  onCancel: () => void
}

export function PromptEditor({ prompt, onSave, onCancel }: PromptEditorProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_text: '',
    json_prefix: '',
    json_suffix: '',
    use_placeholder: false
  })
  
  const [validation, setValidation] = useState({
    isValid: true,
    errors: [] as string[],
    placeholders: [] as string[]
  })
  
  const [stats, setStats] = useState({
    characterCount: 0,
    wordCount: 0,
    placeholderCount: 0,
    estimatedTokens: 0
  })
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form with existing prompt data
  useEffect(() => {
    if (prompt) {
      setFormData({
        name: prompt.name,
        description: prompt.description || '',
        template_text: prompt.template_text,
        json_prefix: prompt.json_prefix || '',
        json_suffix: prompt.json_suffix || '',
        use_placeholder: prompt.use_placeholder || false
      })
    }
  }, [prompt])

  // Validate template and update stats when template changes
  useEffect(() => {
    if (formData.template_text) {
      const validationResult = PromptService.validatePromptTemplate(formData.template_text)
      const statsResult = PromptService.getTemplateStats(formData.template_text)
      
      setValidation(validationResult)
      setStats(statsResult)
    } else {
      setValidation({ isValid: true, errors: [], placeholders: [] })
      setStats({ characterCount: 0, wordCount: 0, placeholderCount: 0, estimatedTokens: 0 })
    }
  }, [formData.template_text])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validation.isValid) {
      setError('Please fix template validation errors before saving')
      return
    }

    if (!formData.name.trim()) {
      setError('Prompt name is required')
      return
    }

    if (!formData.template_text.trim()) {
      setError('Template text is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      let savedPrompt: Prompt

      if (prompt) {
        // Update existing prompt
        const updateRequest: UpdatePromptRequest = {
          id: prompt.id,
          ...formData
        }
        savedPrompt = await PromptService.updatePrompt(updateRequest)
      } else {
        // Create new prompt
        const createRequest: CreatePromptRequest = formData
        savedPrompt = await PromptService.createPrompt(createRequest)
      }

      onSave(savedPrompt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt')
    } finally {
      setSaving(false)
    }
  }

  const handleTemplatePreview = () => {
    if (validation.placeholders.length > 0) {
      const sampleVariables: Record<string, string> = {}
      validation.placeholders.forEach(placeholder => {
        sampleVariables[placeholder] = `[${placeholder.toUpperCase()}]`
      })
      return PromptService.processTemplate(formData.template_text, sampleVariables)
    }
    return formData.template_text
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {prompt ? 'Edit Prompt' : 'Create New Prompt'}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !validation.isValid}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Prompt'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Prompt Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input-field"
              placeholder="e.g., MetX Aviation Weather"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input-field"
              placeholder="Brief description of this prompt"
            />
          </div>
        </div>

        {/* Template Text */}
        <div>
          <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-2">
            Template Text *
          </label>
          <textarea
            id="template"
            value={formData.template_text}
            onChange={(e) => setFormData(prev => ({ ...prev, template_text: e.target.value }))}
            className={`input-field h-40 resize-vertical ${!validation.isValid ? 'input-field-error' : ''}`}
            placeholder="Generate a comprehensive weather dashboard for {{location}} showing {{parameters}}..."
            required
          />
          
          {/* Validation Errors */}
          {!validation.isValid && (
            <div className="mt-2 space-y-1">
              {validation.errors.map((error, index) => (
                <p key={index} className="text-sm text-red-600">• {error}</p>
              ))}
            </div>
          )}
          
          {/* Template Stats */}
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
            <div>Characters: {stats.characterCount}</div>
            <div>Words: {stats.wordCount}</div>
            <div>Placeholders: {stats.placeholderCount}</div>
            <div>Est. Tokens: {stats.estimatedTokens}</div>
          </div>
          
          {/* Placeholders Found */}
          {validation.placeholders.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">
                Placeholders found: {validation.placeholders.map(p => `{{${p}}}`).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* JSON Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="json_prefix" className="block text-sm font-medium text-gray-700 mb-2">
              JSON Prefix
            </label>
            <textarea
              id="json_prefix"
              value={formData.json_prefix}
              onChange={(e) => setFormData(prev => ({ ...prev, json_prefix: e.target.value }))}
              className="input-field h-24 resize-vertical"
              placeholder='{"layers": ['
            />
          </div>
          
          <div>
            <label htmlFor="json_suffix" className="block text-sm font-medium text-gray-700 mb-2">
              JSON Suffix
            </label>
            <textarea
              id="json_suffix"
              value={formData.json_suffix}
              onChange={(e) => setFormData(prev => ({ ...prev, json_suffix: e.target.value }))}
              className="input-field h-24 resize-vertical"
              placeholder=']}'
            />
          </div>
        </div>

        {/* Use Placeholder Option */}
        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.use_placeholder}
              onChange={(e) => setFormData(prev => ({ ...prev, use_placeholder: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-gray-700">
              Use {`{{output}}`} placeholder (replaces model output in template)
            </span>
          </label>
        </div>

        {/* Template Preview */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Template Preview</h3>
          <div className="bg-gray-50 border rounded-lg p-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {handleTemplatePreview()}
            </pre>
          </div>
        </div>
      </form>
    </div>
  )
} 