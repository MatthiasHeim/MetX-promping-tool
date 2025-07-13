/**
 * EvaluationService - Automated evaluation system for MetX generation results
 * 
 * This service provides comprehensive scoring and analysis of AI-generated
 * MetX dashboard configurations based on multiple criteria including:
 * - Weather parameter completeness
 * - JSON structure quality
 * - Regional accuracy
 * - Cost efficiency
 * - Performance metrics
 */

import { processDashboardForEvaluation } from '../../utils/dashboardProcessing'

export interface GenerationResult {
  model_id: string
  user_input: string
  generated_json: any // Raw LLM output
  final_json?: any // Complete JSON with prefix/suffix applied
  cost_chf: number
  latency_ms: number
}

export interface ParameterCompletenessResult {
  score: number
  foundParameters: string[]
  missingParameters: string[]
  rationale: string
}

export interface StructureQualityResult {
  score: number
  hasValidStructure: boolean
  requiredFields: string[]
  missingFields: string[]
  rationale: string
}

export interface LayerCountResult {
  score: number
  layerCount: number
  rationale: string
}

export interface EvaluationCriteria {
  parameterCompleteness: ParameterCompletenessResult
  structureQuality: StructureQualityResult
  layerCount: LayerCountResult
  costEfficiency: {
    score: number
    rationale: string
  }
  performance: {
    score: number
    rationale: string
  }
}

export interface EvaluationResult {
  overallScore: number
  criteria: EvaluationCriteria
  rationale: string
  timestamp: string
}

export class EvaluationService {
  // Weather parameter dictionaries for comprehensive matching
  private static readonly WEATHER_PARAMETERS = [
    // Basic parameters
    'temperature', 'temp', 'precipitation', 'precip', 'rain', 'snow',
    'wind', 'humidity', 'pressure', 'visibility', 'clouds',
    
    // Aviation specific
    'METAR', 'TAF', 'turbulence', 'icing', 'convection',
    
    // Marine
    'wave', 'tide', 'current', 'sea temperature',
    
    // Agriculture
    'soil moisture', 'evapotranspiration', 'growing degree days',
    
    // Energy
    'solar radiation', 'UV index', 'wind power',
    
    // Advanced
    'lightning', 'hail', 'tornado', 'cyclone', 'frost'
  ]

  private static readonly PARAMETER_SYNONYMS: Record<string, string[]> = {
    'temperature': ['temp', 'thermal', 'heat'],
    'precipitation': ['precip', 'rainfall', 'snowfall'],
    'wind': ['wind speed', 'wind direction', 'gusts'],
    'humidity': ['moisture', 'relative humidity'],
    'pressure': ['atmospheric pressure', 'barometric pressure'],
    'visibility': ['vis', 'visual range'],
    'clouds': ['cloud cover', 'cloudiness', 'ceiling']
  }

  private static readonly REQUIRED_METX_FIELDS = [
    'layers', 'region'
  ]

  /**
   * Evaluates how well the generated JSON contains the weather parameters
   * requested in the user input
   */
  static evaluateWeatherParameterCompleteness(
    userRequest: string,
    generatedJson: any,
    finalJson?: any
  ): ParameterCompletenessResult {
    const requestedParameters = this.extractWeatherParameters(userRequest)
    
    // Use complete JSON with prefix/suffix if available, otherwise fall back to raw output
    const jsonToAnalyze = finalJson || generatedJson
    const foundParameters = this.findParametersInJson(jsonToAnalyze, requestedParameters)
    const missingParameters = requestedParameters.filter(param => !foundParameters.includes(param))
    
    const score = requestedParameters.length > 0 
      ? foundParameters.length / requestedParameters.length 
      : 1.0

    let rationale = ''
    if (score >= 0.9) {
      rationale = 'All requested weather parameters found in generated JSON'
    } else if (score >= 0.7) {
      rationale = `Most requested parameters found. Missing: ${missingParameters.join(', ')}`
    } else if (score >= 0.5) {
      rationale = `Some requested parameters found. Missing: ${missingParameters.join(', ')}`
    } else {
      rationale = `Missing requested parameters: ${missingParameters.join(', ')}`
    }

    return {
      score,
      foundParameters,
      missingParameters,
      rationale
    }
  }

