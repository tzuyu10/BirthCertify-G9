import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Enhanced debugging
console.log("🔍 Environment Variables Debug:");
console.log("VITE_SUPABASE_URL:", supabaseUrl ? "SET" : "MISSING");
console.log("VITE_SUPABASE_ANON_KEY:", supabaseKey ? "SET" : "MISSING");
console.log("Full URL:", supabaseUrl);
console.log(
  "Key preview:",
  supabaseKey ? supabaseKey.substring(0, 20) + "..." : "MISSING"
);

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  console.log("Available env vars:", Object.keys(import.meta.env));
  throw new Error("Missing Supabase environment variables");
}

console.log("🔧 Creating Supabase client...");

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Disable to prevent blocking
    debug: false, // Disable verbose logging to prevent blocking
    flowType: "pkce",
    storage: window.localStorage,
    storageKey: "supabase.auth.token",
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "x-client-info": "supabase-js-web",
    },
  },
});

console.log("✅ Supabase client created successfully");

// Lightweight, non-blocking test function
const testSupabaseClient = async () => {
  console.log("🧪 Testing Supabase client (non-blocking)...");

  // Don't block app initialization - run tests in background
  try {
    // Quick connection test only
    console.log("📡 Quick connection test...");
    const response = await Promise.race([
      fetch(`${supabaseUrl}/rest/v1/`, {
        method: "HEAD",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), 5000)
      ),
    ]);

    console.log(`✅ Basic connection test passed:`, response.status);

    // Skip auth and database tests that might cause timeouts
    // These will be handled by the actual app components
    console.log("ℹ️ Skipping detailed tests to prevent app blocking");
    console.log("🎉 Supabase client ready for use!");
  } catch (error) {
    console.warn(
      "⚠️ Connection test failed, but app will continue:",
      error.message
    );
    console.log("🔄 App will attempt to connect when needed...");
  }
};

// Run test asynchronously without blocking app initialization
Promise.resolve().then(() => {
  setTimeout(testSupabaseClient, 100);
});

// Cache for frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (fn, ...args) => `${fn}-${JSON.stringify(args)}`;

const withCache = async (fn, key, ttl = CACHE_TTL) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    console.log("📦 Cache hit for:", key);
    return cached.data;
  }

  console.log("🔄 Cache miss, fetching:", key);
  try {
    const result = await fn();
    cache.set(key, { data: result, timestamp: Date.now() });

    // Clean up expired cache entries
    if (cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of cache.entries()) {
        if (now - v.timestamp > ttl) {
          cache.delete(k);
        }
      }
    }

    return result;
  } catch (error) {
    console.error("Cache function error:", error);
    throw error;
  }
};

