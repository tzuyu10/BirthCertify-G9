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
  },
  // Add connection optimizations
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-web'
    }
  }
})

// Cache for frequently accessed data
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const getCacheKey = (fn, ...args) => `${fn}-${JSON.stringify(args)}`

const withCache = async (fn, key, ttl = CACHE_TTL) => {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data
  }
  
  const result = await fn()
  cache.set(key, { data: result, timestamp: Date.now() })
  
  // Clean up expired cache entries
  if (cache.size > 100) {
    const now = Date.now()
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp > ttl) {
        cache.delete(k)
      }
    }
  }
  
  return result
}

// Enhanced helper functions with major performance optimizations
export const supabaseHelpers = {
  // Test connection (cached)
  testConnection: async () => {
    const cacheKey = getCacheKey('testConnection')
    return withCache(async () => {
      try {
        const { error } = await supabase
          .from('requester')
          .select('req_id')
          .limit(1)
        
        if (error) throw error
        return { success: true, message: 'Connection successful' }
      } catch (error) {
        return { success: false, message: error.message }
      }
    }, cacheKey, 30000) // 30 second cache
  },

  // Get table info (cached)
  getTableInfo: async (tableName = 'requester') => {
    const cacheKey = getCacheKey('getTableInfo', tableName)
    return withCache(async () => {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (error) throw error
        return { success: true, columns: data?.[0] ? Object.keys(data[0]) : [] }
      } catch (error) {
        return { success: false, message: error.message }
      }
    }, cacheKey, 300000) // 5 minute cache for table structure
  },

  // Get current user (cached)
  getCurrentUser: async () => {
    const cacheKey = getCacheKey('getCurrentUser')
    return withCache(async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        return { success: true, user }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }, cacheKey, 60000) // 1 minute cache
  },

  // MAJOR OPTIMIZATION: Get dashboard stats with single query using JOIN
  getDashboardStats: async (userId) => {
    const cacheKey = getCacheKey('getDashboardStats', userId)
    return withCache(async () => {
      try {
        // Single optimized query with LEFT JOIN to get requests and their latest status
        const { data, error } = await supabase
          .from('requester')
          .select(`
            req_id,
            is_draft,
            status!left (
              status_current,
              status_update_date
            )
          `)
          .eq('user_id', userId)
          .order('status.status_update_date', { ascending: false })

        if (error) throw error

        // Process results to get latest status per request
        const requestsMap = new Map()
        
        data.forEach(item => {
          const reqId = item.req_id
          if (!requestsMap.has(reqId)) {
            requestsMap.set(reqId, {
              req_id: reqId,
              is_draft: item.is_draft,
              status_current: item.status?.[0]?.status_current || 'pending'
            })
          }
        })

        const requests = Array.from(requestsMap.values())

        // Calculate stats efficiently
        const stats = requests.reduce((acc, req) => {
          switch (req.status_current) {
            case 'completed':
            case 'approved':
              acc.completed++
              break
            case 'cancelled':
            case 'rejected':
              acc.rejected++
              break
            default:
              acc.pending++
          }
          return acc
        }, { pending: 0, completed: 0, rejected: 0 })

        return { success: true, stats, requests }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }, cacheKey, 30000) // 30 second cache
  },

  // MAJOR OPTIMIZATION: Get recent requests with single query
  getRecentRequests: async (userId, limit = 10) => {
    const cacheKey = getCacheKey('getRecentRequests', userId, limit)
    return withCache(async () => {
      try {
        // Single query with JOIN to get requests and their latest status
        const { data, error } = await supabase
          .from('requester')
          .select(`
            req_id,
            req_fname,
            req_lname,
            req_purpose,
            req_date,
            is_draft,
            status!left (
              status_current,
              status_update_date
            )
          `)
          .eq('user_id', userId)
          .order('req_date', { ascending: false })
          .limit(limit)

        if (error) throw error

        // Process to get latest status per request
        const requestsWithStatus = data.map(req => ({
          req_id: req.req_id,
          req_fname: req.req_fname,
          req_lname: req.req_lname,
          req_purpose: req.req_purpose,
          req_date: req.req_date,
          is_draft: req.is_draft,
          status_current: req.status?.[0]?.status_current || 'pending',
          status_date: req.status?.[0]?.status_update_date
        }))

        return { success: true, requests: requestsWithStatus }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }, cacheKey, 30000) // 30 second cache
  },

  // MAJOR OPTIMIZATION: Get requests by status with single query
  getRequestsByStatus: async (userId, status) => {
    const cacheKey = getCacheKey('getRequestsByStatus', userId, status)
    return withCache(async () => {
      try {
        // Use a more efficient approach with RPC function or optimized query
        const { data, error } = await supabase
          .from('requester')
          .select(`
            req_id,
            req_fname,
            req_lname,
            req_purpose,
            req_date,
            status!left (
              status_current,
              status_update_date
            )
          `)
          .eq('user_id', userId)
          .order('req_date', { ascending: false })

        if (error) throw error

        // Filter by status on the client side (more efficient than multiple queries)
        const filteredRequests = data
          .map(req => ({
            req_id: req.req_id,
            req_fname: req.req_fname,
            req_lname: req.req_lname,
            req_purpose: req.req_purpose,
            req_date: req.req_date,
            status_current: req.status?.[0]?.status_current || 'pending'
          }))
          .filter(req => {
            if (status === 'completed') {
              return req.status_current === 'completed' || req.status_current === 'approved'
            }
            if (status === 'rejected') {
              return req.status_current === 'cancelled' || req.status_current === 'rejected'
            }
            return req.status_current === status
          })

        return { success: true, requests: filteredRequests }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }, cacheKey, 30000) // 30 second cache
  },

  // Utility function to clear cache when data changes
  clearCache: (pattern = null) => {
    if (pattern) {
      const regex = new RegExp(pattern)
      for (const key of cache.keys()) {
        if (regex.test(key)) {
          cache.delete(key)
        }
      }
    } else {
      cache.clear()
    }
  },

  // Batch operations for better performance
  batchGetRequests: async (userIds) => {
    try {
      const { data, error } = await supabase
        .from('requester')
        .select(`
          req_id,
          user_id,
          req_fname,
          req_lname,
          req_purpose,
          req_date,
          status!left (
            status_current,
            status_update_date
          )
        `)
        .in('user_id', userIds)
        .order('req_date', { ascending: false })

      if (error) throw error

      // Group by user_id
      const requestsByUser = data.reduce((acc, req) => {
        const userId = req.user_id
        if (!acc[userId]) acc[userId] = []
        
        acc[userId].push({
          req_id: req.req_id,
          req_fname: req.req_fname,
          req_lname: req.req_lname,
          req_purpose: req.req_purpose,
          req_date: req.req_date,
          status_current: req.status?.[0]?.status_current || 'pending'
        })
        
        return acc
      }, {})

      return { success: true, requestsByUser }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

export default supabase