  /**
   * Evaluates the structural quality and completeness of the generated JSON
   * according to MetX dashboard standards. Focus is on uploadability rather than specific schema.
   */
  static evaluateJsonStructureQuality(generatedJson: any, finalJson?: any): StructureQualityResult {
    const requiredFields: string[] = []
    const missingFields: string[] = []
    
    // ALWAYS prioritize final_json if available (complete JSON with prefix/suffix)
    // This is the actual JSON that will be used by MetX
    let jsonToAnalyze = finalJson || generatedJson
    const isUsingFinalJson = !!finalJson
    
    // Process the dashboard through validation to ensure it's MetX-ready
    let dashboardProcessingResult = null
    if (jsonToAnalyze && typeof jsonToAnalyze === 'object') {
      try {
        dashboardProcessingResult = processDashboardForEvaluation(jsonToAnalyze)
        // Use the processed/fixed dashboard for analysis
        jsonToAnalyze = dashboardProcessingResult.dashboard
      } catch (error) {
        console.warn('Dashboard processing failed during evaluation:', error)
        // Continue with original JSON if processing fails
      }
    }
    
    // Check if the JSON is valid first (basic JSON validity)
    let isValidJson = false
    try {
      if (jsonToAnalyze !== null && jsonToAnalyze !== undefined) {
        // If it's already parsed, it's valid. If it's a string, try to parse it.
        if (typeof jsonToAnalyze === 'string') {
          JSON.parse(jsonToAnalyze)
        }
        isValidJson = true
      }
    } catch {
      isValidJson = false
    }
    
    // Check for MetX-specific structure (only if JSON is valid)
    const hasMetXStructure = isValidJson ? this.hasValidMetXStructure(jsonToAnalyze) : false
    
    // For uploadability check, if it's a valid MetX structure, we don't need to enforce specific fields
    // The goal is to verify it can be uploaded, not to enforce a rigid schema
    if (isValidJson && hasMetXStructure) {
      // Mark as having all required fields if it's a valid MetX structure
      requiredFields.push(...this.REQUIRED_METX_FIELDS)
    } else if (isValidJson) {
      // Extract all available fields from the JSON for legacy field checking
      const availableFields = this.extractAllFields(jsonToAnalyze)
      
      // Check traditional required fields only for non-MetX structures
      for (const field of this.REQUIRED_METX_FIELDS) {
        if (availableFields.includes(field)) {
          requiredFields.push(field)
        } else {
          missingFields.push(field)
        }
      }
    } else {
      // Invalid JSON - all fields are missing
      missingFields.push(...this.REQUIRED_METX_FIELDS)
    }

    // Calculate score based on uploadability
    let score = 0
    
    if (!isValidJson) {
      // Invalid JSON cannot be uploaded
      score = 0
    } else if (hasMetXStructure) {
      // Valid MetX structure is fully uploadable
      score = 1.0
    } else {
      // Valid JSON but unknown structure - partial score based on field completeness
      score = 0.5 + (requiredFields.length / this.REQUIRED_METX_FIELDS.length) * 0.5
    }

    // Generate appropriate rationale including dashboard validation results
    let rationale = ''
    let validationSuffix = ''
    
    // Include validation results if dashboard processing was performed
    if (dashboardProcessingResult) {
      const { validation, wasFixed, fixesSummary } = dashboardProcessingResult
      if (wasFixed) {
        validationSuffix = ` (${fixesSummary.join('; ')})`
      }
      if (validation.errors.length > 0) {
        validationSuffix += ` [Had ${validation.errors.length} validation errors that were fixed]`
      }
    }
    
    if (!isValidJson) {
      rationale = isUsingFinalJson 
        ? 'Invalid JSON structure - cannot be uploaded to MetX'
        : 'Invalid JSON structure in raw LLM output'
    } else if (hasMetXStructure) {
      rationale = `Valid MetX JSON structure - ready for upload${validationSuffix}`
    } else if (score >= 0.7) {
      rationale = `Valid JSON with most required fields${missingFields.length > 0 ? `, missing: ${missingFields.join(', ')}` : ''}${validationSuffix}`
    } else {
      rationale = `Valid JSON but missing required fields: ${missingFields.join(', ')}${validationSuffix}`
    }

    const result: StructureQualityResult = {
      score,
      hasValidStructure: hasMetXStructure,
      requiredFields,
      missingFields,
      rationale
    }
    return result
  }