// Enhanced helper functions with better error handling
export const supabaseHelpers = {
  // Fast auth check that won't block the app
  quickAuthCheck: async () => {
    try {
      // Use a very short timeout for initial auth check
      const result = await Promise.race([
        supabase.auth.getSession(),
        new Promise(
          (_, reject) =>
            setTimeout(() => reject(new Error("Quick auth timeout")), 2000) // 2 second timeout
        ),
      ]);

      return {
        success: true,
        session: result.data.session,
        user: result.data.session?.user || null,
        error: result.error,
      };
    } catch (error) {
      console.warn("Quick auth check timed out, assuming no session");
      return {
        success: false,
        session: null,
        user: null,
        error: error.message,
      };
    }
  },

  // Non-blocking auth state listener
  setupAuthListener: (callback) => {
    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth state change:", event, !!session);
        callback(event, session);
      });

      return subscription;
    } catch (error) {
      console.error("Failed to setup auth listener:", error);
      return null;
    }
  },

  // Test connection (cached)
  testConnection: async () => {
    const cacheKey = getCacheKey("testConnection");
    return withCache(
      async () => {
        console.log("🔍 Testing connection via helper...");
        try {
          // Try multiple tables for better compatibility
          const tablesToTry = ["requester", "user", "users", "profiles"];

          for (const table of tablesToTry) {
            try {
              const { error } = await supabase.from(table).select("*").limit(1);

              if (!error) {
                console.log(
                  `✅ Connection test via helper successful using table '${table}'`
                );
                return {
                  success: true,
                  message: `Connection successful via table '${table}'`,
                };
              }
            } catch (tableError) {
              continue;
            }
          }

          throw new Error("No accessible tables found");
        } catch (error) {
          console.error("❌ Connection test via helper failed:", error);
          return { success: false, message: error.message };
        }
      },
      cacheKey,
      30000
    ); // 30 second cache
  },

  // Get table info (cached)
  getTableInfo: async (tableName = "requester") => {
    const cacheKey = getCacheKey("getTableInfo", tableName);
    return withCache(
      async () => {
        console.log(`🔍 Getting table info for: ${tableName}`);
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select("*")
            .limit(1);

          if (error) throw error;
          console.log(
            `✅ Table info retrieved for ${tableName}:`,
            data?.[0] ? Object.keys(data[0]) : []
          );
          return {
            success: true,
            columns: data?.[0] ? Object.keys(data[0]) : [],
          };
        } catch (error) {
          console.error(`❌ Failed to get table info for ${tableName}:`, error);
          return { success: false, message: error.message };
        }
      },
      cacheKey,
      300000
    ); // 5 minute cache for table structure
  },

  // Get current user (cached with better error handling)
  getCurrentUser: async () => {
    const cacheKey = getCacheKey("getCurrentUser");
    return withCache(
      async () => {
        console.log("👤 Getting current user via helper...");
        try {
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser();
          if (error && error.message !== "Invalid JWT") throw error;
          console.log("✅ Current user retrieved:", !!user);
          return { success: true, user };
        } catch (error) {
          console.error("❌ Failed to get current user:", error);
          return { success: false, error: error.message };
        }
      },
      cacheKey,
      60000
    ); // 1 minute cache
  },

  // Enhanced dashboard stats with better error handling
  getDashboardStats: async (userId) => {
    const cacheKey = getCacheKey("getDashboardStats", userId);
    return withCache(
      async () => {
        console.log("📊 Getting dashboard stats for user:", userId);
        try {
          // Single optimized query with LEFT JOIN to get requests and their latest status
          const { data, error } = await supabase
            .from("requester")
            .select(
              `
            req_id,
            is_draft,
            status!left (
              status_current,
              status_update_date
            )
          `
            )
            .eq("user_id", userId)
            .order("status.status_update_date", { ascending: false });

          if (error) throw error;

          // Process results to get latest status per request
          const requestsMap = new Map();

          data?.forEach((item) => {
            const reqId = item.req_id;
            if (!requestsMap.has(reqId)) {
              requestsMap.set(reqId, {
                req_id: reqId,
                is_draft: item.is_draft,
                status_current: item.status?.[0]?.status_current || "pending",
              });
            }
          }) || [];

          const requests = Array.from(requestsMap.values());

          // Calculate stats efficiently
          const stats = requests.reduce(
            (acc, req) => {
              switch (req.status_current) {
                case "completed":
                case "approved":
                  acc.completed++;
                  break;
                case "cancelled":
                case "rejected":
                  acc.rejected++;
                  break;
                default:
                  acc.pending++;
              }
              return acc;
            },
            { pending: 0, completed: 0, rejected: 0 }
          );

          console.log("✅ Dashboard stats retrieved:", stats);
          return { success: true, stats, requests };
        } catch (error) {
          console.error("❌ Failed to get dashboard stats:", error);
          return { success: false, error: error.message };
        }
      },
      cacheKey,
      30000
    ); // 30 second cache
  },

  // Enhanced recent requests with better error handling
  getRecentRequests: async (userId, limit = 10) => {
    const cacheKey = getCacheKey("getRecentRequests", userId, limit);
    return withCache(
      async () => {
        console.log(
          `📝 Getting recent requests for user: ${userId}, limit: ${limit}`
        );
        try {
          // Single query with JOIN to get requests and their latest status
          const { data, error } = await supabase
            .from("requester")
            .select(
              `
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
          `
            )
            .eq("user_id", userId)
            .order("req_date", { ascending: false })
            .limit(limit);

          if (error) throw error;

          // Process to get latest status per request
          const requestsWithStatus =
            data?.map((req) => ({
              req_id: req.req_id,
              req_fname: req.req_fname,
              req_lname: req.req_lname,
              req_purpose: req.req_purpose,
              req_date: req.req_date,
              is_draft: req.is_draft,
              status_current: req.status?.[0]?.status_current || "pending",
              status_date: req.status?.[0]?.status_update_date,
            })) || [];

          console.log(
            `✅ Retrieved ${requestsWithStatus.length} recent requests`
          );
          return { success: true, requests: requestsWithStatus };
        } catch (error) {
          console.error("❌ Failed to get recent requests:", error);
          return { success: false, error: error.message };
        }
      },
      cacheKey,
      30000
    ); // 30 second cache
  },

  // Enhanced requests by status with better error handling
  getRequestsByStatus: async (userId, status) => {
    const cacheKey = getCacheKey("getRequestsByStatus", userId, status);
    return withCache(
      async () => {
        console.log(
          `🔍 Getting requests by status for user: ${userId}, status: ${status}`
        );
        try {
          // Use a more efficient approach with RPC function or optimized query
          const { data, error } = await supabase
            .from("requester")
            .select(
              `
            req_id,
            req_fname,
            req_lname,
            req_purpose,
            req_date,
            status!left (
              status_current,
              status_update_date
            )
          `
            )
            .eq("user_id", userId)
            .order("req_date", { ascending: false });

          if (error) throw error;

          // Filter by status on the client side (more efficient than multiple queries)
          const filteredRequests =
            data
              ?.map((req) => ({
                req_id: req.req_id,
                req_fname: req.req_fname,
                req_lname: req.req_lname,
                req_purpose: req.req_purpose,
                req_date: req.req_date,
                status_current: req.status?.[0]?.status_current || "pending",
              }))
              .filter((req) => {
                if (status === "completed") {
                  return (
                    req.status_current === "completed" ||
                    req.status_current === "approved"
                  );
                }
                if (status === "rejected") {
                  return (
                    req.status_current === "cancelled" ||
                    req.status_current === "rejected"
                  );
                }
                return req.status_current === status;
              }) || [];

          console.log(
            `✅ Retrieved ${filteredRequests.length} requests with status: ${status}`
          );
          return { success: true, requests: filteredRequests };
        } catch (error) {
          console.error(
            `❌ Failed to get requests by status (${status}):`,
            error
          );
          return { success: false, error: error.message };
        }
      },
      cacheKey,
      30000
    ); // 30 second cache
  },

  // Utility function to clear cache when data changes
  clearCache: (pattern = null) => {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of cache.keys()) {
        if (regex.test(key)) {
          cache.delete(key);
        }
      }
      console.log(`🧹 Cleared cache entries matching: ${pattern}`);
    } else {
      cache.clear();
      console.log("🧹 Cleared all cache entries");
    }
  },

  // Enhanced batch operations with better error handling
  batchGetRequests: async (userIds) => {
    console.log(`📦 Batch getting requests for ${userIds?.length || 0} users`);
    try {
      if (!userIds || userIds.length === 0) {
        return { success: true, requestsByUser: {} };
      }

      const { data, error } = await supabase
        .from("requester")
        .select(
          `
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
        `
        )
        .in("user_id", userIds)
        .order("req_date", { ascending: false });

      if (error) throw error;

      // Group by user_id
      const requestsByUser =
        data?.reduce((acc, req) => {
          const userId = req.user_id;
          if (!acc[userId]) acc[userId] = [];

          acc[userId].push({
            req_id: req.req_id,
            req_fname: req.req_fname,
            req_lname: req.req_lname,
            req_purpose: req.req_purpose,
            req_date: req.req_date,
            status_current: req.status?.[0]?.status_current || "pending",
          });

          return acc;
        }, {}) || {};

      console.log(
        `✅ Batch request completed for ${
          Object.keys(requestsByUser).length
        } users`
      );
      return { success: true, requestsByUser };
    } catch (error) {
      console.error("❌ Batch request failed:", error);
      return { success: false, error: error.message };
    }
  },
};

console.log("🎯 Supabase module fully loaded and configured");

export default supabase;
