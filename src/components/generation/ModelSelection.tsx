import { useState } from 'react'
import type { Model } from '../../types/database'

interface ModelSelectionProps {
  models: Model[]
  selectedModelIds: string[]
  onModelToggle: (modelId: string) => void
  isLoading: boolean
  error?: string
}

export function ModelSelection({ models, selectedModelIds, onModelToggle, isLoading, error }: ModelSelectionProps) {
  const [showAdditionalModels, setShowAdditionalModels] = useState(false)

  // Separate pinned and unpinned models
  const pinnedModels = models.filter(model => model.is_pinned)
  const additionalModels = models.filter(model => !model.is_pinned)

  const ModelCard = ({ model, isPinned = false }: { model: Model; isPinned?: boolean }) => {
    const isSelected = selectedModelIds.includes(model.id)
    
    return (
      <label 
        className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
          isSelected 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:bg-gray-50'
        }`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onModelToggle(model.id)}
          disabled={isLoading}
          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm text-gray-900">{model.name}</span>
            {isPinned && <span className="text-blue-500 text-xs">★</span>}
          </div>
          <div className="text-xs text-gray-500">
            {model.provider} • {model.price_per_1k_tokens.toFixed(5)} CHF/1k tokens
          </div>
        </div>
      </label>
    )
  }

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-medium text-gray-900">Select Models</h3>
      </div>
      
      {/* Pinned Models */}
      {pinnedModels.length > 0 && (
        <div className="mb-4">
          <div className="space-y-2">
            {pinnedModels.map((model) => (
              <ModelCard key={model.id} model={model} isPinned={true} />
            ))}
          </div>
        </div>
      )}

      {/* Additional Models */}
      {additionalModels.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowAdditionalModels(!showAdditionalModels)}
            className="flex items-center justify-between w-full p-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 mb-2"
            disabled={isLoading}
          >
            <span>Additional Models ({additionalModels.length})</span>
            <span className={`transform transition-transform ${showAdditionalModels ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {showAdditionalModels && (
            <div className="space-y-2">
              {additionalModels.map((model) => (
                <ModelCard key={model.id} model={model} isPinned={false} />
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}
    </div>
  )
} 