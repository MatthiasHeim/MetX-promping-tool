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

export interface GenerationResult {
  model_id: string
  user_input: string
  generated_json: any
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

export interface RegionAccuracyResult {
  score: number
  requestedRegion: string | null
  generatedRegion: string | null
  isMatch: boolean
  rationale: string
}

export interface EvaluationCriteria {
  parameterCompleteness: ParameterCompletenessResult
  structureQuality: StructureQualityResult
  regionAccuracy: RegionAccuracyResult
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

  private static readonly RECOMMENDED_METX_FIELDS = [
    'timeRange', 'visualization', 'version'
  ]

  /**
   * Evaluates how well the generated JSON contains the weather parameters
   * requested in the user input
   */
  static evaluateWeatherParameterCompleteness(
    userRequest: string,
    generatedJson: any
  ): ParameterCompletenessResult {
    const requestedParameters = this.extractWeatherParameters(userRequest)
    const foundParameters = this.findParametersInJson(generatedJson, requestedParameters)
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
   * according to MetX dashboard standards
   */
  static evaluateJsonStructureQuality(generatedJson: any): StructureQualityResult {
    const requiredFields: string[] = []
    const missingFields: string[] = []
    
    // Check for MetX-specific structure
    const hasMetXStructure = this.hasValidMetXStructure(generatedJson)
    
    // Extract all available fields from the JSON
    const availableFields = this.extractAllFields(generatedJson)
    
    // Check required fields
    for (const field of this.REQUIRED_METX_FIELDS) {
      if (availableFields.includes(field)) {
        requiredFields.push(field)
      } else {
        missingFields.push(field)
      }
    }

    // Calculate score based on structure and field completeness
    let score = 0
    
    if (hasMetXStructure) {
      score += 0.4 // Base score for valid structure
    }
    
    // Score for required fields (60% of remaining score)
    const requiredFieldScore = this.REQUIRED_METX_FIELDS.length > 0
      ? (requiredFields.length / this.REQUIRED_METX_FIELDS.length) * 0.6
      : 0.6
    score += requiredFieldScore

    let rationale = ''
    if (score >= 0.8) {
      rationale = 'Well-structured MetX JSON with all required fields'
    } else if (score >= 0.6) {
      rationale = `Good structure but missing some fields: ${missingFields.join(', ')}`
    } else if (score >= 0.4) {
      rationale = `Valid structure but missing required fields: ${missingFields.join(', ')}`
    } else {
      rationale = 'Invalid or poorly structured JSON for MetX dashboard'
    }

    return {
      score,
      hasValidStructure: hasMetXStructure,
      requiredFields,
      missingFields,
      rationale
    }
  }

  /**
   * Evaluates how well the generated region matches the requested region
   */
  static evaluateRegionAccuracy(userRequest: string, generatedJson: any): RegionAccuracyResult {
    const requestedRegion = this.extractRegionFromRequest(userRequest)
    const generatedRegion = this.extractRegionFromJson(generatedJson)
    
    let score = 0
    let isMatch = false

    if (requestedRegion && generatedRegion) {
      isMatch = this.compareRegions(requestedRegion, generatedRegion)
      score = isMatch ? 1.0 : 0.0
    } else if (!requestedRegion && !generatedRegion) {
      // No region specified in either - neutral score
      score = 0.5
    } else if (!requestedRegion) {
      // No region requested but one was generated - slight positive
      score = 0.6
    } else {
      // Region requested but not generated - negative
      score = 0.2
    }

    const rationale = isMatch 
      ? `Requested region "${requestedRegion}" matches generated region "${generatedRegion}"`
      : requestedRegion && generatedRegion
        ? `Region mismatch: requested "${requestedRegion}", generated "${generatedRegion}"`
        : requestedRegion
          ? `Region "${requestedRegion}" was requested but not found in generated JSON`
          : 'No specific region mentioned in request'

    return {
      score,
      requestedRegion,
      generatedRegion,
      isMatch,
      rationale
    }
  }

  /**
   * Generates a comprehensive evaluation combining all criteria
   */
  static generateOverallEvaluation(generationResult: GenerationResult): EvaluationResult {
    const parameterCompleteness = this.evaluateWeatherParameterCompleteness(
      generationResult.user_input,
      generationResult.generated_json
    )

    const structureQuality = this.evaluateJsonStructureQuality(
      generationResult.generated_json
    )

    const regionAccuracy = this.evaluateRegionAccuracy(
      generationResult.user_input,
      generationResult.generated_json
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
      regionAccuracy: 0.2,
      costEfficiency: 0.15,
      performance: 0.1
    }

    const overallScore = 
      parameterCompleteness.score * weights.parameterCompleteness +
      structureQuality.score * weights.structureQuality +
      regionAccuracy.score * weights.regionAccuracy +
      costEfficiency.score * weights.costEfficiency +
      performance.score * weights.performance

    const rationale = `Overall evaluation based on: parameter completeness (${(parameterCompleteness.score * 100).toFixed(1)}%), ` +
      `structure quality (${(structureQuality.score * 100).toFixed(1)}%), ` +
      `region accuracy (${(regionAccuracy.score * 100).toFixed(1)}%), ` +
      `cost efficiency (${(costEfficiency.score * 100).toFixed(1)}%), ` +
      `and performance (${(performance.score * 100).toFixed(1)}%)`

    return {
      overallScore,
      criteria: {
        parameterCompleteness,
        structureQuality,
        regionAccuracy,
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

    for (const parameter of this.WEATHER_PARAMETERS) {
      if (lowerText.includes(parameter.toLowerCase())) {
        foundParameters.push(parameter.toLowerCase())
      }
    }

    // Check synonyms
    for (const [canonical, synonyms] of Object.entries(this.PARAMETER_SYNONYMS)) {
      for (const synonym of synonyms) {
        if (lowerText.includes(synonym.toLowerCase()) && !foundParameters.includes(canonical)) {
          foundParameters.push(canonical)
        }
      }
    }

    return [...new Set(foundParameters)] // Remove duplicates
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
    // Target cost: ≤ 0.10 CHF (from PRD)
    if (costChf <= 0.05) return 1.0
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
    return !!(
      json &&
      (json.metx_dashboard || json.aviation_dashboard || json.config || json.layers)
    )
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

  private static extractRegionFromRequest(request: string): string | null {
    const regionPatterns = [
      /for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+weather/g
    ]

    for (const pattern of regionPatterns) {
      const match = pattern.exec(request)
      if (match) {
        return match[1].trim()
      }
    }

    return null
  }

  private static extractRegionFromJson(json: any): string | null {
    const jsonString = JSON.stringify(json)
    const regionMatch = jsonString.match(/"region":\s*"([^"]+)"/i)
    if (regionMatch) return regionMatch[1]

    const countryMatch = jsonString.match(/"country":\s*"([^"]+)"/i)
    if (countryMatch) return countryMatch[1]

    return null
  }

  private static compareRegions(requested: string, generated: string): boolean {
    const normalize = (str: string) => str.toLowerCase().trim()
    
    const normalizedRequested = normalize(requested)
    const normalizedGenerated = normalize(generated)

    // Exact match
    if (normalizedRequested === normalizedGenerated) return true

    // Check if one contains the other
    if (normalizedRequested.includes(normalizedGenerated) || 
        normalizedGenerated.includes(normalizedRequested)) {
      return true
    }

    return false
  }

  private static getCostEfficiencyRationale(costChf: number): string {
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