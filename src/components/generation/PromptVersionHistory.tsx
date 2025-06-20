import React, { useState, useEffect } from 'react'
import { PromptService } from '../../services/prompts/PromptService'
import type { Prompt, PromptVersion } from '../../types/database'

interface PromptVersionHistoryProps {
  prompt: Prompt
  isOpen: boolean
  onClose: () => void
  onRollback?: (prompt: Prompt) => void
}

export const PromptVersionHistory: React.FC<PromptVersionHistoryProps> = ({
  prompt,
  isOpen,
  onClose,
  onRollback
}) => {
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRollingBack, setIsRollingBack] = useState<number | null>(null)
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen && prompt && prompt.id) {
      loadVersions()
    }
  }, [isOpen, prompt?.id])

  const loadVersions = async () => {
    if (!prompt || !prompt.id) {
      setError('Invalid prompt data')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const versionsData = await PromptService.getPromptVersions(prompt.id)
      setVersions(versionsData)
    } catch (err) {
      console.error('Error loading versions:', err)
      setError('Failed to load version history')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRollback = async (versionNumber: number) => {
    if (!prompt || !prompt.id) {
      alert('Invalid prompt data')
      return
    }

    if (!confirm(`Are you sure you want to rollback to version ${versionNumber}? This will make it the current active version.`)) {
      return
    }

    try {
      setIsRollingBack(versionNumber)
      const updatedPrompt = await PromptService.rollbackPromptToVersion(prompt.id, versionNumber)
      
      // Reload versions to reflect the change
      await loadVersions()
      
      // Notify parent component
      if (onRollback) {
        onRollback(updatedPrompt)
      }
      
      alert(`Successfully rolled back to version ${versionNumber}`)
    } catch (err) {
      console.error('Error rolling back:', err)
      alert('Failed to rollback. Please try again.')
    } finally {
      setIsRollingBack(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Version History</h2>
              <p className="text-sm text-gray-600 mt-1">
                {prompt?.name || 'Unknown Prompt'} - Current Version: {prompt?.current_version || prompt?.version || 'N/A'}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">{error}</div>
              <button 
                onClick={loadVersions}
                className="btn-primary"
              >
                Retry
              </button>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No version history available
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version) => (
                <div 
                  key={version.id} 
                  className={`border rounded-lg p-4 ${version.is_active ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                >
                  {/* Version Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-gray-900">
                        Version {version.version_number}
                        {version.is_active && (
                          <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Current
                          </span>
                        )}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {formatDate(version.created_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setExpandedVersion(
                          expandedVersion === version.version_number ? null : version.version_number
                        )}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {expandedVersion === version.version_number ? 'Hide Details' : 'Show Details'}
                      </button>
                      
                      {!version.is_active && (
                        <button
                          onClick={() => handleRollback(version.version_number)}
                          disabled={isRollingBack === version.version_number}
                          className="btn-secondary text-sm"
                        >
                          {isRollingBack === version.version_number ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                              Rolling back...
                            </>
                          ) : (
                            'Rollback'
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Version Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <p className="text-gray-900">{version.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Description:</span>
                      <p className="text-gray-900">{version.description || 'No description'}</p>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedVersion === version.version_number && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                      {/* Template Text */}
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Template Text:</h4>
                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                          {version.template_text}
                        </pre>
                      </div>

                      {/* JSON Prefix/Suffix */}
                      {(version.json_prefix || version.json_suffix) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {version.json_prefix && (
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">JSON Prefix:</h4>
                              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                                {version.json_prefix}
                              </pre>
                            </div>
                          )}
                          {version.json_suffix && (
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">JSON Suffix:</h4>
                              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                                {version.json_suffix}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Settings */}
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="font-medium text-gray-700">Settings:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          version.use_placeholder ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {version.use_placeholder ? 'Uses Placeholder' : 'No Placeholder'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 