  /**
   * Evaluates the number of layers generated by the LLM
   * 3+ layers = 100%, 2 layers = 50%, 1 layer = 0%
   */
  static evaluateLayerCount(generatedJson: any, finalJson?: any): LayerCountResult {
    // Use complete JSON with prefix/suffix if available, otherwise fall back to raw output
    const jsonToAnalyze = finalJson || generatedJson
    
    let layerCount = 0
    
    // Try to extract layer count from different possible structures
    if (Array.isArray(jsonToAnalyze)) {
      // Raw array of layers
      layerCount = jsonToAnalyze.length
    } else if (jsonToAnalyze && jsonToAnalyze.layers && Array.isArray(jsonToAnalyze.layers)) {
      // Complete JSON with layers array
      layerCount = jsonToAnalyze.layers.length
    } else if (jsonToAnalyze && typeof jsonToAnalyze === 'object') {
      // Check if it's a MetX dashboard structure with nested layers
      layerCount = this.countMetXLayers(jsonToAnalyze)
      
      // If no MetX layers found, treat as single layer object
      if (layerCount === 0) {
        layerCount = 1
      }
    }
    
    // Calculate score based on layer count
    let score = 0
    if (layerCount >= 3) {
      score = 1.0 // 100% for 3+ layers
    } else if (layerCount === 2) {
      score = 0.5 // 50% for 2 layers
    } else if (layerCount === 1) {
      score = 0.0 // 0% for 1 layer
    } else {
      score = 0.0 // 0% for no layers
    }

    let rationale = ''
    if (layerCount >= 3) {
      rationale = `Excellent layer count: ${layerCount} layers generated`
    } else if (layerCount === 2) {
      rationale = `Good layer count: ${layerCount} layers generated`
    } else if (layerCount === 1) {
      rationale = `Poor layer count: only ${layerCount} layer generated`
    } else {
      rationale = 'No layers found in generated output'
    }

    return {
      score,
      layerCount,
      rationale
    }
  }

