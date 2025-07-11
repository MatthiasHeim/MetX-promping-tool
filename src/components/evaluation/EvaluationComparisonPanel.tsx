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
  Model
} from '../../types/database'

interface EvaluationComparisonPanelProps {
  results: GenerationResult[]
  className?: string
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
}

export function EvaluationComparisonPanel({ results, className = '' }: EvaluationComparisonPanelProps) {
  const [evaluationState, setEvaluationState] = useState<BatchEvaluationState>({
    isRunning: false,
    summary: null,
    progress: null,
    error: null,
    testCasesCount: 0,
    judgePrompts: [],
    models: [],
    selectedJudgePromptId: null,
    selectedJudgeModelId: null
  })

  const [selectedPromptModel, setSelectedPromptModel] = useState<{
    promptId: string
    modelId: string
  } | null>(null)

  // Load test cases count and judge configuration on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [count, judgePrompts, models] = await Promise.all([
          EvaluationTestCaseService.getTestCaseCount(),
          PromptService.fetchPromptsByType('judge'),
          ModelService.fetchModels()
        ])
        
        setEvaluationState(prev => ({
          ...prev,
          testCasesCount: count,
          judgePrompts,
          models,
          selectedJudgePromptId: judgePrompts.length > 0 ? judgePrompts[0].id : null,
          selectedJudgeModelId: models.length > 0 ? models[0].id : null
        }))
      } catch (error) {
        console.error('Error loading evaluation data:', error)
      }
    }
    
    loadData()
  }, [])

  // Set default selection based on first result
  useEffect(() => {
    if (results.length > 0 && !selectedPromptModel) {
      setSelectedPromptModel({
        promptId: results[0].prompt_id,
        modelId: results[0].model_id
      })
    }
  }, [results, selectedPromptModel])

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
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBackground = (score: number) => {
    if (score >= 8) return 'bg-green-100'
    if (score >= 6) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const getProgressBarColor = (score: number) => {
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const uniquePromptModels = Array.from(
    new Set(results.map(r => `${r.prompt_id}:${r.model_id}`))
  ).map(combo => {
    const [promptId, modelId] = combo.split(':')
    return { promptId, modelId }
  })

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Batch Evaluation Suite</h3>
          <p className="text-sm text-gray-600 mt-1">
            Test your prompt and model against {evaluationState.testCasesCount} evaluation cases
          </p>
        </div>
        
        {!evaluationState.isRunning && !evaluationState.summary && (
          <button
            onClick={handleStartEvaluation}
            disabled={!selectedPromptModel || evaluationState.testCasesCount === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Run Evaluation Suite
          </button>
        )}
      </div>

      {/* Prompt/Model Selection */}
      {uniquePromptModels.length > 1 && !evaluationState.isRunning && !evaluationState.summary && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Prompt/Model Combination to Evaluate:
          </label>
          <div className="space-y-2">
            {uniquePromptModels.map(({ promptId, modelId }) => (
              <label key={`${promptId}:${modelId}`} className="flex items-center">
                <input
                  type="radio"
                  name="promptModel"
                  value={`${promptId}:${modelId}`}
                  checked={selectedPromptModel?.promptId === promptId && selectedPromptModel?.modelId === modelId}
                  onChange={() => setSelectedPromptModel({ promptId, modelId })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  {/* You would typically display prompt name and model name here */}
                  Prompt ID: {promptId.slice(0, 8)}... / Model: {modelId}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Judge Configuration */}
      {!evaluationState.isRunning && !evaluationState.summary && (
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
                <option value="">Default Judge Model (Claude 4 Sonnet)</option>
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
              <h4 className="text-md font-semibold text-gray-900 mb-3">Individual Test Results</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {evaluationState.summary.results.map((result, index) => (
                  <div key={result.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Test Case {index + 1}</div>
                      {result.comparison_details && (
                        <div className="text-xs text-gray-600 mt-1 truncate">
                          {result.comparison_details.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                    <div className={`text-right ${
                      result.comparison_score !== null 
                        ? getScoreColor(result.comparison_score)
                        : 'text-gray-500'
                    }`}>
                      <div className="text-lg font-semibold">
                        {result.comparison_score !== null 
                          ? `${result.comparison_score}/10`
                          : 'Failed'
                        }
                      </div>
                    </div>
                  </div>
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