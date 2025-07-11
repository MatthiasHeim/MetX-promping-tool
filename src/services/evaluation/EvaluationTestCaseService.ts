import { supabase } from '../../lib/supabase'
import type { EvaluationTestCase, EvaluationTestCaseInsert, EvaluationTestCaseUpdate } from '../../types/database'

export class EvaluationTestCaseService {
  /**
   * Fetch all active test cases from the database
   */
  static async fetchTestCases(includeInactive = false): Promise<EvaluationTestCase[]> {
    try {
      let query = supabase
        .from('evaluation_test_cases')
        .select('*')
        .order('created_at', { ascending: true })

      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching test cases:', error)
        throw new Error(`Failed to fetch test cases: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in fetchTestCases:', error)
      throw error
    }
  }

  /**
   * Fetch a single test case by ID
   */
  static async fetchTestCaseById(id: string): Promise<EvaluationTestCase | null> {
    try {
      const { data, error } = await supabase
        .from('evaluation_test_cases')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        console.error('Error fetching test case:', error)
        throw new Error(`Failed to fetch test case: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in fetchTestCaseById:', error)
      throw error
    }
  }

  /**
   * Create a new test case
   */
  static async createTestCase(testCase: EvaluationTestCaseInsert): Promise<EvaluationTestCase> {
    try {
      const { data, error } = await supabase
        .from('evaluation_test_cases')
        .insert([{
          ...testCase,
          is_active: testCase.is_active ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating test case:', error)
        throw new Error(`Failed to create test case: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in createTestCase:', error)
      throw error
    }
  }

  /**
   * Update an existing test case
   */
  static async updateTestCase(id: string, updates: EvaluationTestCaseUpdate): Promise<EvaluationTestCase> {
    try {
      const { data, error } = await supabase
        .from('evaluation_test_cases')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating test case:', error)
        throw new Error(`Failed to update test case: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in updateTestCase:', error)
      throw error
    }
  }

  /**
   * Delete a test case (soft delete by setting is_active to false)
   */
  static async deleteTestCase(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('evaluation_test_cases')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error deleting test case:', error)
        throw new Error(`Failed to delete test case: ${error.message}`)
      }
    } catch (error) {
      console.error('Error in deleteTestCase:', error)
      throw error
    }
  }

  /**
   * Hard delete a test case (permanent removal)
   */
  static async hardDeleteTestCase(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('evaluation_test_cases')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error hard deleting test case:', error)
        throw new Error(`Failed to hard delete test case: ${error.message}`)
      }
    } catch (error) {
      console.error('Error in hardDeleteTestCase:', error)
      throw error
    }
  }

  /**
   * Get count of active test cases
   */
  static async getTestCaseCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('evaluation_test_cases')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      if (error) {
        console.error('Error getting test case count:', error)
        throw new Error(`Failed to get test case count: ${error.message}`)
      }

      return count || 0
    } catch (error) {
      console.error('Error in getTestCaseCount:', error)
      throw error
    }
  }

  /**
   * Bulk create test cases
   */
  static async bulkCreateTestCases(testCases: EvaluationTestCaseInsert[]): Promise<EvaluationTestCase[]> {
    try {
      const now = new Date().toISOString()
      const casesWithTimestamps = testCases.map(testCase => ({
        ...testCase,
        is_active: testCase.is_active ?? true,
        created_at: now,
        updated_at: now
      }))

      const { data, error } = await supabase
        .from('evaluation_test_cases')
        .insert(casesWithTimestamps)
        .select()

      if (error) {
        console.error('Error bulk creating test cases:', error)
        throw new Error(`Failed to bulk create test cases: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in bulkCreateTestCases:', error)
      throw error
    }
  }
}