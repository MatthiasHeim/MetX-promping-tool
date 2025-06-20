import React, { useState, useEffect } from 'react'
import { GenerationResultService } from '../../services/generation/GenerationResultService'
import { PromptService } from '../../services/prompts/PromptService'
import { ModelService } from '../../services/models/ModelService'
import { UserInputService } from '../../services/inputs/UserInputService'
import type { GenerationResult, Prompt, Model, UserInput } from '../../types/database'

interface EnrichedGenerationResult extends GenerationResult {
  prompt?: Prompt | null
  model?: Model
  user_input?: UserInput | null
}

interface GenerationsViewProps {
  currentUser: any
}

export const GenerationsView: React.FC<GenerationsViewProps> = ({ currentUser }) => {
  const [generations, setGenerations] = useState<EnrichedGenerationResult[]>([])
  const [filteredGenerations, setFilteredGenerations] = useState<EnrichedGenerationResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter and sort state
  const [selectedPromptId, setSelectedPromptId] = useState<string>('')
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [sortBy, setSortBy] = useState<'created_at' | 'manual_score' | 'overall_score'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Data for filters
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [models, setModels] = useState<Model[]>([])
  
  // Modal state for viewing prompts
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean
    prompt: Prompt | null
  }>({ isOpen: false, prompt: null })

  // Modal state for rating
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean
    result: EnrichedGenerationResult | null
    rating: number
    comment: string
  }>({
    isOpen: false,
    result: null,
    rating: 0,
    comment: ''
  })

  useEffect(() => {
    if (currentUser) {
      loadData()
    }
  }, [currentUser])

  useEffect(() => {
    filterAndSortGenerations()
  }, [generations, selectedPromptId, selectedModelId, sortBy, sortOrder])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load all data in parallel
      const [genResults, promptsData, modelsData] = await Promise.all([
        GenerationResultService.getGenerationResultsByUser(currentUser.id),
        PromptService.fetchPrompts(),
        ModelService.fetchModels()
      ])

      setPrompts(promptsData)
      setModels(modelsData)

      // Enrich generation results with related data
      const enrichedResults = await Promise.all(
        genResults.map(async (result) => {
          try {
            const [prompt, model, userInput] = await Promise.all([
              PromptService.fetchPromptById(result.prompt_id),
              modelsData.find(m => m.id === result.model_id),
              UserInputService.getUserInputById(result.user_input_id)
            ])

            return {
              ...result,
              prompt,
              model,
              user_input: userInput
            }
          } catch (err) {
            console.error('Error enriching result:', err)
            return {
              ...result,
              model: modelsData.find(m => m.id === result.model_id)
            }
          }
        })
      )

      setGenerations(enrichedResults)
    } catch (err) {
      console.error('Error loading generations:', err)
      setError('Failed to load generations. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortGenerations = () => {
    let filtered = [...generations]

    // Apply filters
    if (selectedPromptId) {
      filtered = filtered.filter(gen => gen.prompt_id === selectedPromptId)
    }
    if (selectedModelId) {
      filtered = filtered.filter(gen => gen.model_id === selectedModelId)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'manual_score':
          aValue = a.manual_score || 0
          bValue = b.manual_score || 0
          break
        case 'overall_score':
          aValue = a.overall_score || 0
          bValue = b.overall_score || 0
          break
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredGenerations(filtered)
  }

  const handleViewPrompt = (prompt: Prompt) => {
    setPromptModal({ isOpen: true, prompt })
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

  const formatLatency = (latencyMs: number | null) => {
    if (latencyMs === null || latencyMs === undefined) return 'N/A'
    
    if (latencyMs < 1000) {
      return `${latencyMs}ms`
    }
    
    const seconds = Math.round(latencyMs / 1000 * 10) / 10 // Round to 1 decimal
    
    if (seconds < 60) {
      return `${seconds}s`
    }
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    
    if (remainingSeconds === 0) {
      return `${minutes}m`
    }
    
    return `${minutes}m ${remainingSeconds}s`
  }

  const getEvaluationBreakdown = (result: EnrichedGenerationResult) => {
    const breakdown = []
    if (result.parameter_completeness_score !== null) {
      breakdown.push(`Parameter Completeness: ${Math.round(result.parameter_completeness_score * 100)}%`)
    }
    if (result.structure_quality_score !== null) {
      breakdown.push(`Structure Quality: ${Math.round(result.structure_quality_score * 100)}%`)
    }
    if (result.layer_count_score !== null) {
      breakdown.push(`Layer Count: ${Math.round(result.layer_count_score * 100)}%`)
    }
    if (result.cost_efficiency_score !== null) {
      breakdown.push(`Cost Efficiency: ${Math.round(result.cost_efficiency_score * 100)}%`)
    }
    if (result.performance_score !== null) {
      breakdown.push(`Performance: ${Math.round(result.performance_score * 100)}%`)
    }
    return breakdown
  }

  const getScoreColor = (score: number) => {
    const percentage = score * 100  // Convert decimal to percentage
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    if (percentage >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  // Helper function to get coordinates for different locations (copied from App.tsx)
  const getLocationCoordinates = (userInput: string) => {
    const inputLower = userInput.toLowerCase()
    
    // Location mapping with coordinates and bounds
    const locations = {
      hawaii: {
        center_lat: 21.3099,
        center_lng: -157.8581,
        zoom: 7,
        sw_lat: 18.9108,
        sw_lng: -161.0578,
        ne_lat: 22.2350,
        ne_lng: -154.8061
      },
      switzerland: {
        center_lat: 47.3769,
        center_lng: 8.5417,
        zoom: 7,
        sw_lat: 45.8180,
        sw_lng: 5.9559,
        ne_lat: 47.8084,
        ne_lng: 10.4921
      },
      europe: {
        center_lat: 50.8503,
        center_lng: 4.3517,
        zoom: 5,
        sw_lat: 35.0,
        sw_lng: -10.0,
        ne_lat: 65.0,
        ne_lng: 30.0
      },
      usa: {
        center_lat: 39.8283,
        center_lng: -98.5795,
        zoom: 4,
        sw_lat: 24.396308,
        sw_lng: -125.000000,
        ne_lat: 49.384358,
        ne_lng: -66.885444
      },
      california: {
        center_lat: 36.7783,
        center_lng: -119.4179,
        zoom: 6,
        sw_lat: 32.5343,
        sw_lng: -124.4096,
        ne_lat: 42.0095,
        ne_lng: -114.1312
      }
    }

    // Check for specific locations
    for (const [location, coords] of Object.entries(locations)) {
      if (inputLower.includes(location)) {
        return coords
      }
    }

    // Default to Switzerland if no specific location is mentioned
    return locations.switzerland
  }

  const constructCompleteJson = (rawOutput: any, prompt: Prompt, userInput?: string): string => {
    let prefix = prompt.json_prefix || ''
    const suffix = prompt.json_suffix || ''
    
    // If no prefix/suffix, just return the raw output as formatted JSON
    if (!prefix && !suffix) {
      return JSON.stringify(rawOutput, null, 2)
    }
    
    // Get location-specific coordinates
    const locationCoords = getLocationCoordinates(userInput || '')
    
    // Replace placeholders in prefix with location-specific values
    prefix = prefix
      .replace(/\{\{DASHBOARD_TITLE\}\}/g, 'Generated Dashboard')
      .replace(/\{\{TAB_TITLE\}\}/g, 'Main View')
      .replace(/\{\{MAP_TITLE\}\}/g, 'Weather Map')
      .replace(/\{\{MAP_TITLE_STYLE\}\}/g, 'null')
      .replace(/\{\{MAP_PROJECTION\}\}/g, '{"name": "mercator", "center": null, "parallels": null}')
      .replace(/\{\{CENTER_LNG\}\}/g, locationCoords.center_lng.toString())
      .replace(/\{\{CENTER_LAT\}\}/g, locationCoords.center_lat.toString())
      .replace(/\{\{ZOOM_LEVEL\}\}/g, locationCoords.zoom.toString())
      .replace(/\{\{SW_LNG\}\}/g, locationCoords.sw_lng.toString())
      .replace(/\{\{SW_LAT\}\}/g, locationCoords.sw_lat.toString())
      .replace(/\{\{NE_LNG\}\}/g, locationCoords.ne_lng.toString())
      .replace(/\{\{NE_LAT\}\}/g, locationCoords.ne_lat.toString())
    
    // Format the raw output based on what the prompt expects
    let formattedOutput: string
    if (Array.isArray(rawOutput)) {
      // For arrays, format each element with proper indentation and remove outer brackets
      formattedOutput = rawOutput.map(item => 
        JSON.stringify(item, null, 2)
          .split('\n')
          .map(line => line ? '            ' + line : line) // Add indentation to match prefix structure
          .join('\n')
      ).join(',\n')
    } else {
      formattedOutput = JSON.stringify(rawOutput, null, 2)
        .split('\n')
        .map(line => line ? '            ' + line : line) // Add indentation to match prefix structure
        .join('\n')
    }
    
    const result = prefix + formattedOutput + suffix
    
    // Test if the result is valid JSON
    try {
      JSON.parse(result)
      return result
    } catch (error) {
      console.warn('Constructed JSON is invalid, falling back to raw output:', error)
      console.log('Invalid JSON preview:', result.substring(0, 200) + '...')
      // Return the raw output as a valid JSON fallback
      return JSON.stringify({
        layers: Array.isArray(rawOutput) ? rawOutput : [rawOutput],
        note: 'Prefix/suffix combination failed, returning raw layers',
        original_prefix: prefix.substring(0, 100) + '...',
        original_suffix: suffix.substring(0, 100) + '...'
      }, null, 2)
    }
  }

  const handleDownloadJson = (result: EnrichedGenerationResult) => {
    try {
      const completeJson = constructCompleteJson(result.raw_json, result.prompt!, result.user_input?.text)
      const blob = new Blob([completeJson], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `metx-dashboard-${result.model?.name || result.model_id}-${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      console.log('JSON downloaded')
    } catch (error) {
      console.error('Failed to download JSON:', error)
      alert('Failed to download JSON. Please try again.')
    }
  }

  const handleRateResult = (result: EnrichedGenerationResult) => {
    setRatingModal({
      isOpen: true,
      result: result,
      rating: result.manual_score || 0,
      comment: result.manual_comment || ''
    })
  }

  const handleSaveRating = async () => {
    if (!ratingModal.result || ratingModal.rating === 0) return

    try {
      // Update the generation result in the database
      await GenerationResultService.updateGenerationResult(ratingModal.result.id, {
        manual_score: ratingModal.rating,
        manual_comment: ratingModal.comment
      })

      // Update the local state
      setGenerations(prevGenerations => 
        prevGenerations.map(gen => 
          gen.id === ratingModal.result!.id 
            ? { ...gen, manual_score: ratingModal.rating, manual_comment: ratingModal.comment }
            : gen
        )
      )

      // Close modal
      setRatingModal({
        isOpen: false,
        result: null,
        rating: 0,
        comment: ''
      })
    } catch (error) {
      console.error('Error saving rating:', error)
      alert('Failed to save rating. Please try again.')
    }
  }

  const handleCancelRating = () => {
    setRatingModal({
      isOpen: false,
      result: null,
      rating: 0,
      comment: ''
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button 
          onClick={loadData}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Generations</h2>
          <p className="text-gray-600">
            {filteredGenerations.length} of {generations.length} generations
          </p>
        </div>
        <button 
          onClick={loadData}
          className="btn-secondary"
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      {/* Filters and Sorting */}
      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters & Sorting</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Prompt Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Prompt
            </label>
            <select
              value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
              className="input-field"
            >
              <option value="">All Prompts</option>
              {prompts.map(prompt => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Model Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Model
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="input-field"
            >
              <option value="">All Models</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input-field"
            >
              <option value="created_at">Date Created</option>
              <option value="manual_score">User Rating</option>
              <option value="overall_score">Evaluation Score</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="input-field"
            >
              <option value="desc">High to Low</option>
              <option value="asc">Low to High</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(selectedPromptId || selectedModelId) && (
          <div className="pt-2">
            <button
              onClick={() => {
                setSelectedPromptId('')
                setSelectedModelId('')
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Generations Grid */}
      {filteredGenerations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-500">
            {generations.length === 0 
              ? "No generations found. Start by generating some results!" 
              : "No generations match your current filters."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredGenerations.map((result) => (
            <div key={result.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  {/* User Input */}
                  <div className="flex-1 mr-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">User Input:</h4>
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {result.user_input?.text || 'No input text available'}
                    </p>
                  </div>
                  
                  {/* Date */}
                  <div className="text-xs text-gray-500">
                    {formatDate(result.created_at)}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Model */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Model:</span>
                  <span className="text-sm text-gray-900 font-mono">
                    {result.model?.name || result.model_id}
                  </span>
                </div>

                {/* Prompt */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Prompt:</span>
                  <button
                    onClick={() => result.prompt && handleViewPrompt(result.prompt)}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                    disabled={!result.prompt}
                  >
                    {result.prompt?.name || 'View Prompt'}
                  </button>
                </div>

                {/* Scores Row */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {/* User Rating */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">User Rating</div>
                    {result.manual_score ? (
                      <div 
                        className="relative group cursor-pointer"
                        onClick={() => handleRateResult(result)}
                        title={result.manual_comment || 'Click to edit rating'}
                      >
                        <div className="flex justify-center text-yellow-400 text-lg hover:text-yellow-500 transition-colors">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span 
                              key={star} 
                              className={star <= result.manual_score! ? 'text-yellow-400' : 'text-gray-300'}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {result.manual_score}/5
                        </div>
                        
                        {/* Tooltip for reasoning */}
                        {result.manual_comment && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-48">
                            {result.manual_comment}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRateResult(result)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Add Rating
                      </button>
                    )}
                  </div>

                  {/* Evaluation Score */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Evaluation Score</div>
                    {result.overall_score !== null ? (
                      <div className="relative group cursor-help">
                        <div className={`text-lg font-semibold ${getScoreColor(result.overall_score)}`}>
                          {Math.round(result.overall_score * 100)}%
                        </div>
                        
                        {/* Tooltip for breakdown */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-56">
                          <div className="space-y-1">
                            {getEvaluationBreakdown(result).map((item, index) => (
                              <div key={index}>{item}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">Not evaluated</div>
                    )}
                  </div>
                </div>

                {/* Cost and Performance */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 text-xs text-gray-500">
                  <div>
                    <span className="font-medium">Cost:</span> {result.cost_chf ? `${result.cost_chf} CHF` : 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Latency:</span> {formatLatency(result.latency_ms)}
                  </div>
                </div>

                {/* Download Button */}
                <div className="pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleDownloadJson(result)}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-md text-sm transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    <span>Download Complete JSON</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Prompt Modal */}
      {promptModal.isOpen && promptModal.prompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {promptModal.prompt.name}
                  </h3>
                  {promptModal.prompt.description && (
                    <p className="text-gray-600 mt-1">{promptModal.prompt.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setPromptModal({ isOpen: false, prompt: null })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Template Text:</h4>
                  <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                    {promptModal.prompt.template_text}
                  </pre>
                </div>

                {promptModal.prompt.json_prefix && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">JSON Prefix:</h4>
                    <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                      {promptModal.prompt.json_prefix}
                    </pre>
                  </div>
                )}

                {promptModal.prompt.json_suffix && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">JSON Suffix:</h4>
                    <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                      {promptModal.prompt.json_suffix}
                    </pre>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t">
                  <span>Version {promptModal.prompt.version}</span>
                  <span>Uses placeholder: {promptModal.prompt.use_placeholder ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Generation Result</h3>
            
            <div className="space-y-4">
              {/* Star Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating (1-5 stars)</label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRatingModal(prev => ({ ...prev, rating: star }))}
                      className={`text-2xl ${
                        star <= ratingModal.rating 
                          ? 'text-yellow-400' 
                          : 'text-gray-300 hover:text-yellow-200'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {ratingModal.rating === 0 && 'Click to rate'}
                  {ratingModal.rating === 1 && 'Poor'}
                  {ratingModal.rating === 2 && 'Fair'}
                  {ratingModal.rating === 3 && 'Good'}
                  {ratingModal.rating === 4 && 'Very Good'}
                  {ratingModal.rating === 5 && 'Excellent'}
                </p>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment (optional)
                </label>
                <textarea
                  value={ratingModal.comment}
                  onChange={(e) => setRatingModal(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="What did you think about this result? Any specific feedback?"
                  className="input-field h-24 resize-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelRating}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRating}
                disabled={ratingModal.rating === 0}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 