  /**
   * Generates a comprehensive evaluation combining all criteria
   */
  static generateOverallEvaluation(generationResult: GenerationResult): EvaluationResult {
    const parameterCompleteness = this.evaluateWeatherParameterCompleteness(
      generationResult.user_input,
      generationResult.generated_json,
      generationResult.final_json
    )

    const structureQuality = this.evaluateJsonStructureQuality(
      generationResult.generated_json,
      generationResult.final_json
    )

    const layerCount = this.evaluateLayerCount(
      generationResult.generated_json,
      generationResult.final_json
    )

    const costEfficiency = {
      score: this.calculateCostEfficiencyScore(generationResult.cost_chf),
      rationale: this.getCostEfficiencyRationale(generationResult.cost_chf)
    }

    const performance = {
      score: this.calculatePerformanceScore(generationResult.latency_ms),
      rationale: this.getPerformanceRationale(generationResult.latency_ms)
    }

    // Weighted overall score
    const weights = {
      parameterCompleteness: 0.3,
      structureQuality: 0.25,
      layerCount: 0.2,
      costEfficiency: 0.15,
      performance: 0.1
    }

    const overallScore = 
      parameterCompleteness.score * weights.parameterCompleteness +
      structureQuality.score * weights.structureQuality +
      layerCount.score * weights.layerCount +
      costEfficiency.score * weights.costEfficiency +
      performance.score * weights.performance

    const rationale = `Overall evaluation based on: parameter completeness (${(parameterCompleteness.score * 100).toFixed(1)}%), ` +
      `structure quality (${(structureQuality.score * 100).toFixed(1)}%), ` +
      `layer count (${(layerCount.score * 100).toFixed(1)}%), ` +
      `cost efficiency (${(costEfficiency.score * 100).toFixed(1)}%), ` +
      `and performance (${(performance.score * 100).toFixed(1)}%)`

    return {
      overallScore,
      criteria: {
        parameterCompleteness,
        structureQuality,
        layerCount,
        costEfficiency,
        performance
      },
      rationale,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Extracts weather parameters from user request text
   */
  static extractWeatherParameters(text: string): string[] {
    const lowerText = text.toLowerCase()
    const foundParameters: string[] = []

    // Check for canonical parameters first (avoid duplicates like temp/temperature)
    const canonicalParams = ['temperature', 'precipitation', 'wind', 'humidity', 'pressure', 'visibility', 'clouds']
    
    for (const canonical of canonicalParams) {
      const synonyms = this.PARAMETER_SYNONYMS[canonical] || []
      const allVariations = [canonical, ...synonyms]
      
      for (const variation of allVariations) {
        if (lowerText.includes(variation.toLowerCase())) {
          if (!foundParameters.includes(canonical)) {
            foundParameters.push(canonical)
          }
          break // Found one variation, no need to check others for this canonical
        }
      }
    }

    // Check for other specific parameters (aviation, marine, etc.)
    const otherParams = this.WEATHER_PARAMETERS.filter(param => 
      !canonicalParams.includes(param) && 
      !Object.values(this.PARAMETER_SYNONYMS).flat().includes(param)
    )
    
    for (const parameter of otherParams) {
      if (lowerText.includes(parameter.toLowerCase())) {
        // Keep original case for aviation parameters like METAR, TAF
        if (['METAR', 'TAF'].includes(parameter)) {
          foundParameters.push(parameter)
        } else {
          foundParameters.push(parameter.toLowerCase())
        }
      }
    }

    return foundParameters
  }

  /**
   * Finds weather parameters in generated JSON structure
   */
  static findParametersInJson(json: any, parametersToFind: string[]): string[] {
    const jsonString = JSON.stringify(json).toLowerCase()
    const foundParameters: string[] = []

    for (const parameter of parametersToFind) {
      if (jsonString.includes(parameter.toLowerCase())) {
        foundParameters.push(parameter)
      }
    }

    return foundParameters
  }

  /**
   * Calculates cost efficiency score (0-1) based on CHF cost
   */
  static calculateCostEfficiencyScore(costChf: number): number {
    // Perfect score for very low cost (under 1 cent)
    if (costChf < 0.01) return 1.0
    // Target cost: ≤ 0.10 CHF (from PRD)
    if (costChf <= 0.05) return 0.9
    if (costChf <= 0.10) return 0.8
    if (costChf <= 0.15) return 0.6
    if (costChf <= 0.20) return 0.4
    return 0.2
  }

  /**
   * Calculates performance score (0-1) based on latency in ms
   */
  static calculatePerformanceScore(latencyMs: number): number {
    // Target latency: < 60s (from PRD)
    if (latencyMs <= 2000) return 1.0    // ≤ 2s: excellent
    if (latencyMs <= 5000) return 0.8    // ≤ 5s: good
    if (latencyMs <= 15000) return 0.6   // ≤ 15s: acceptable
    if (latencyMs <= 30000) return 0.4   // ≤ 30s: slow
    if (latencyMs <= 60000) return 0.2   // ≤ 60s: very slow
    return 0.1                           // > 60s: unacceptable
  }

  // Helper methods

  private static hasValidMetXStructure(json: any): boolean {
    // First check if json is valid
    if (!json || typeof json !== 'object') {
      return false
    }

    // Check for complete MetX dashboard structure (the most important one!)
    const hasCompleteMetXStructure = !!(
      json.tabs && 
      Array.isArray(json.tabs) && 
      json.tabs.length > 0 &&
      json.tabs.some((tab: any) => 
        tab.maps && 
        Array.isArray(tab.maps) && 
        tab.maps.some((map: any) => 
          map.layers && 
          Array.isArray(map.layers) && 
          map.layers.length > 0
        )
      )
    )

    // Check for other valid MetX structures
    const hasBasicStructure = !!(
      json.metx_dashboard || 
      json.aviation_dashboard || 
      json.config || 
      json.layers
    )

    // Also check if it's a valid array of layer objects (common structure)
    const isValidLayerArray = Array.isArray(json) && json.length > 0 && 
      json.every(item => 
        item && 
        typeof item === 'object' && 
        (item.kind || item.type || item.parameter_unit || item.layer)
      )

    // Check if it's wrapped in a layers property
    const hasWrappedLayers = !!(json.layers && Array.isArray(json.layers) && json.layers.length > 0)

    return hasCompleteMetXStructure || hasBasicStructure || isValidLayerArray || hasWrappedLayers
  }

  /**
   * Counts weather layers in a MetX dashboard structure
   * Excludes background maps and other non-weather layers
   */
  private static countMetXLayers(json: any): number {
    if (!json || typeof json !== 'object') {
      return 0
    }

    let totalLayers = 0

    // Check if it's a MetX dashboard structure with tabs
    if (json.tabs && Array.isArray(json.tabs)) {
      json.tabs.forEach((tab: any) => {
        if (tab.maps && Array.isArray(tab.maps)) {
          tab.maps.forEach((map: any) => {
            if (map.layers && Array.isArray(map.layers)) {
              map.layers.forEach((layer: any) => {
                // Count layers that are not background maps
                if (layer.kind && layer.kind !== 'BackgroundMapDescription') {
                  totalLayers++
                }
              })
            }
          })
        }
      })
    }

    return totalLayers
  }

  private static extractAllFields(obj: any, prefix = ''): string[] {
    const fields: string[] = []
    
    if (typeof obj !== 'object' || obj === null) {
      return fields
    }

    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}.${key}` : key
      fields.push(key) // Add just the key name
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        fields.push(...this.extractAllFields(value, fieldName))
      }
    }

    return [...new Set(fields)]
  }



  private static getCostEfficiencyRationale(costChf: number): string {
    if (costChf < 0.01) return 'Perfect cost efficiency - under 1 cent'
    if (costChf <= 0.05) return 'Excellent cost efficiency'
    if (costChf <= 0.10) return 'Good cost efficiency within target'
    if (costChf <= 0.15) return 'Moderate cost, slightly above target'
    if (costChf <= 0.20) return 'High cost approaching limit'
    return 'Very high cost exceeding recommended limits'
  }

  private static getPerformanceRationale(latencyMs: number): string {
    if (latencyMs <= 2000) return 'Excellent response time'
    if (latencyMs <= 5000) return 'Good response time'
    if (latencyMs <= 15000) return 'Acceptable response time'
    if (latencyMs <= 30000) return 'Slow response time'
    if (latencyMs <= 60000) return 'Very slow response time'
    return 'Unacceptable response time exceeding 60s target'
  }
} 