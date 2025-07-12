import { useState, useEffect } from 'react'
import { BatchEvaluationService } from '../../services/evaluation/BatchEvaluationService'
import { EvaluationTestCaseService } from '../../services/evaluation/EvaluationTestCaseService'
import { PromptService } from '../../services/prompts/PromptService'
import { ModelService } from '../../services/models/ModelService'
import type { 
  BatchEvaluationSummary, 
  BatchEvaluationProgress, 
  GenerationResult,
  Prompt,
  Model,
  BatchEvaluationResult
} from '../../types/database'

interface EvaluationComparisonPanelProps {
  results?: GenerationResult[]
  className?: string
  selectedRunId?: string
  onEvaluationComplete?: () => void
}

interface BatchEvaluationState {
  isRunning: boolean
  summary: BatchEvaluationSummary | null
  progress: BatchEvaluationProgress | null
  error: string | null
  testCasesCount: number
  judgePrompts: Prompt[]
  models: Model[]
  selectedJudgePromptId: string | null
  selectedJudgeModelId: string | null
  availablePrompts: Prompt[]
  availableModels: Model[]
}

interface TestCaseResultProps {
  result: BatchEvaluationResult & { 
    evaluation_test_cases?: { name: string; user_prompt: string; expected_json: any }
    generated_json?: any
  }
  index: number
  getScoreColor: (score: number) => string
}

