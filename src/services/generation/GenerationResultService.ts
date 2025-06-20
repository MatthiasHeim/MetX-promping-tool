import { supabase } from '../../lib/supabase'
import { EvaluationService } from '../evaluation/EvaluationService'
import type { GenerationResult, GenerationResultInsert, GenerationResultUpdate } from '../../types/database'

export class GenerationResultService {
  /**
   * Enriches generation result data with automatic evaluation metrics
   */
  private static enrichWithEvaluation(data: GenerationResultInsert, userInput?: string): GenerationResultInsert {
    // Only evaluate if we have valid JSON content
    if (!data.raw_json || !data.final_json) {
      return data
    }

    try {
      // Generate evaluation for this result
      const evaluation = EvaluationService.generateOverallEvaluation({
        model_id: data.model_id,
        user_input: userInput || '', // Use provided user input or empty string
        generated_json: data.raw_json,
        final_json: data.final_json,
        cost_chf: data.cost_chf || 0,
        latency_ms: data.latency_ms || 0
      })

      // Add evaluation metrics to the data
      return {
        ...data,
        overall_score: evaluation.overallScore,
        overall_rationale: evaluation.rationale,
        parameter_completeness_score: evaluation.criteria.parameterCompleteness.score,
        parameter_completeness_rationale: evaluation.criteria.parameterCompleteness.rationale,
        structure_quality_score: evaluation.criteria.structureQuality.score,
        structure_quality_rationale: evaluation.criteria.structureQuality.rationale,
        layer_count_score: evaluation.criteria.layerCount.score,
        layer_count_rationale: evaluation.criteria.layerCount.rationale,
        layer_count: evaluation.criteria.layerCount.layerCount,
        cost_efficiency_score: evaluation.criteria.costEfficiency.score,
        cost_efficiency_rationale: evaluation.criteria.costEfficiency.rationale,
        performance_score: evaluation.criteria.performance.score,
        performance_rationale: evaluation.criteria.performance.rationale,
        evaluation_timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error generating evaluation metrics:', error)
      // Return original data if evaluation fails
      return data
    }
  }

  /**
   * Create a new generation result in the database
   */
  static async createGenerationResult(
    data: GenerationResultInsert
  ): Promise<GenerationResult> {
    // Validation
    if (!data.user_input_id) {
      throw new Error('User input ID is required')
    }
    if (!data.prompt_id) {
      throw new Error('Prompt ID is required')
    }
    if (!data.model_id) {
      throw new Error('Model ID is required')
    }
    if (!data.user_id) {
      throw new Error('User ID is required')
    }

    try {
      // Enrich with automatic evaluation metrics
      const enrichedData = this.enrichWithEvaluation(data)

      const { data: result, error } = await supabase
        .from('generation_results')
        .insert(enrichedData)
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to create generation result: ${error.message}`)
      }

      return result
    } catch (error) {
      console.error('Error creating generation result:', error)
      throw error
    }
  }

  /**
   * Create multiple generation results in a batch with user input for evaluation
   */
  static async createGenerationResultsWithUserInput(
    results: GenerationResultInsert[],
    userInput: string
  ): Promise<GenerationResult[]> {
    if (!results || results.length === 0) {
      throw new Error('At least one generation result is required')
    }

    // Validate all results
    for (const result of results) {
      if (!result.user_input_id || !result.prompt_id || !result.model_id || !result.user_id) {
        throw new Error('All generation results must have user_input_id, prompt_id, model_id, and user_id')
      }
    }

    try {
      // Enrich all results with automatic evaluation metrics
      const enrichedResults = results.map(result => this.enrichWithEvaluation(result, userInput))

      const { data, error } = await supabase
        .from('generation_results')
        .insert(enrichedResults)
        .select('*')

      if (error) {
        throw new Error(`Failed to create generation results: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error creating generation results:', error)
      throw error
    }
  }

  /**
   * Create multiple generation results in a batch
   */
  static async createGenerationResults(
    results: GenerationResultInsert[]
  ): Promise<GenerationResult[]> {
    if (!results || results.length === 0) {
      throw new Error('At least one generation result is required')
    }

    // Validate all results
    for (const result of results) {
      if (!result.user_input_id || !result.prompt_id || !result.model_id || !result.user_id) {
        throw new Error('All generation results must have user_input_id, prompt_id, model_id, and user_id')
      }
    }

    try {
      // Enrich all results with automatic evaluation metrics
      const enrichedResults = results.map(result => this.enrichWithEvaluation(result))

      const { data, error } = await supabase
        .from('generation_results')
        .insert(enrichedResults)
        .select('*')

      if (error) {
        throw new Error(`Failed to create generation results: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error creating generation results:', error)
      throw error
    }
  }

  /**
   * Get generation results for a specific user input
   */
  static async getGenerationResultsByUserInput(
    userInputId: string
  ): Promise<GenerationResult[]> {
    if (!userInputId) {
      throw new Error('User input ID is required')
    }

    try {
      const { data, error } = await supabase
        .from('generation_results')
        .select('*')
        .eq('user_input_id', userInputId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch generation results: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error fetching generation results:', error)
      throw error
    }
  }

  /**
   * Get generation results for a specific user
   */
  static async getGenerationResultsByUser(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<GenerationResult[]> {
    if (!userId) {
      throw new Error('User ID is required')
    }

    try {
      let query = supabase
        .from('generation_results')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      if (offset) {
        query = query.range(offset, offset + (limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch generation results: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error fetching generation results:', error)
      throw error
    }
  }

  /**
   * Get all generation results (shared across all users)
   */
  static async getAllGenerationResults(
    limit?: number,
    offset?: number
  ): Promise<GenerationResult[]> {
    try {
      let query = supabase
        .from('generation_results')
        .select('*')
        .order('created_at', { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      if (offset) {
        query = query.range(offset, offset + (limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch generation results: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error fetching generation results:', error)
      throw error
    }
  }

  /**
   * Get a specific generation result by ID
   */
  static async getGenerationResultById(
    resultId: string
  ): Promise<GenerationResult | null> {
    if (!resultId) {
      throw new Error('Result ID is required')
    }

    try {
      const { data, error } = await supabase
        .from('generation_results')
        .select('*')
        .eq('id', resultId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null
        }
        throw new Error(`Failed to fetch generation result: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error fetching generation result:', error)
      throw error
    }
  }

  /**
   * Update a generation result (typically for manual ratings)
   */
  static async updateGenerationResult(
    resultId: string,
    updates: GenerationResultUpdate
  ): Promise<GenerationResult> {
    if (!resultId) {
      throw new Error('Result ID is required')
    }

    try {
      const { data, error } = await supabase
        .from('generation_results')
        .update(updates)
        .eq('id', resultId)
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to update generation result: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error updating generation result:', error)
      throw error
    }
  }

  /**
   * Delete a generation result
   */
  static async deleteGenerationResult(
    resultId: string,
    userId: string
  ): Promise<void> {
    if (!resultId) {
      throw new Error('Result ID is required')
    }
    if (!userId) {
      throw new Error('User ID is required')
    }

    try {
      // Verify ownership before deletion
      const { error } = await supabase
        .from('generation_results')
        .delete()
        .eq('id', resultId)
        .eq('user_id', userId) // Ensure user can only delete their own results

      if (error) {
        throw new Error(`Failed to delete generation result: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting generation result:', error)
      throw error
    }
  }

  /**
   * Get generation statistics for a user
   */
  static async getGenerationStats(userId: string): Promise<{
    total_generations: number;
    total_cost_chf: number;
    avg_latency_ms: number;
    models_used: string[];
  }> {
    if (!userId) {
      throw new Error('User ID is required')
    }

    try {
      const { data, error } = await supabase
        .from('generation_results')
        .select('cost_chf, latency_ms, model_id')
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to fetch generation stats: ${error.message}`)
      }

      const results = data || []
      const totalCost = results.reduce((sum, r) => sum + (r.cost_chf || 0), 0)
      const avgLatency = results.length > 0 
        ? results.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / results.length
        : 0
      const modelsUsed = [...new Set(results.map(r => r.model_id))]

      return {
        total_generations: results.length,
        total_cost_chf: totalCost,
        avg_latency_ms: Math.round(avgLatency),
        models_used: modelsUsed
      }
    } catch (error) {
      console.error('Error fetching generation stats:', error)
      throw error
    }
  }
} 