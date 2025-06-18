import { supabase } from '../../lib/supabase'
import type { UserInput } from '../../types/database'

export class UserInputService {
  /**
   * Create a new user input with optional image upload
   */
  static async createUserInput(
    userId: string,
    text: string,
    inputImage?: File
  ): Promise<UserInput> {
    // Validation
    if (!userId) {
      throw new Error('User ID is required')
    }
    if (!text) {
      throw new Error('Text input is required')
    }

    let imageUrl: string | null = null

    // Upload image if provided
    if (inputImage) {
      try {
        // Generate unique filename
        const timestamp = Date.now()
        const fileExtension = inputImage.name.split('.').pop()
        const fileName = `${userId}/${timestamp}.${fileExtension}`

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('input_images')
          .upload(fileName, inputImage, {
            contentType: inputImage.type
          })

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('input_images')
          .getPublicUrl(uploadData.path)

        imageUrl = urlData.publicUrl
      } catch (error) {
        console.error('Error uploading image:', error)
        throw error
      }
    }

    // Insert user input into database
    try {
      const { data, error } = await supabase
        .from('user_inputs')
        .insert({
          user_id: userId,
          text: text,
          input_image_url: imageUrl
        })
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to create user input: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error creating user input:', error)
      throw error
    }
  }

  /**
   * Get all user inputs for a specific user
   */
  static async getUserInputs(userId: string): Promise<UserInput[]> {
    if (!userId) {
      throw new Error('User ID is required')
    }

    try {
      const { data, error } = await supabase
        .from('user_inputs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch user inputs: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error fetching user inputs:', error)
      throw error
    }
  }

  /**
   * Get a specific user input by ID
   */
  static async getUserInputById(inputId: string): Promise<UserInput | null> {
    if (!inputId) {
      throw new Error('Input ID is required')
    }

    try {
      const { data, error } = await supabase
        .from('user_inputs')
        .select('*')
        .eq('id', inputId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null
        }
        throw new Error(`Failed to fetch user input: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error fetching user input:', error)
      throw error
    }
  }

  /**
   * Delete a user input and its associated image
   */
  static async deleteUserInput(inputId: string, userId: string): Promise<void> {
    if (!inputId) {
      throw new Error('Input ID is required')
    }
    if (!userId) {
      throw new Error('User ID is required')
    }

    try {
      // First get the input to check if it has an image
      const input = await this.getUserInputById(inputId)
      if (!input) {
        throw new Error('User input not found')
      }

      // Verify ownership
      if (input.user_id !== userId) {
        throw new Error('Unauthorized: Cannot delete another user\'s input')
      }

      // Delete image from storage if it exists
      if (input.input_image_url) {
        try {
          // Extract path from URL
          const url = new URL(input.input_image_url)
          const pathParts = url.pathname.split('/')
          const fileName = pathParts[pathParts.length - 1]
          const userFolder = pathParts[pathParts.length - 2]
          const filePath = `${userFolder}/${fileName}`

          await supabase.storage
            .from('input_images')
            .remove([filePath])
        } catch (storageError) {
          console.warn('Failed to delete image from storage:', storageError)
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('user_inputs')
        .delete()
        .eq('id', inputId)
        .eq('user_id', userId) // Double-check ownership

      if (error) {
        throw new Error(`Failed to delete user input: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting user input:', error)
      throw error
    }
  }
} 