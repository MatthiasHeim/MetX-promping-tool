import React, { useState } from 'react'
import type { EvaluationResult } from '../../services/evaluation/EvaluationService'

interface EvaluationDisplayProps {
  evaluation: EvaluationResult
  className?: string
}

interface TooltipProps {
  content: string
  children: React.ReactNode
}

function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-10 w-80 p-3 text-sm text-white bg-gray-900 rounded-lg shadow-lg -top-2 left-6 transform -translate-y-full">
          <div className="relative">
            {content}
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoIcon({ className = "" }: { className?: string }) {
  return (
    <svg 
      className={`w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help ${className}`} 
      fill="currentColor" 
      viewBox="0 0 20 20"
    >
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  )
}

export function EvaluationDisplay({ evaluation, className = '' }: EvaluationDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBackground = (score: number) => {
    if (score >= 0.8) return 'bg-green-50 border-green-200'
    if (score >= 0.6) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const getProgressBarColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500'
    if (score >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const formatScore = (score: number) => `${(score * 100).toFixed(1)}%`

  const tooltipContent = {
    parameterCompleteness: "Checks if the generated JSON contains the weather parameters explicitly mentioned in your request. If you don't specify any parameters (like 'temperature' or 'wind'), you automatically get 100% since the model can choose appropriate parameters for your use case.",
    
    structureQuality: "Evaluates whether the generated JSON follows the correct MetX dashboard format with required fields like 'layers'. Also checks for valid JSON structure that can be processed by the MetX system.",
    
    layerCount: "Measures the richness of the generated dashboard by counting weather layers. 3+ layers = 100% (excellent variety), 2 layers = 50% (adequate), 1 layer = 0% (too simple). More layers provide better weather insights.",
    
    costEfficiency: "Evaluates the API cost per generation. Target is ≤0.10 CHF per request. Lower costs get higher scores: ≤0.05 CHF = 100%, ≤0.10 CHF = 80%, costs above 0.20 CHF score poorly.",
    
    performance: "Measures response time from request to completion. Target is <60 seconds. Faster responses score higher: ≤2s = 100%, ≤5s = 80%, ≤15s = 60%, >60s scores very low."
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Automated Evaluation
            </h3>
            <Tooltip content="Comprehensive automated assessment of the generated weather dashboard across multiple quality dimensions.">
              <InfoIcon />
            </Tooltip>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-semibold border ${getScoreBackground(evaluation.overallScore)} ${getScoreColor(evaluation.overallScore)}`}>
            Overall Score: {formatScore(evaluation.overallScore)}
          </div>
        </div>
        
        {/* Overall Score Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Overall Quality</span>
            <span>{formatScore(evaluation.overallScore)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(evaluation.overallScore)}`}
              style={{ width: `${evaluation.overallScore * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Detailed Criteria Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Parameter Completeness */}
          <div className={`p-4 rounded-lg border-2 ${getScoreBackground(evaluation.criteria.parameterCompleteness.score)}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">Parameter Completeness</span>
                <Tooltip content={tooltipContent.parameterCompleteness}>
                  <InfoIcon />
                </Tooltip>
              </div>
              <span className={`text-lg font-bold ${getScoreColor(evaluation.criteria.parameterCompleteness.score)}`}>
                {formatScore(evaluation.criteria.parameterCompleteness.score)}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(evaluation.criteria.parameterCompleteness.score)}`}
                style={{ width: `${evaluation.criteria.parameterCompleteness.score * 100}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              {evaluation.criteria.parameterCompleteness.rationale}
            </p>
            
            {evaluation.criteria.parameterCompleteness.foundParameters.length > 0 && (
              <div className="text-sm mb-1">
                <span className="text-gray-700 font-medium">Found: </span>
                <span className="text-green-700 bg-green-100 px-2 py-1 rounded">
                  {evaluation.criteria.parameterCompleteness.foundParameters.join(', ')}
                </span>
              </div>
            )}
            
            {evaluation.criteria.parameterCompleteness.missingParameters.length > 0 && (
              <div className="text-sm">
                <span className="text-gray-700 font-medium">Missing: </span>
                <span className="text-red-700 bg-red-100 px-2 py-1 rounded">
                  {evaluation.criteria.parameterCompleteness.missingParameters.join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* JSON Structure Quality */}
          <div className={`p-4 rounded-lg border-2 ${getScoreBackground(evaluation.criteria.structureQuality.score)}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">JSON Structure</span>
                <Tooltip content={tooltipContent.structureQuality}>
                  <InfoIcon />
                </Tooltip>
              </div>
              <span className={`text-lg font-bold ${getScoreColor(evaluation.criteria.structureQuality.score)}`}>
                {formatScore(evaluation.criteria.structureQuality.score)}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(evaluation.criteria.structureQuality.score)}`}
                style={{ width: `${evaluation.criteria.structureQuality.score * 100}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              {evaluation.criteria.structureQuality.rationale}
            </p>
            
            {evaluation.criteria.structureQuality.hasValidStructure && (
              <div className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded mb-1">
                ✓ Valid MetX structure detected
              </div>
            )}
            
            {evaluation.criteria.structureQuality.missingFields.length > 0 && (
              <div className="text-sm">
                <span className="text-gray-700 font-medium">Missing fields: </span>
                <span className="text-red-700 bg-red-100 px-2 py-1 rounded">
                  {evaluation.criteria.structureQuality.missingFields.join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Layer Count */}
          <div className={`p-4 rounded-lg border-2 ${getScoreBackground(evaluation.criteria.layerCount.score)}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">Layer Richness</span>
                <Tooltip content={tooltipContent.layerCount}>
                  <InfoIcon />
                </Tooltip>
              </div>
              <span className={`text-lg font-bold ${getScoreColor(evaluation.criteria.layerCount.score)}`}>
                {formatScore(evaluation.criteria.layerCount.score)}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(evaluation.criteria.layerCount.score)}`}
                style={{ width: `${evaluation.criteria.layerCount.score * 100}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              {evaluation.criteria.layerCount.rationale}
            </p>
            
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-700 font-medium">Layers:</span>
                <span className={`text-2xl font-bold ${evaluation.criteria.layerCount.layerCount >= 3 ? 'text-green-600' : evaluation.criteria.layerCount.layerCount >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {evaluation.criteria.layerCount.layerCount}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                (3+ = Excellent, 2 = Good, 1 = Poor)
              </div>
            </div>
          </div>

          {/* Performance & Cost Efficiency Combined */}
          <div className="space-y-4">
            {/* Cost Efficiency */}
            <div className={`p-4 rounded-lg border-2 ${getScoreBackground(evaluation.criteria.costEfficiency.score)}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">Cost Efficiency</span>
                  <Tooltip content={tooltipContent.costEfficiency}>
                    <InfoIcon />
                  </Tooltip>
                </div>
                <span className={`text-lg font-bold ${getScoreColor(evaluation.criteria.costEfficiency.score)}`}>
                  {formatScore(evaluation.criteria.costEfficiency.score)}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(evaluation.criteria.costEfficiency.score)}`}
                  style={{ width: `${evaluation.criteria.costEfficiency.score * 100}%` }}
                ></div>
              </div>
              
              <p className="text-sm text-gray-600">
                {evaluation.criteria.costEfficiency.rationale}
              </p>
            </div>

            {/* Performance */}
            <div className={`p-4 rounded-lg border-2 ${getScoreBackground(evaluation.criteria.performance.score)}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">Performance</span>
                  <Tooltip content={tooltipContent.performance}>
                    <InfoIcon />
                  </Tooltip>
                </div>
                <span className={`text-lg font-bold ${getScoreColor(evaluation.criteria.performance.score)}`}>
                  {formatScore(evaluation.criteria.performance.score)}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(evaluation.criteria.performance.score)}`}
                  style={{ width: `${evaluation.criteria.performance.score * 100}%` }}
                ></div>
              </div>
              
              <p className="text-sm text-gray-600">
                {evaluation.criteria.performance.rationale}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Evaluation Summary</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              {evaluation.rationale}
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Evaluated at {new Date(evaluation.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 