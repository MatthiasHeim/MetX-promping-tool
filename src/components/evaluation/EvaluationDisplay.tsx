import React from 'react'
import type { EvaluationResult } from '../../services/evaluation/EvaluationService'

interface EvaluationDisplayProps {
  evaluation: EvaluationResult
  className?: string
}

export function EvaluationDisplay({ evaluation, className = '' }: EvaluationDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBackground = (score: number) => {
    if (score >= 0.8) return 'bg-green-100'
    if (score >= 0.6) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const formatScore = (score: number) => `${(score * 100).toFixed(1)}%`

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">
          Automated Evaluation
        </h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBackground(evaluation.overallScore)} ${getScoreColor(evaluation.overallScore)}`}>
          Overall: {formatScore(evaluation.overallScore)}
        </div>
      </div>

      {/* Overall Rationale */}
      <p className="text-sm text-gray-600 mb-4">
        {evaluation.rationale}
      </p>

      {/* Detailed Criteria */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Parameter Completeness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Parameter Completeness
            </span>
            <span className={`text-sm font-semibold ${getScoreColor(evaluation.criteria.parameterCompleteness.score)}`}>
              {formatScore(evaluation.criteria.parameterCompleteness.score)}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {evaluation.criteria.parameterCompleteness.rationale}
          </p>
          {evaluation.criteria.parameterCompleteness.foundParameters.length > 0 && (
            <div className="text-xs">
              <span className="text-gray-600">Found: </span>
              <span className="text-green-600">
                {evaluation.criteria.parameterCompleteness.foundParameters.join(', ')}
              </span>
            </div>
          )}
          {evaluation.criteria.parameterCompleteness.missingParameters.length > 0 && (
            <div className="text-xs">
              <span className="text-gray-600">Missing: </span>
              <span className="text-red-600">
                {evaluation.criteria.parameterCompleteness.missingParameters.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Structure Quality */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              JSON Structure
            </span>
            <span className={`text-sm font-semibold ${getScoreColor(evaluation.criteria.structureQuality.score)}`}>
              {formatScore(evaluation.criteria.structureQuality.score)}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {evaluation.criteria.structureQuality.rationale}
          </p>
          {evaluation.criteria.structureQuality.hasValidStructure && (
            <div className="text-xs text-green-600">
              ✓ Valid MetX structure detected
            </div>
          )}
          {evaluation.criteria.structureQuality.missingFields.length > 0 && (
            <div className="text-xs">
              <span className="text-gray-600">Missing fields: </span>
              <span className="text-red-600">
                {evaluation.criteria.structureQuality.missingFields.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Region Accuracy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Region Accuracy
            </span>
            <span className={`text-sm font-semibold ${getScoreColor(evaluation.criteria.regionAccuracy.score)}`}>
              {formatScore(evaluation.criteria.regionAccuracy.score)}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {evaluation.criteria.regionAccuracy.rationale}
          </p>
          {evaluation.criteria.regionAccuracy.requestedRegion && (
            <div className="text-xs">
              <span className="text-gray-600">Requested: </span>
              <span className="text-blue-600">
                {evaluation.criteria.regionAccuracy.requestedRegion}
              </span>
            </div>
          )}
          {evaluation.criteria.regionAccuracy.generatedRegion && (
            <div className="text-xs">
              <span className="text-gray-600">Generated: </span>
              <span className={evaluation.criteria.regionAccuracy.isMatch ? 'text-green-600' : 'text-red-600'}>
                {evaluation.criteria.regionAccuracy.generatedRegion}
              </span>
            </div>
          )}
        </div>

        {/* Cost Efficiency */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Cost Efficiency
            </span>
            <span className={`text-sm font-semibold ${getScoreColor(evaluation.criteria.costEfficiency.score)}`}>
              {formatScore(evaluation.criteria.costEfficiency.score)}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {evaluation.criteria.costEfficiency.rationale}
          </p>
        </div>

        {/* Performance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Performance
            </span>
            <span className={`text-sm font-semibold ${getScoreColor(evaluation.criteria.performance.score)}`}>
              {formatScore(evaluation.criteria.performance.score)}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {evaluation.criteria.performance.rationale}
          </p>
        </div>
      </div>

      {/* Timestamp */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Evaluated at {new Date(evaluation.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  )
} 