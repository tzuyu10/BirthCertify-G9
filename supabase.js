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

// Enhanced helper functions for dashboard operations
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
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return { success: true, user }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Get dashboard stats for current user
  getDashboardStats: async (userId) => {
    try {
      // Get all requests for the user
      const { data: requests, error: requestsError } = await supabase
        .from('requester')
        .select('req_id, is_draft')
        .eq('user_id', userId)

      if (requestsError) throw requestsError

      // Get latest status for each request
      const requestsWithStatus = await Promise.all(
        requests.map(async (req) => {
          const { data: statusData, error: statusError } = await supabase
            .from('status')
            .select('status_current')
            .eq('req_id', req.req_id)
            .order('status_update_date', { ascending: false })
            .limit(1)

          if (statusError) {
            console.warn(`Error getting status for request ${req.req_id}:`, statusError)
            return { ...req, status_current: 'pending' }
          }

          return {
            ...req,
            status_current: statusData?.[0]?.status_current || 'pending'
          }
        })
      )

      // Calculate stats
      const stats = {
        pending: requestsWithStatus.filter(req => 
          req.status_current === 'pending'
        ).length,
        completed: requestsWithStatus.filter(req => 
          req.status_current === 'completed' || req.status_current === 'approved'
        ).length,
        rejected: requestsWithStatus.filter(req => 
          req.status_current === 'cancelled'
        ).length
      }

      return { success: true, stats, requests: requestsWithStatus }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Get user's recent requests with status
  getRecentRequests: async (userId, limit = 10) => {
    try {
      const { data: requests, error } = await supabase
        .from('requester')
        .select('req_id, req_fname, req_lname, req_purpose, req_date, is_draft')
        .eq('user_id', userId)
        .order('req_date', { ascending: false })
        .limit(limit)

      if (error) throw error

      // Get status for each request
      const requestsWithStatus = await Promise.all(
        requests.map(async (req) => {
          const { data: statusData } = await supabase
            .from('status')
            .select('status_current, status_update_date')
            .eq('req_id', req.req_id)
            .order('status_update_date', { ascending: false })
            .limit(1)

          return {
            ...req,
            status_current: statusData?.[0]?.status_current || 'pending',
            status_date: statusData?.[0]?.status_update_date
          }
        })
      )

      return { success: true, requests: requestsWithStatus }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Get requests by status for user
  getRequestsByStatus: async (userId, status) => {
    try {
      // First get all requests for user
      const { data: requests, error } = await supabase
        .from('requester')
        .select('req_id, req_fname, req_lname, req_purpose, req_date')
        .eq('user_id', userId)
        .order('req_date', { ascending: false })

      if (error) throw error

      // Filter by status
      const requestsWithStatus = await Promise.all(
        requests.map(async (req) => {
          const { data: statusData } = await supabase
            .from('status')
            .select('status_current')
            .eq('req_id', req.req_id)
            .order('status_update_date', { ascending: false })
            .limit(1)

          return {
            ...req,
            status_current: statusData?.[0]?.status_current || 'pending'
          }
        })
      )

      const filteredRequests = requestsWithStatus.filter(req => 
        req.status_current === status
      )

      return { success: true, requests: filteredRequests }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

export default supabase