import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EvaluationService } from './EvaluationService'
import type { GenerationResult, EvaluationResult, EvaluationCriteria } from './EvaluationService'

describe('EvaluationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('evaluateWeatherParameterCompleteness', () => {
    it('should score high when all requested parameters are present', () => {
      const userRequest = 'Show temperature, precipitation, and wind data for Switzerland'
      const generatedJson = {
        metx_dashboard: {
          config: {
            layers: ['temperature', 'precipitation', 'wind'],
            region: 'Switzerland'
          }
        }
      }

      const result = EvaluationService.evaluateWeatherParameterCompleteness(userRequest, generatedJson)

      expect(result.score).toBeGreaterThan(0.8)
      expect(result.foundParameters).toEqual(['temperature', 'precipitation', 'wind'])
      expect(result.missingParameters).toHaveLength(0)
      expect(result.rationale).toContain('All requested weather parameters found')
    })

    it('should score low when requested parameters are missing', () => {
      const userRequest = 'Show temperature, precipitation, wind, and humidity data'
      const generatedJson = {
        metx_dashboard: {
          config: {
            layers: ['temperature'],
            region: 'Switzerland'
          }
        }
      }

      const result = EvaluationService.evaluateWeatherParameterCompleteness(userRequest, generatedJson)

      expect(result.score).toBeLessThan(0.5)
      expect(result.foundParameters).toEqual(['temperature'])
      expect(result.missingParameters).toEqual(['precipitation', 'wind', 'humidity'])
      expect(result.rationale).toContain('Missing requested parameters')
    })

    it('should handle complex nested JSON structures', () => {
      const userRequest = 'Create aviation dashboard with METAR and TAF data'
      const generatedJson = {
        aviation_dashboard: {
          type: 'metx',
          data: {
            weather_sources: ['METAR', 'TAF'],
            parameters: ['wind', 'visibility', 'clouds']
          }
        }
      }

      const result = EvaluationService.evaluateWeatherParameterCompleteness(userRequest, generatedJson)

      expect(result.score).toBeGreaterThan(0.7)
      expect(result.foundParameters).toContain('METAR')
      expect(result.foundParameters).toContain('TAF')
    })

    it('should be case insensitive when matching parameters', () => {
      const userRequest = 'Show Temperature and PRECIPITATION data'
      const generatedJson = {
        config: {
          layers: ['temperature', 'precipitation']
        }
      }

      const result = EvaluationService.evaluateWeatherParameterCompleteness(userRequest, generatedJson)

      expect(result.score).toBeGreaterThan(0.8)
      expect(result.foundParameters).toEqual(['temperature', 'precipitation'])
    })
  })

  describe('evaluateJsonStructureQuality', () => {
    it('should score perfect for well-structured MetX JSON', () => {
      const generatedJson = {
        metx_dashboard: {
          version: '2.0',
          config: {
            layers: ['temperature', 'precipitation'],
            region: 'Switzerland',
            timeRange: '24h',
            visualization: 'heatmap'
          }
        }
      }

      const result = EvaluationService.evaluateJsonStructureQuality(generatedJson)

      expect(result.score).toBe(1.0)
      expect(result.hasValidStructure).toBe(true)
      expect(result.requiredFields).toContain('layers')
      expect(result.requiredFields).toContain('region')
      expect(result.rationale).toContain('Valid MetX JSON structure - ready for upload')
    })

    it('should score perfect for valid MetX layer arrays', () => {
      const generatedJson = [
        { kind: 'BackgroundMapDescription' },
        { kind: 'WmsLayerDescription', parameter_unit: 't_2m:C' },
        { kind: 'WmsLayerDescription', parameter_unit: 'precip:mm' }
      ]

      const result = EvaluationService.evaluateJsonStructureQuality(generatedJson)

      expect(result.score).toBe(1.0)
      expect(result.hasValidStructure).toBe(true)
      expect(result.requiredFields).toContain('layers')
      expect(result.requiredFields).toContain('region')
      expect(result.rationale).toContain('Valid MetX JSON structure - ready for upload')
    })

    it('should score low for non-MetX JSON structure', () => {
      const generatedJson = {
        random_data: {
          some_field: 'value'
        }
      }

      const result = EvaluationService.evaluateJsonStructureQuality(generatedJson)

      expect(result.score).toBe(0.5) // Valid JSON but no MetX structure and no required fields
      expect(result.hasValidStructure).toBe(false)
      expect(result.missingFields).toContain('layers')
      expect(result.missingFields).toContain('region')
    })

    it('should score 0 for invalid JSON', () => {
      const invalidJson = undefined

      const result = EvaluationService.evaluateJsonStructureQuality(invalidJson)

      expect(result.score).toBe(0)
      expect(result.hasValidStructure).toBe(false)
      expect(result.missingFields).toContain('layers')
      expect(result.missingFields).toContain('region')
      expect(result.rationale).toContain('Invalid JSON structure')
    })

    it('should prioritize final_json over generated_json', () => {
      const generatedJson = { invalid: 'structure' }
      const finalJson = [
        { kind: 'BackgroundMapDescription' },
        { kind: 'WmsLayerDescription', parameter_unit: 't_2m:C' }
      ]

      const result = EvaluationService.evaluateJsonStructureQuality(generatedJson, finalJson)

      expect(result.score).toBe(1.0)
      expect(result.hasValidStructure).toBe(true)
      expect(result.rationale).toContain('Valid MetX JSON structure - ready for upload')
    })

    it('should score perfect for complete MetX dashboard structure with tabs', () => {
      const completeMetXJson = {
        tabs: [
          {
            maps: [
              {
                layers: [
                  { kind: 'WmsLayerDescription', parameter_unit: 't_2m:C' },
                  { kind: 'WmsLayerDescription', parameter_unit: 'precip:mm' }
                ]
              }
            ]
          }
        ]
      }

      const result = EvaluationService.evaluateJsonStructureQuality({}, completeMetXJson)

      expect(result.score).toBe(1.0)
      expect(result.hasValidStructure).toBe(true)
      expect(result.rationale).toContain('Valid MetX JSON structure - ready for upload')
      expect(result.missingFields).toHaveLength(0)
    })
  })

  describe('evaluateLayerCount', () => {
    it('should score 100% for 3+ layers', () => {
      const generatedJson = [
        { kind: 'BackgroundMapDescription' },
        { kind: 'WmsLayerDescription', parameter_unit: 't_2m:C' },
        { kind: 'WmsLayerDescription', parameter_unit: 'precip:mm' },
        { kind: 'BarbsLayerDescription', parameter_unit: 'wind_speed_10m:kn' }
      ]

      const result = EvaluationService.evaluateLayerCount(generatedJson)

      expect(result.score).toBe(1.0)
      expect(result.layerCount).toBe(4)
      expect(result.rationale).toContain('Excellent layer count: 4 layers')
    })

    it('should score 50% for 2 layers', () => {
      const generatedJson = [
        { kind: 'BackgroundMapDescription' },
        { kind: 'WmsLayerDescription', parameter_unit: 't_2m:C' }
      ]

      const result = EvaluationService.evaluateLayerCount(generatedJson)

      expect(result.score).toBe(0.5)
      expect(result.layerCount).toBe(2)
      expect(result.rationale).toContain('Good layer count: 2 layers')
    })

    it('should score 0% for 1 layer', () => {
      const generatedJson = [
        { kind: 'WmsLayerDescription', parameter_unit: 't_2m:C' }
      ]

      const result = EvaluationService.evaluateLayerCount(generatedJson)

      expect(result.score).toBe(0.0)
      expect(result.layerCount).toBe(1)
      expect(result.rationale).toContain('Poor layer count: only 1 layer')
    })

    it('should handle complete JSON with layers array', () => {
      const finalJson = {
        layers: [
          { kind: 'BackgroundMapDescription' },
          { kind: 'WmsLayerDescription', parameter_unit: 't_2m:C' },
          { kind: 'WmsLayerDescription', parameter_unit: 'precip:mm' }
        ]
      }

      const result = EvaluationService.evaluateLayerCount([], finalJson)

      expect(result.score).toBe(1.0)
      expect(result.layerCount).toBe(3)
      expect(result.rationale).toContain('Excellent layer count: 3 layers')
    })

    it('should count weather layers in MetX dashboard structure', () => {
      const metxDashboard = {
        tabs: [{
          maps: [{
            layers: [
              { kind: 'BackgroundMapDescription' },
              { kind: 'WmsLayerDescription', parameter_unit: 't_2m:C' },
              { kind: 'WmsLayerDescription', parameter_unit: 'precip:mm' },
              { kind: 'IsoLinesLayerDescription', parameter_unit: 'pressure' }
            ]
          }, {
            layers: [
              { kind: 'BackgroundMapDescription' },
              { kind: 'WmsLayerDescription', parameter_unit: 'wind_speed:ms' }
            ]
          }]
        }]
      }

      const result = EvaluationService.evaluateLayerCount(metxDashboard)

      expect(result.score).toBe(1.0)
      expect(result.layerCount).toBe(4) // Should exclude BackgroundMapDescription layers
      expect(result.rationale).toContain('Excellent layer count: 4 layers')
    })
  })

  describe('generateOverallEvaluation', () => {
    it('should combine multiple evaluation criteria into overall score', () => {
      const mockGenerationResult: GenerationResult = {
        model_id: 'gpt-4.1',
        user_input: 'Show temperature and precipitation for Switzerland',
        generated_json: [
          { kind: 'WmsLayerDescription', parameter_unit: 't_2m:C' },
          { kind: 'WmsLayerDescription', parameter_unit: 'precip:mm' }
        ],
        final_json: {
          layers: [
            { kind: 'WmsLayerDescription', parameter_unit: 't_2m:C' },
            { kind: 'WmsLayerDescription', parameter_unit: 'precip:mm' }
          ],
          region: 'Switzerland'
        },
        cost_chf: 0.05,
        latency_ms: 2000
      }

      const result = EvaluationService.generateOverallEvaluation(mockGenerationResult)

      expect(result.overallScore).toBeGreaterThanOrEqual(0.58)
      expect(result.criteria).toHaveProperty('parameterCompleteness')
      expect(result.criteria).toHaveProperty('structureQuality')
      expect(result.criteria).toHaveProperty('layerCount')
      expect(result.rationale).toContain('evaluation based on')
    })

    it('should penalize for high cost and latency', () => {
      const expensiveResult: GenerationResult = {
        model_id: 'o3',
        user_input: 'Simple weather request',
        generated_json: [
          { kind: 'WmsLayerDescription', parameter_unit: 't_2m:C' }
        ],
        final_json: {
          layers: [
            { kind: 'WmsLayerDescription', parameter_unit: 't_2m:C' }
          ],
          region: 'Switzerland'
        },
        cost_chf: 0.25, // High cost
        latency_ms: 8000 // High latency
      }

      const result = EvaluationService.generateOverallEvaluation(expensiveResult)

      expect(result.criteria.costEfficiency.score).toBeLessThanOrEqual(0.4)
      expect(result.criteria.performance.score).toBeLessThanOrEqual(0.6)
      expect(result.rationale).toContain('layer count')
      expect(result.rationale).toContain('cost efficiency')
      expect(result.rationale).toContain('performance')
    })
  })

  describe('extractWeatherParameters', () => {
    it('should extract common weather parameters from text', () => {
      const text = 'Show temperature, precipitation, wind speed, and humidity levels'
      
      const parameters = EvaluationService.extractWeatherParameters(text)

      expect(parameters).toContain('temperature')
      expect(parameters).toContain('precipitation')
      expect(parameters).toContain('wind')
      expect(parameters).toContain('humidity')
    })

    it('should handle aviation-specific parameters', () => {
      const text = 'Create aviation dashboard with METAR, TAF, visibility, and turbulence'
      
      const parameters = EvaluationService.extractWeatherParameters(text)

      expect(parameters).toContain('METAR')
      expect(parameters).toContain('TAF')
      expect(parameters).toContain('visibility')
      expect(parameters).toContain('turbulence')
    })

    it('should handle synonyms and variations', () => {
      const text = 'Show temp, precip, and wind data'
      
      const parameters = EvaluationService.extractWeatherParameters(text)

      expect(parameters).toContain('temperature')
      expect(parameters).toContain('precipitation')
      expect(parameters).toContain('wind')
    })
  })

  describe('findParametersInJson', () => {
    it('should find parameters in various JSON structures', () => {
      const json = {
        metx_dashboard: {
          config: {
            layers: ['temperature', 'wind'],
            parameters: ['precipitation'],
            weather_data: {
              sources: ['METAR']
            }
          }
        }
      }

      const found = EvaluationService.findParametersInJson(json, ['temperature', 'wind', 'precipitation', 'METAR', 'humidity'])

      expect(found).toContain('temperature')
      expect(found).toContain('wind')
      expect(found).toContain('precipitation')
      expect(found).toContain('METAR')
      expect(found).not.toContain('humidity')
    })

    it('should be case insensitive', () => {
      const json = {
        layers: ['TEMPERATURE', 'Wind', 'precipitation']
      }

      const found = EvaluationService.findParametersInJson(json, ['temperature', 'wind', 'precipitation'])

      expect(found).toEqual(['temperature', 'wind', 'precipitation'])
    })
  })

  describe('calculateCostEfficiencyScore', () => {
    it('should score perfect for very low cost (under 1 cent)', () => {
      const score = EvaluationService.calculateCostEfficiencyScore(0.005)
      expect(score).toBe(1.0)
    })

    it('should score high for low cost generations', () => {
      const score = EvaluationService.calculateCostEfficiencyScore(0.02)
      expect(score).toBe(0.9)
    })

    it('should score low for high cost generations', () => {
      const score = EvaluationService.calculateCostEfficiencyScore(0.25)
      expect(score).toBe(0.2)
    })

    it('should score medium for moderate cost', () => {
      const score = EvaluationService.calculateCostEfficiencyScore(0.10)
      expect(score).toBe(0.8)
    })
  })

  describe('calculatePerformanceScore', () => {
    it('should score high for fast generations', () => {
      const score = EvaluationService.calculatePerformanceScore(1500)
      expect(score).toBeGreaterThan(0.8)
    })

    it('should score low for slow generations', () => {
      const score = EvaluationService.calculatePerformanceScore(10000)
      expect(score).toBeLessThanOrEqual(0.6)  // 10000ms falls in the 0.6 range
    })

    it('should score medium for moderate latency', () => {
      const score = EvaluationService.calculatePerformanceScore(4000)
      expect(score).toBeGreaterThan(0.4)
      expect(score).toBeLessThanOrEqual(0.8)
    })
  })
}) 