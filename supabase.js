import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Helper functions for common operations
export const supabaseHelpers = {
  // Test connection
  testConnection: async () => {
    try {
      const { data, error } = await supabase.from('requester').select('count').single()
      if (error) throw error
      return { success: true, message: 'Connection successful' }
    } catch (error) {
      return { success: false, message: error.message }
    }
  },

  // Get table info
  getTableInfo: async (tableName = 'requester') => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (error) throw error
      return { success: true, columns: data ? Object.keys(data[0] || {}) : [] }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }
}

export default supabase