function TestCaseResult({ result, index, getScoreColor }: TestCaseResultProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const downloadJson = (json: any, filename: string) => {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Helper function to get location coordinates (simplified version from GenerationsView)
  const getLocationCoordinates = (_userInput: string) => {
    // Default to Switzerland for now - could be enhanced later
    return {
      center_lat: 47.3769,
      center_lng: 8.5417,
      zoom: 7,
      sw_lat: 45.8180,
      sw_lng: 5.9559,
      ne_lat: 47.8084,
      ne_lng: 10.4921
    }
  }

  // Construct complete dashboard JSON with prefix/suffix (for evaluation results we don't have the prompt details)
  const constructCompleteDashboard = (layers: any[], userPrompt: string) => {
    const locationCoords = getLocationCoordinates(userPrompt)
    
    // Use standard MetX dashboard template since we don't have access to custom prefix/suffix
    const dashboardTemplate = {
      "id": Math.floor(Math.random() * 100000),
      "title": "Generated Dashboard",
      "tab_active": Math.floor(Math.random() * 100000),
      "use_global_datetime": false,
      "global_datetime": {
        "is_relative": true,
        "is_series": false,
        "is_auto_time_refresh_on": false,
        "abs_start": new Date().toISOString(),
        "abs_end": new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        "rel_rounding_on": true,
        "rel_position": "now_with_15min_precision",
        "rel_rounding_direction": "backward",
        "rel_shift_on": true,
        "rel_start": "PT-15M",
        "rel_end": "P1D",
        "temporal_resolution": "PT3H",
        "fps": 10
      },
      "tabs": [{
        "id": Math.floor(Math.random() * 100000),
        "title": "Main View",
        "order": 1,
        "is_favorite": false,
        "datetime": {
          "is_relative": true,
          "is_series": false,
          "is_auto_time_refresh_on": false,
          "abs_start": new Date().toISOString(),
          "abs_end": new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          "rel_rounding_on": true,
          "rel_position": "now_with_15min_precision",
          "rel_rounding_direction": "backward",
          "rel_shift_on": true,
          "rel_start": "PT-15M",
          "rel_end": "P1D",
          "temporal_resolution": "PT3H",
          "fps": 10
        },
        "layouts": [{
          "gridCellLayout": {
            "gridColumnStart": 1,
            "gridColumnEnd": 97,
            "gridRowStart": 1,
            "gridRowEnd": 97
          },
          "type": "Map",
          "id_tool": Math.floor(Math.random() * 100000)
        }],
        "viewports": [{
          "kind": "ViewportFull",
          "center_lng": locationCoords.center_lng,
          "center_lat": locationCoords.center_lat,
          "zoom": locationCoords.zoom,
          "southWest_lng": locationCoords.sw_lng,
          "southWest_lat": locationCoords.sw_lat,
          "northEast_lng": locationCoords.ne_lng,
          "northEast_lat": locationCoords.ne_lat,
          "lastUpdatedBy": Math.floor(Math.random() * 100000)
        }],
        "maps": [{
          "id": Math.floor(Math.random() * 100000),
          "title": "Weather Map",
          "titleStyle": null,
          "time_offset_mins": 0,
          "legend_size": null,
          "map_projection": {
            "name": "mercator",
            "center": null,
            "parallels": null
          },
          "lod_bias": 0,
          "layers": layers,
          "drawing": null
        }],
        "country_plots": [],
        "energy_plots": [],
        "notes": [],
        "plots": [],
        "location_tables": [],
        "tephigrams": [],
        "weather_tables": []
      }],
      "id_account": 317,
      "time_created": new Date().toISOString(),
      "time_updated": new Date().toISOString()
    }
    
    return dashboardTemplate
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Header - Always visible */}
      <div 
        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              Test Case {index + 1}: {result.evaluation_test_cases?.name || 'Unknown Test'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {result.evaluation_test_cases?.user_prompt || 'No user prompt available'}
            </div>
            {result.comparison_details && !isExpanded && (
              <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                {result.comparison_details.substring(0, 120)}...
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <div className={`text-right ${
              result.comparison_score !== null 
                ? getScoreColor(result.comparison_score)
                : 'text-gray-500'
            }`}>
              <div className="text-lg font-semibold">
                {result.comparison_score === null 
                  ? 'Failed'
                  : result.comparison_score === 0
                  ? 'Parse Failed'
                  : `${result.comparison_score}/10`
                }
              </div>
              {result.comparison_score === 0 && (
                <div className="text-xs text-orange-600 mt-1">⚠️ Judge response parsing failed</div>
              )}
            </div>
            <div className="text-gray-400">
              {isExpanded ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          {/* Judge Evaluation Details */}
          {result.comparison_details && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Judge Evaluation:</h5>
              <div className="bg-white p-3 rounded border text-sm text-gray-700 whitespace-pre-wrap">
                {result.comparison_details}
              </div>
            </div>
          )}

          {/* Download Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadJson(
                { 
                  user_prompt: result.evaluation_test_cases?.user_prompt,
                  test_case_name: result.evaluation_test_cases?.name 
                }, 
                `test-case-${index + 1}-input.json`
              )}
              className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
            >
              Download Input
            </button>
            
            {/* Expected JSON buttons */}
            <button
              onClick={() => downloadJson(
                result.evaluation_test_cases?.expected_json || {}, 
                `test-case-${index + 1}-expected-layers.json`
              )}
              className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors"
            >
              Download Expected Layers
            </button>
            <button
              onClick={() => {
                const layers = result.evaluation_test_cases?.expected_json || []
                const dashboard = constructCompleteDashboard(
                  Array.isArray(layers) ? layers : [layers], 
                  result.evaluation_test_cases?.user_prompt || ''
                )
                downloadJson(dashboard, `test-case-${index + 1}-expected-dashboard.json`)
              }}
              className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors"
            >
              Download Expected Dashboard
            </button>
            
            {/* Generated JSON buttons */}
            <button
              onClick={() => downloadJson(
                result.generated_json || { error: "No generated JSON available" }, 
                `test-case-${index + 1}-generated-layers.json`
              )}
              className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded hover:bg-orange-200 transition-colors"
              disabled={!result.generated_json}
              title={result.generated_json ? "Download the AI-generated layers for this test case" : "No generated JSON available"}
            >
              Download Generated Layers
            </button>
            <button
              onClick={() => {
                if (result.generated_json) {
                  const layers = result.generated_json
                  const dashboard = constructCompleteDashboard(
                    Array.isArray(layers) ? layers : [layers], 
                    result.evaluation_test_cases?.user_prompt || ''
                  )
                  downloadJson(dashboard, `test-case-${index + 1}-generated-dashboard.json`)
                }
              }}
              className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded hover:bg-orange-200 transition-colors"
              disabled={!result.generated_json}
              title={result.generated_json ? "Download the complete dashboard with AI-generated layers" : "No generated JSON available"}
            >
              Download Generated Dashboard
            </button>
            
            <button
              onClick={() => downloadJson(
                {
                  score: result.comparison_score,
                  details: result.comparison_details,
                  judge_model: result.judge_model_id,
                  test_case: result.evaluation_test_cases?.name
                }, 
                `test-case-${index + 1}-evaluation.json`
              )}
              className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded hover:bg-purple-200 transition-colors"
            >
              Download Evaluation
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function EvaluationComparisonPanel({ results: _results, className = '', selectedRunId, onEvaluationComplete }: EvaluationComparisonPanelProps) {
  // Note: results parameter kept for compatibility but not used in current implementation
  const [evaluationState, setEvaluationState] = useState<BatchEvaluationState>({
    isRunning: false,
    summary: null,
    progress: null,
    error: null,
    testCasesCount: 0,
    judgePrompts: [],
    models: [],
    selectedJudgePromptId: null,
    selectedJudgeModelId: null,
    availablePrompts: [],
    availableModels: []
  })

  const [selectedPromptModel, setSelectedPromptModel] = useState<{
    promptId: string
    modelId: string
  } | null>(null)

  // Load test cases count and judge configuration on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [count, judgePrompts, allModels, generationPrompts] = await Promise.all([
          EvaluationTestCaseService.getTestCaseCount(),
          PromptService.fetchPromptsByType('judge'),
          ModelService.fetchModels(),
          PromptService.fetchPromptsByType('generation')
        ])
        
        // Find Gemini 2.5 Flash model, fallback to first model if not found
        const geminiFlashModel = allModels.find(m => m.id === 'google/gemini-2.5-flash')
        const defaultJudgeModelId = geminiFlashModel ? geminiFlashModel.id : (allModels.length > 0 ? allModels[0].id : null)
        
        setEvaluationState(prev => ({
          ...prev,
          testCasesCount: count,
          judgePrompts,
          models: allModels,
          selectedJudgePromptId: judgePrompts.length > 0 ? judgePrompts[0].id : null,
          selectedJudgeModelId: defaultJudgeModelId,
          availablePrompts: generationPrompts,
          availableModels: allModels
        }))
      } catch (error) {
        console.error('Error loading evaluation data:', error)
      }
    }
    
    loadData()
  }, [])

  // Load specific evaluation run when selectedRunId is provided
  useEffect(() => {
    if (selectedRunId) {
      const loadSelectedRun = async () => {
        try {
          const summary = await BatchEvaluationService.getBatchEvaluationSummary(selectedRunId)
          if (summary) {
            setEvaluationState(prev => ({
              ...prev,
              summary,
              isRunning: summary.status === 'running',
              progress: {
                run_id: summary.run_id,
                status: summary.status,
                completed_test_cases: summary.completed_test_cases,
                total_test_cases: summary.total_test_cases,
                current_test_case: undefined
              }
            }))
          }
        } catch (error) {
          console.error('Error loading selected evaluation run:', error)
          setEvaluationState(prev => ({
            ...prev,
            error: 'Failed to load evaluation run'
          }))
        }
      }
      
      loadSelectedRun()
    }
  }, [selectedRunId])

  // Set default selection based on available prompts and models
  useEffect(() => {
    if (evaluationState.availablePrompts.length > 0 && evaluationState.availableModels.length > 0 && !selectedPromptModel) {
      // Find Gemini 2.5 Flash model, fallback to first model if not found
      const geminiFlashModel = evaluationState.availableModels.find(m => m.id === 'google/gemini-2.5-flash')
      const defaultModelId = geminiFlashModel ? geminiFlashModel.id : evaluationState.availableModels[0].id
      
      setSelectedPromptModel({
        promptId: evaluationState.availablePrompts[0].id,
        modelId: defaultModelId
      })
    }
  }, [evaluationState.availablePrompts, evaluationState.availableModels, selectedPromptModel])

  const handleStartEvaluation = async () => {
    if (!selectedPromptModel) return

    setEvaluationState(prev => ({
      ...prev,
      isRunning: true,
      error: null,
      summary: null,
      progress: null
    }))

    try {
      const batchRun = await BatchEvaluationService.startBatchEvaluation({
        prompt_id: selectedPromptModel.promptId,
        model_id: selectedPromptModel.modelId,
        judge_prompt_id: evaluationState.selectedJudgePromptId || undefined,
        judge_model_id: evaluationState.selectedJudgeModelId || undefined,
        name: `Evaluation Run - ${new Date().toLocaleString()}`
      }, 'c99ade77-67a8-4b22-b2dd-824371f0cedd') // Use existing user ID

      // Poll for progress updates
      const pollInterval = setInterval(async () => {
        try {
          const summary = await BatchEvaluationService.getBatchEvaluationSummary(batchRun.id)
          if (summary) {
            setEvaluationState(prev => ({
              ...prev,
              summary,
              progress: {
                run_id: summary.run_id,
                status: summary.status,
                completed_test_cases: summary.completed_test_cases,
                total_test_cases: summary.total_test_cases,
                average_score: summary.average_score || undefined
              }
            }))

            if (summary.status === 'completed' || summary.status === 'failed' || summary.status === 'cancelled') {
              clearInterval(pollInterval)
              setEvaluationState(prev => ({ ...prev, isRunning: false }))
              if (summary.status === 'completed' && onEvaluationComplete) {
                onEvaluationComplete()
              }
            }
          }
        } catch (error) {
          console.error('Error polling evaluation progress:', error)
          clearInterval(pollInterval)
          setEvaluationState(prev => ({
            ...prev,
            isRunning: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }))
        }
      }, 2000) // Poll every 2 seconds

    } catch (error) {
      setEvaluationState(prev => ({
        ...prev,
        isRunning: false,
        error: error instanceof Error ? error.message : 'Failed to start evaluation'
      }))
    }
  }

  const getScoreColor = (score: number) => {
    if (score === 0) return 'text-gray-500' // Parsing failure
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBackground = (score: number) => {
    if (score === 0) return 'bg-gray-100' // Parsing failure
    if (score >= 8) return 'bg-green-100'
    if (score >= 6) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const getProgressBarColor = (score: number) => {
    if (score === 0) return 'bg-gray-400' // Parsing failure
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // No longer needed - using separate dropdowns instead of combinations

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedRunId ? 'Evaluation Results' : 'Batch Evaluation Suite'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {selectedRunId 
              ? 'Viewing detailed results from a previous evaluation run'
              : `Test your prompt and model against ${evaluationState.testCasesCount} evaluation cases`
            }
          </p>
        </div>
        
        {!selectedRunId && !evaluationState.isRunning && !evaluationState.summary && (
          <button
            onClick={handleStartEvaluation}
            disabled={!selectedPromptModel?.promptId || !selectedPromptModel?.modelId || evaluationState.testCasesCount === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Run Evaluation Suite
          </button>
        )}
      </div>

      {/* Generation Configuration */}
      {!selectedRunId && !evaluationState.isRunning && !evaluationState.summary && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Generation Configuration</h4>
          <p className="text-xs text-gray-600 mb-4">Select which prompt and model to evaluate against the test cases.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt to Evaluate:
              </label>
              <select
                value={selectedPromptModel?.promptId || ''}
                onChange={(e) => setSelectedPromptModel(prev => 
                  prev ? { ...prev, promptId: e.target.value } : { promptId: e.target.value, modelId: '' }
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Select a prompt...</option>
                {evaluationState.availablePrompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model to Evaluate:
              </label>
              <select
                value={selectedPromptModel?.modelId || ''}
                onChange={(e) => setSelectedPromptModel(prev => 
                  prev ? { ...prev, modelId: e.target.value } : { promptId: '', modelId: e.target.value }
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Select a model...</option>
                {evaluationState.availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Judge Configuration */}
      {!selectedRunId && !evaluationState.isRunning && !evaluationState.summary && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Judge Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Judge Prompt:
              </label>
              <select
                value={evaluationState.selectedJudgePromptId || ''}
                onChange={(e) => setEvaluationState(prev => ({
                  ...prev,
                  selectedJudgePromptId: e.target.value || null
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Default Judge Prompt</option>
                {evaluationState.judgePrompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Judge Model:
              </label>
              <select
                value={evaluationState.selectedJudgeModelId || ''}
                onChange={(e) => setEvaluationState(prev => ({
                  ...prev,
                  selectedJudgeModelId: e.target.value || null
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Default Judge Model (Gemini 2.5 Flash)</option>
                {evaluationState.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Configure which prompt template and model to use for evaluating the generated results against expected outputs.
          </p>
        </div>
      )}

      {/* Progress Display */}
      {evaluationState.isRunning && evaluationState.progress && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Evaluation Progress</span>
            <span className="text-sm text-gray-600">
              {evaluationState.progress.completed_test_cases} / {evaluationState.progress.total_test_cases}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(evaluationState.progress.completed_test_cases / evaluationState.progress.total_test_cases) * 100}%` 
              }}
            />
          </div>
          {evaluationState.progress.average_score !== undefined && (
            <div className="mt-2 text-sm text-gray-600">
              Current Average Score: {evaluationState.progress.average_score.toFixed(1)}/10
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {evaluationState.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Evaluation Error</h3>
              <div className="mt-2 text-sm text-red-700">{evaluationState.error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {evaluationState.summary && (
        <div className="space-y-6">
          {/* Overall Score Card */}
          <div className={`p-6 rounded-lg border-2 ${
            evaluationState.summary.average_score !== null 
              ? getScoreBackground(evaluationState.summary.average_score)
              : 'bg-gray-50'
          }`}>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2 ${
                evaluationState.summary.average_score !== null 
                  ? getScoreColor(evaluationState.summary.average_score)
                  : 'text-gray-500'
              }">
                {evaluationState.summary.average_score !== null 
                  ? `${evaluationState.summary.average_score.toFixed(1)}/10`
                  : 'N/A'
                }
              </div>
              <div className="text-lg font-semibold text-gray-900 mb-1">Average Evaluation Score</div>
              <div className="text-sm text-gray-600">
                Across {evaluationState.summary.completed_test_cases} test cases
              </div>
              
              {/* Progress bar for average score */}
              {evaluationState.summary.average_score !== null && (
                <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor(evaluationState.summary.average_score)}`}
                    style={{ width: `${(evaluationState.summary.average_score / 10) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Evaluation Details */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3">Evaluation Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Prompt:</span> {evaluationState.summary.prompt_name}
              </div>
              <div>
                <span className="font-medium text-gray-700">Model:</span> {evaluationState.summary.model_name}
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span> 
                <span className={`ml-1 px-2 py-1 rounded text-xs ${
                  evaluationState.summary.status === 'completed' ? 'bg-green-100 text-green-800' :
                  evaluationState.summary.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {evaluationState.summary.status}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Duration:</span> 
                {evaluationState.summary.duration_ms 
                  ? ` ${Math.round(evaluationState.summary.duration_ms / 1000)}s`
                  : ' In progress'
                }
              </div>
            </div>
          </div>

          {/* Individual Test Results */}
          {evaluationState.summary.results.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-md font-semibold text-gray-900">Individual Test Results</h4>
                {(() => {
                  const failedParsingCount = evaluationState.summary.results.filter(r => r.comparison_score === 0).length
                  return failedParsingCount > 0 ? (
                    <div className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      ⚠️ {failedParsingCount} parsing failure{failedParsingCount > 1 ? 's' : ''}
                    </div>
                  ) : null
                })()}
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {evaluationState.summary.results.map((result, index) => (
                  <TestCaseResult
                    key={result.id}
                    result={result}
                    index={index}
                    getScoreColor={getScoreColor}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => setEvaluationState(prev => ({ ...prev, summary: null, error: null }))}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 text-sm font-medium"
            >
              Run Another Evaluation
            </button>
            <button
              onClick={() => {
                // TODO: Implement export functionality
                console.log('Export results:', evaluationState.summary)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Export Results
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {evaluationState.testCasesCount === 0 && !evaluationState.isRunning && (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Test Cases Available</h3>
          <p className="text-gray-600 text-sm">
            Add test cases to the evaluation framework to start running batch evaluations.
          </p>
        </div>
      )}
    </div>
  )
}