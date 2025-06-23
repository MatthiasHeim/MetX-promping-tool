import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Ensure only confirmed users can be authenticated
    flowType: 'pkce',
  },
})

// Helper function to get the current user and check if email is confirmed
export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  
  if (error) {
    throw error
  }
  
  // Check if user exists and email is confirmed
  if (user && !user.email_confirmed_at) {
    throw new Error('Email not confirmed')
  }
  
  return user
}

// Helper function to check if user is authenticated AND email confirmed
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const user = await getCurrentUser()
    return !!user
  } catch {
    return false
  }
} 