// PromptService - Handles prompt management operations for MetX prompting tool
import { supabase } from '../../lib/supabase'
import type { Prompt } from '../../types/database'

export interface CreatePromptRequest {
  name: string
  description?: string
  template_text: string
  json_prefix?: string
  json_suffix?: string
  use_placeholder?: boolean
}

export interface UpdatePromptRequest extends Partial<CreatePromptRequest> {
  id: string
}

export interface PromptSearchOptions {
  query?: string
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'version'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export class PromptService {
  
  // Get all prompts with optional filtering
  static async getAllPrompts(options: PromptSearchOptions = {}): Promise<Prompt[]> {
    const {
      sortBy = 'updated_at',
      sortOrder = 'desc',
      limit = 100,
      offset = 0
    } = options

    let query = supabase
      .from('prompts')
      .select('*')
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch prompts: ${error.message}`)
    }

    return data || []
  }

  // Search prompts by name, description, or template text
  static async searchPrompts(searchQuery: string, options: PromptSearchOptions = {}): Promise<Prompt[]> {
    if (!searchQuery.trim()) {
      return this.getAllPrompts(options)
    }

    const {
      sortBy = 'updated_at',
      sortOrder = 'desc',
      limit = 100,
      offset = 0
    } = options

    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,template_text.ilike.%${searchQuery}%`)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to search prompts: ${error.message}`)
    }

    return data || []
  }

  // Get a specific prompt by ID
  static async getPromptById(id: string): Promise<Prompt | null> {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to fetch prompt: ${error.message}`)
    }

    return data
  }

  // Create a new prompt
  static async createPrompt(promptData: CreatePromptRequest): Promise<Prompt> {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User must be authenticated to create prompts')
    }

    const newPrompt = {
      ...promptData,
      version: 1,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('prompts')
      .insert([newPrompt])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create prompt: ${error.message}`)
    }

    return data
  }

  // Update an existing prompt (creates new version)
  static async updatePrompt(promptData: UpdatePromptRequest): Promise<Prompt> {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User must be authenticated to update prompts')
    }

    // Get current prompt to increment version
    const currentPrompt = await this.getPromptById(promptData.id)
    if (!currentPrompt) {
      throw new Error('Prompt not found')
    }

    const updatedPrompt = {
      ...currentPrompt,
      ...promptData,
      version: currentPrompt.version + 1,
      created_by: user.id,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('prompts')
      .update(updatedPrompt)
      .eq('id', promptData.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update prompt: ${error.message}`)
    }

    return data
  }

  // Delete a prompt
  static async deletePrompt(id: string): Promise<void> {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User must be authenticated to delete prompts')
    }

    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete prompt: ${error.message}`)
    }
  }

  // Get prompt version history
  static async getPromptVersions(basePromptId: string): Promise<Prompt[]> {
    // For now, we'll just return the single prompt
    // In a full implementation, we'd have a separate versions table
    const prompt = await this.getPromptById(basePromptId)
    return prompt ? [prompt] : []
  }

  // Validate prompt template
  static validatePromptTemplate(template: string): {
    isValid: boolean
    errors: string[]
    placeholders: string[]
  } {
    const errors: string[] = []
    const placeholders: string[] = []

    // Find all placeholders in the format {{placeholder}}
    const placeholderRegex = /\{\{([^}]+)\}\}/g
    let match

    while ((match = placeholderRegex.exec(template)) !== null) {
      const placeholder = match[1].trim()
      if (placeholder) {
        placeholders.push(placeholder)
      } else {
        errors.push('Empty placeholder found')
      }
    }

    // Check for unmatched braces
    const openBraces = (template.match(/\{\{/g) || []).length
    const closeBraces = (template.match(/\}\}/g) || []).length
    
    if (openBraces !== closeBraces) {
      errors.push('Unmatched braces in template')
    }

    // Check for minimum content
    if (template.trim().length < 10) {
      errors.push('Template must be at least 10 characters long')
    }

    return {
      isValid: errors.length === 0,
      errors,
      placeholders: [...new Set(placeholders)] // Remove duplicates
    }
  }

  // Process template with variables
  static processTemplate(template: string, variables: Record<string, string>): string {
    let processed = template

    // Replace all placeholders with provided variables
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
      processed = processed.replace(placeholder, value)
    })

    return processed
  }

  // Get template statistics
  static getTemplateStats(template: string): {
    characterCount: number
    wordCount: number
    placeholderCount: number
    estimatedTokens: number
  } {
    const characterCount = template.length
    const wordCount = template.split(/\s+/).filter(word => word.length > 0).length
    const placeholderCount = (template.match(/\{\{[^}]+\}\}/g) || []).length
    
    // Rough token estimation (1.3 tokens per word for English)
    const estimatedTokens = Math.ceil(wordCount * 1.3)

    return {
      characterCount,
      wordCount,
      placeholderCount,
      estimatedTokens
    }
  }
} 