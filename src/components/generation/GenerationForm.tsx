import React, { useState, useEffect } from 'react'
import { GenerationService } from '../../services/generation/GenerationService'
import type { Model, Prompt, GenerationProgress } from '../../types/database'

interface GenerationFormProps {
  models: Model[]
  prompts: Prompt[]
  onGenerate: (data: {
    text: string
    selectedModels: Model[]
    selectedPrompt: Prompt
    inputImage: File | null
  }) => void
}

interface FormState {
  text: string
  selectedModelIds: string[]
  selectedPromptId: string
  inputImage: File | null
  errors: {
    text?: string
    models?: string
  }
}

export function GenerationForm({ models, prompts, onGenerate }: GenerationFormProps) {
  const [formState, setFormState] = useState<FormState>({
    text: '',
    selectedModelIds: [],
    selectedPromptId: '',
    inputImage: null,
    errors: {}
  })

  // Update selectedPromptId when prompts are loaded
  useEffect(() => {
    if (prompts.length > 0 && !formState.selectedPromptId) {
      setFormState(prev => ({
        ...prev,
        selectedPromptId: prompts[0].id
      }))
    }
  }, [prompts, formState.selectedPromptId])
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [costEstimation, setCostEstimation] = useState<{
    canProceed: boolean
    totalCost: number
    warning?: string
  }>({ canProceed: true, totalCost: 0 })
  
  const [progress, setProgress] = useState<GenerationProgress | null>(null)

  // Update cost estimation when form changes
  useEffect(() => {
    if (formState.text && formState.selectedModelIds.length > 0 && formState.selectedPromptId) {
      const selectedModels = models.filter(m => formState.selectedModelIds.includes(m.id))
      const selectedPrompt = prompts.find(p => p.id === formState.selectedPromptId)
      
      if (selectedPrompt) {
        // Use the new method that includes the full prompt template in token estimation
        const result = GenerationService.checkCostGuardrailsForGeneration(
          selectedModels,
          formState.text,
          selectedPrompt.template_text,
          !!formState.inputImage,
          0.20
        )
        setCostEstimation(result)
      } else {
        setCostEstimation({ canProceed: true, totalCost: 0 })
      }
    } else {
      setCostEstimation({ canProceed: true, totalCost: 0 })
    }
  }, [formState.text, formState.selectedModelIds, formState.selectedPromptId, formState.inputImage, models, prompts])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormState(prev => ({
      ...prev,
      text: e.target.value,
      errors: { ...prev.errors, text: undefined }
    }))
  }

  const handleModelToggle = (modelId: string) => {
    setFormState(prev => {
      const isSelected = prev.selectedModelIds.includes(modelId)
      const newSelectedIds = isSelected
        ? prev.selectedModelIds.filter(id => id !== modelId)
        : [...prev.selectedModelIds, modelId]
      
      return {
        ...prev,
        selectedModelIds: newSelectedIds,
        errors: { ...prev.errors, models: undefined }
      }
    })
  }

  const handlePromptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState(prev => ({
      ...prev,
      selectedPromptId: e.target.value
    }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormState(prev => ({
      ...prev,
      inputImage: file
    }))
  }

  const validateForm = (): boolean => {
    const errors: FormState['errors'] = {}
    
    if (!formState.text.trim()) {
      errors.text = 'Please describe your dashboard requirements'
    }
    
    if (formState.selectedModelIds.length === 0) {
      errors.models = 'Please select at least one model'
    }
    
    setFormState(prev => ({ ...prev, errors }))
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !costEstimation.canProceed) {
      return
    }
    
    const selectedModels = models.filter(m => formState.selectedModelIds.includes(m.id))
    const selectedPrompt = prompts.find(p => p.id === formState.selectedPromptId)
    
    if (!selectedPrompt) {
      console.error('No prompt selected or prompt not found')
      return
    }
    
    setIsGenerating(true)
    setProgress(null)
    
    try {
      // Create progress tracker
      const userInputId = `temp-${Date.now()}`
      let currentProgress = GenerationService.createProgressTracker(userInputId, selectedModels.map(m => m.id))
      setProgress(currentProgress)
      
      // Simulate generation with progress updates
      const processedPrompt = GenerationService.processPromptTemplate(selectedPrompt.template_text, formState.text)
      
      await GenerationService.executeParallelGeneration(
        processedPrompt,
        selectedModels,
        formState.inputImage ? URL.createObjectURL(formState.inputImage) : undefined,
        (progressUpdate) => {
          setProgress(progressUpdate)
        }
      )
      
      onGenerate({
        text: formState.text,
        selectedModels,
        selectedPrompt,
        inputImage: formState.inputImage
      })
    } finally {
      setIsGenerating(false)
      setProgress(null)
    }
  }

  return (
    <div className="card max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate MetX Dashboard</h2>
        <p className="text-gray-600">
          Describe your requirements and select models to generate JSON configurations
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Text Input */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Describe your MetX dashboard requirements
          </label>
          <textarea
            id="description"
            value={formState.text}
            onChange={handleTextChange}
            placeholder="e.g., Show temperature and precipitation data for Switzerland with hourly forecast"
            className={`input-field h-32 resize-none ${formState.errors.text ? 'input-field-error' : ''}`}
            disabled={isGenerating}
          />
          {formState.errors.text && (
            <p className="mt-1 text-sm text-red-600">{formState.errors.text}</p>
          )}
        </div>

        {/* Image Upload */}
        <div>
          <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700 mb-2">
            Upload Input Image (optional)
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isGenerating}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
          />
          {formState.inputImage && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {formState.inputImage.name}
            </p>
          )}
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Models
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {models.map((model) => (
              <div key={model.id} className="border rounded-lg p-4">
                <label htmlFor={`model-${model.id}`} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    id={`model-${model.id}`}
                    type="checkbox"
                    checked={formState.selectedModelIds.includes(model.id)}
                    onChange={() => handleModelToggle(model.id)}
                    disabled={isGenerating}
                    className="mt-1"
                    aria-label={model.name}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{model.name}</div>
                    <div className="text-sm text-gray-500">
                      {model.price_per_1k_tokens} CHF/1k tokens
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
          {formState.errors.models && (
            <p className="mt-2 text-sm text-red-600">{formState.errors.models}</p>
          )}
        </div>

        {/* Prompt Template Selection */}
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            Select Prompt Template
          </label>
          <select
            id="prompt"
            value={formState.selectedPromptId}
            onChange={handlePromptChange}
            disabled={isGenerating || prompts.length === 0}
            className="input-field"
          >
            {prompts.length === 0 ? (
              <option value="">Loading prompts...</option>
            ) : (
              prompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name}
                </option>
              ))
            )}
          </select>
          {formState.selectedPromptId && (
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                {prompts.find(p => p.id === formState.selectedPromptId)?.description}
              </p>
            </div>
          )}
        </div>

        {/* Cost Estimation */}
        {(formState.text || formState.selectedModelIds.length > 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Cost Estimation</h3>
            <p className="text-sm text-blue-700">
              Estimated cost: {costEstimation.totalCost.toFixed(4)} CHF
            </p>
            {costEstimation.warning && (
              <p className="text-sm text-red-600 mt-1">{costEstimation.warning}</p>
            )}
          </div>
        )}

        {/* Progress Display */}
        {progress && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-900 mb-2">Generation Progress</h3>
            <div className="text-sm text-yellow-700">
              {progress.current_model && (
                <p>Currently running: {progress.current_model}</p>
              )}
              <p>
                Completed: {progress.completed_models.length} / {progress.total_models} models
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isGenerating || !costEstimation.canProceed || prompts.length === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate Dashboard'}
          </button>
        </div>
      </form>
    </div>
  )
} 