import { supabase } from '../../lib/supabase'
import type { Prompt, CreatePromptRequest, UpdatePromptRequest, PromptVersion } from '../../types/database'

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
   * Fetch prompts by type (generation or judge)
   */
  static async fetchPromptsByType(promptType: 'generation' | 'judge'): Promise<Prompt[]> {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('prompt_type', promptType)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching prompts by type:', error)
        throw new Error(`Failed to fetch prompts: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in fetchPromptsByType:', error)
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
      
      // First check if the prompt exists
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
      
      // Retry logic for versioning conflicts
      let retryCount = 0
      const maxRetries = 3
      
      while (retryCount < maxRetries) {
        try {
          const { data, error } = await supabase
            .from('prompts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

          if (error) {
            // Check if this is a versioning constraint violation
            if (error.message.includes('duplicate key value violates unique constraint') && 
                error.message.includes('prompt_versions_prompt_id_version_number_key')) {
              console.log(`Versioning conflict detected, retry ${retryCount + 1}/${maxRetries}`)
              retryCount++
              if (retryCount < maxRetries) {
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 100 * retryCount))
                continue
              }
            }
            throw new Error(`Failed to update prompt: ${error.message}`)
          }

          console.log('Prompt updated successfully:', data.name)
          return data
        } catch (innerError) {
          if (retryCount >= maxRetries - 1) {
            throw innerError
          }
          retryCount++
          console.log(`Update failed, retry ${retryCount}/${maxRetries}:`, innerError)
          await new Promise(resolve => setTimeout(resolve, 100 * retryCount))
        }
      }
      
      throw new Error('Failed to update prompt after maximum retries')
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

  /**
   * Get all versions of a prompt
   */
  static async getPromptVersions(promptId: string): Promise<PromptVersion[]> {
    try {
      const { data, error } = await supabase
        .from('prompt_versions')
        .select('*')
        .eq('prompt_id', promptId)
        .order('version_number', { ascending: false })

      if (error) {
        console.error('Error fetching prompt versions:', error)
        throw new Error(`Failed to fetch prompt versions: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in getPromptVersions:', error)
      throw error
    }
  }

  /**
   * Get a specific version of a prompt
   */
  static async getPromptVersion(promptId: string, versionNumber: number): Promise<PromptVersion | null> {
    try {
      const { data, error } = await supabase
        .from('prompt_versions')
        .select('*')
        .eq('prompt_id', promptId)
        .eq('version_number', versionNumber)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        console.error('Error fetching prompt version:', error)
        throw new Error(`Failed to fetch prompt version: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in getPromptVersion:', error)
      throw error
    }
  }

  /**
   * Rollback a prompt to a specific version
   */
  static async rollbackPromptToVersion(promptId: string, versionNumber: number): Promise<Prompt> {
    try {
      console.log(`Rolling back prompt ${promptId} to version ${versionNumber}`)
      
      // First, get the version data we want to rollback to
      const targetVersion = await this.getPromptVersion(promptId, versionNumber)
      if (!targetVersion) {
        throw new Error(`Version ${versionNumber} not found for prompt ${promptId}`)
      }

      // Try using the server function first (it should work now)
      try {
        const { error } = await supabase.rpc('rollback_prompt_to_version', {
          prompt_id_param: promptId,
          version_number_param: versionNumber
        })

        if (error) {
          console.warn('Server function failed, falling back to client-side rollback:', error.message)
          throw error
        }

        // Fetch the updated prompt
        const updatedPrompt = await this.fetchPromptById(promptId)
        if (!updatedPrompt) {
          throw new Error('Failed to fetch updated prompt after rollback')
        }

        console.log(`Successfully rolled back prompt to version ${versionNumber}`)
        return updatedPrompt
      } catch {
        // Fallback to client-side rollback
        console.log('Using client-side rollback approach')
        
        // Update the prompt with the target version's data
        // This will create a new version automatically via the trigger
        const updateData = {
          name: targetVersion.name,
          description: targetVersion.description || undefined,
          template_text: targetVersion.template_text,
          json_prefix: targetVersion.json_prefix || undefined,
          json_suffix: targetVersion.json_suffix || undefined,
          use_placeholder: targetVersion.use_placeholder
        }

        const updatedPrompt = await this.updatePrompt(promptId, updateData)
        
        // Update the newly created version to indicate it's a rollback
        const currentVersions = await this.getPromptVersions(promptId)
        const newestVersion = currentVersions[0] // They're ordered by version_number desc
        
        if (newestVersion) {
          await supabase
            .from('prompt_versions')
            .update({ 
              change_summary: `Rolled back to version ${versionNumber}`,
              created_at: new Date().toISOString()
            })
            .eq('id', newestVersion.id)
        }

        console.log(`Successfully rolled back prompt to version ${versionNumber} (client-side)`)
        return updatedPrompt
      }
    } catch (error) {
      console.error('Error in rollbackPromptToVersion:', error)
      throw error
    }
  }

  /**
   * Get the current active version number for a prompt
   */
  static async getCurrentVersion(promptId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('prompt_versions')
        .select('version_number')
        .eq('prompt_id', promptId)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('Error fetching current version:', error)
        throw new Error(`Failed to fetch current version: ${error.message}`)
      }

      return data.version_number
    } catch (error) {
      console.error('Error in getCurrentVersion:', error)
      throw error
    }
  }

  /**
   * Get prompts with their version information
   */
  static async fetchPromptsWithVersions(): Promise<Prompt[]> {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select(`
          *,
          prompt_versions!inner(
            version_number,
            is_active
          )
        `)
        .eq('prompt_versions.is_active', true)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching prompts with versions:', error)
        throw new Error(`Failed to fetch prompts with versions: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in fetchPromptsWithVersions:', error)
      throw error
    }
  }
} 