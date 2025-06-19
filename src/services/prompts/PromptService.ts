import { supabase } from '../../lib/supabase'
import type { Prompt, CreatePromptRequest, UpdatePromptRequest } from '../../types/database'

export class PromptService {
  /**
   * Fetch all prompts from the database
   */
  static async fetchPrompts(): Promise<Prompt[]> {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching prompts:', error)
        throw new Error(`Failed to fetch prompts: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in fetchPrompts:', error)
      throw error
    }
  }

  /**
   * Fetch a single prompt by ID
   */
  static async fetchPromptById(id: string): Promise<Prompt | null> {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        console.error('Error fetching prompt:', error)
        throw new Error(`Failed to fetch prompt: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in fetchPromptById:', error)
      throw error
    }
  }

  /**
   * Create a new prompt
   */
  static async createPrompt(prompt: CreatePromptRequest): Promise<Prompt> {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .insert({
          ...prompt,
          created_by: null // Skip user auth for development
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating prompt:', error)
        throw new Error(`Failed to create prompt: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in createPrompt:', error)
      throw error
    }
  }

  /**
   * Update an existing prompt
   */
  static async updatePrompt(id: string, updates: UpdatePromptRequest): Promise<Prompt> {
    try {
      console.log('PromptService.updatePrompt called with:', { id, updates })
      console.log('ID type:', typeof id, 'ID length:', id?.length)
      
      // First check if the prompt exists
      console.log('Checking if prompt exists with ID:', id)
      const existingPrompt = await this.fetchPromptById(id)
      if (!existingPrompt) {
        throw new Error(`Prompt with id ${id} not found`)
      }
      
      console.log('Found existing prompt:', existingPrompt.name, 'current version:', existingPrompt.version)
      
      // Prepare the update data - filter out undefined values
      const updateData: any = {
        updated_at: new Date().toISOString()
      }
      
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.template_text !== undefined) updateData.template_text = updates.template_text
      if (updates.json_prefix !== undefined) updateData.json_prefix = updates.json_prefix
      if (updates.json_suffix !== undefined) updateData.json_suffix = updates.json_suffix
      if (updates.use_placeholder !== undefined) updateData.use_placeholder = updates.use_placeholder
      
      console.log('Update data prepared:', updateData)
      console.log('Update data keys:', Object.keys(updateData))
      console.log('Update data values preview:', {
        name: updateData.name,
        description: updateData.description?.substring(0, 50) + '...',
        template_text_length: updateData.template_text?.length,
        json_prefix_length: updateData.json_prefix?.length,
        json_suffix_length: updateData.json_suffix?.length,
        use_placeholder: updateData.use_placeholder
      })
      
      // Try a simple update first to see if it's a data size issue
      console.log('Attempting simple update first...')
      const { data: simpleData, error: simpleError } = await supabase
        .from('prompts')
        .update({ name: updateData.name, updated_at: updateData.updated_at })
        .eq('id', id)
        .select()

      console.log('Simple update result:', { data: simpleData, error: simpleError })
      
      if (simpleError) {
        console.error('Simple update failed:', simpleError)
      } else if (simpleData && simpleData.length > 0) {
        console.log('Simple update succeeded, now trying full update...')
      } else {
        console.error('Simple update returned no data')
        throw new Error('Simple update failed - no rows affected')
      }
      
      // Try the update without .single() first to see what happens
      const { data: allData, error: queryError, count } = await supabase
        .from('prompts')
        .update(updateData)
        .eq('id', id)
        .select()

      console.log('Update query result:', { data: allData, error: queryError, count })
      
      if (queryError) {
        console.error('Error in update query:', queryError)
        throw new Error(`Failed to update prompt: ${queryError.message}`)
      }

      if (!allData || allData.length === 0) {
        console.error('No rows were updated for ID:', id)
        throw new Error('No rows were updated - prompt may not exist')
      }

      if (allData.length > 1) {
        console.warn('Multiple rows updated:', allData.length)
      }

      const data = allData[0]
      console.log('Prompt updated successfully:', data.name)
      return data
    } catch (error) {
      console.error('Error in updatePrompt:', error)
      throw error
    }
  }

  /**
   * Delete a prompt
   */
  static async deletePrompt(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting prompt:', error)
        throw new Error(`Failed to delete prompt: ${error.message}`)
      }
    } catch (error) {
      console.error('Error in deletePrompt:', error)
      throw error
    }
  }

  /**
   * Set a prompt as the default one
   * This will unset any existing default prompt and set the specified one as default
   */
  static async setPromptAsDefault(id: string): Promise<Prompt> {
    try {
      // First, unset all existing default prompts
      const { error: unsetError } = await supabase
        .from('prompts')
        .update({ is_default: false })
        .eq('is_default', true)

      if (unsetError) {
        console.error('Error unsetting existing default prompts:', unsetError)
        throw new Error(`Failed to unset existing defaults: ${unsetError.message}`)
      }

      // Then set the specified prompt as default
      const { data, error } = await supabase
        .from('prompts')
        .update({ 
          is_default: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error setting prompt as default:', error)
        throw new Error(`Failed to set prompt as default: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in setPromptAsDefault:', error)
      throw error
    }
  }

  /**
   * Unset a prompt as default
   */
  static async unsetPromptAsDefault(id: string): Promise<Prompt> {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .update({ 
          is_default: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error unsetting prompt as default:', error)
        throw new Error(`Failed to unset prompt as default: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in unsetPromptAsDefault:', error)
      throw error
    }
  }
} 