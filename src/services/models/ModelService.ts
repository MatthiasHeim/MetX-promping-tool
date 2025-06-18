import { supabase } from '../../lib/supabase'
import type { Model } from '../../types/database'

export class ModelService {
  /**
   * Fetch all models from the database
   */
  static async fetchModels(): Promise<Model[]> {
    try {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching models:', error)
        throw new Error(`Failed to fetch models: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in fetchModels:', error)
      throw error
    }
  }

  /**
   * Fetch a single model by ID
   */
  static async fetchModelById(id: string): Promise<Model | null> {
    try {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        console.error('Error fetching model:', error)
        throw new Error(`Failed to fetch model: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in fetchModelById:', error)
      throw error
    }
  }
} 