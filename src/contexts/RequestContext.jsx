import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from './AuthContext';

const initialState = {
  requests: [],
  loading: false,
  error: null,
  currentRequest: null,
  filters: {
    statusId: 'all',
    purpose: 'all',
    dateRange: null,
    isDraft: 'all'
  },
  cache: new Map(), // Add caching
  lastFetchTime: null
};

const REQUEST_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_REQUESTS: 'SET_REQUESTS',
  ADD_REQUEST: 'ADD_REQUEST',
  UPDATE_REQUEST: 'UPDATE_REQUEST',
  DELETE_REQUEST: 'DELETE_REQUEST',
  SET_CURRENT_REQUEST: 'SET_CURRENT_REQUEST',
  SET_FILTERS: 'SET_FILTERS',
  CLEAR_CURRENT_REQUEST: 'CLEAR_CURRENT_REQUEST',
  UPDATE_CACHE: 'UPDATE_CACHE',
  BATCH_UPDATE: 'BATCH_UPDATE'
};

const requestReducer = (state, action) => {
  switch (action.type) {
    case REQUEST_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case REQUEST_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    case REQUEST_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    case REQUEST_ACTIONS.SET_REQUESTS:
      return { 
        ...state, 
        requests: action.payload, 
        loading: false,
        lastFetchTime: Date.now()
      };
    case REQUEST_ACTIONS.ADD_REQUEST:
      return { 
        ...state, 
        requests: [action.payload, ...state.requests], // Add to beginning for better UX
        loading: false 
      };
    case REQUEST_ACTIONS.UPDATE_REQUEST:
      return {
        ...state,
        requests: state.requests.map(req => 
          req.req_id === action.payload.req_id ? { ...req, ...action.payload } : req
        ),
        currentRequest: state.currentRequest?.req_id === action.payload.req_id 
          ? { ...state.currentRequest, ...action.payload } 
          : state.currentRequest,
        loading: false
      };
    case REQUEST_ACTIONS.DELETE_REQUEST:
      return {
        ...state,
        requests: state.requests.filter(req => req.req_id !== action.payload),
        currentRequest: state.currentRequest?.req_id === action.payload ? null : state.currentRequest,
        loading: false
      };
    case REQUEST_ACTIONS.SET_CURRENT_REQUEST:
      return { ...state, currentRequest: action.payload };
    case REQUEST_ACTIONS.CLEAR_CURRENT_REQUEST:
      return { ...state, currentRequest: null };
    case REQUEST_ACTIONS.SET_FILTERS:
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case REQUEST_ACTIONS.UPDATE_CACHE:
      const newCache = new Map(state.cache);
      newCache.set(action.payload.key, {
        data: action.payload.data,
        timestamp: Date.now()
      });
      return { ...state, cache: newCache };
    case REQUEST_ACTIONS.BATCH_UPDATE:
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

const RequestContext = createContext();

// Cache utilities
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const getCacheKey = (operation, params) => `${operation}_${JSON.stringify(params)}`;
const isCacheValid = (cacheEntry) => {
  return cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_DURATION;
};

export const RequestProvider = ({ children }) => {
  const [state, dispatch] = useReducer(requestReducer, initialState);
  const { user: currentUser } = useAuth();
  const abortControllerRef = useRef(null);
  const requestQueue = useRef([]);
  const isProcessingQueue = useRef(false);

  // Debounced error setter
  const setErrorDebounced = useCallback((error) => {
    setTimeout(() => {
      dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error });
    }, 100);
  }, []);

  // Request queue processor for batch operations
  const processRequestQueue = useCallback(async () => {
    if (isProcessingQueue.current || requestQueue.current.length === 0) return;
    
    isProcessingQueue.current = true;
    const batch = requestQueue.current.splice(0, 10); // Process in batches of 10
    
    try {
      await Promise.allSettled(batch.map(request => request()));
    } finally {
      isProcessingQueue.current = false;
      if (requestQueue.current.length > 0) {
        setTimeout(processRequestQueue, 100); // Continue processing
      }
    }
  }, []);

  // Optimized fetch with caching and request deduplication
  const fetchFilteredRequests = useCallback(async (filters = {}) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });

      // Check cache first
      const cacheKey = getCacheKey('fetchFiltered', filters);
      const cached = state.cache.get(cacheKey);
      if (isCacheValid(cached)) {
        dispatch({ type: REQUEST_ACTIONS.SET_REQUESTS, payload: cached.data });
        return cached.data;
      }

      // Optimized select clause - only get what we need
      const baseFields = 'req_id,req_fname,req_lname,req_purpose,req_contact,req_date,bc_number,owner_id,is_draft';
      let selectClause = baseFields;

      if (filters.includeOwner) {
        selectClause += ',owner:owner_id(owner_id,owner_fname,owner_lname)';
      }
      if (filters.includeStatus) {
        selectClause += ',status:status_id(status_current)';
      }

      let query = supabase
        .from('requester')
        .select(selectClause)
        .abortSignal(abortController.signal);

      // Apply filters efficiently
      if (filters.statusId && filters.statusId !== 'all') {
        query = query.eq('status_id', filters.statusId);
      }
      if (filters.purpose && filters.purpose !== 'all') {
        query = query.ilike('req_purpose', `%${filters.purpose}%`);
      }
      if (filters.isDraft !== undefined && filters.isDraft !== 'all') {
        query = query.eq('is_draft', filters.isDraft === 'true');
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.dateRange?.startDate) {
        query = query.gte('req_date', filters.dateRange.startDate);
      }
      if (filters.dateRange?.endDate) {
        query = query.lte('req_date', filters.dateRange.endDate);
      }

      // Optimize ordering and limiting
      query = query
        .order('req_date', { ascending: false })
        .limit(filters.limit || 100); // Default limit to prevent large queries

      const { data, error } = await query;
      
      if (abortController.signal.aborted) return;
      if (error) throw error;
      
      const result = data || [];
      
      // Update cache
      dispatch({ 
        type: REQUEST_ACTIONS.UPDATE_CACHE, 
        payload: { key: cacheKey, data: result }
      });
      
      dispatch({ type: REQUEST_ACTIONS.SET_REQUESTS, payload: result });
      return result;
    } catch (error) {
      if (error.name === 'AbortError') return;
      setErrorDebounced(error.message);
      throw error;
    }
  }, [state.cache, setErrorDebounced]);

  // Optimized duplicate check with early exit
  const checkDuplicateRequest = useCallback(async (requestData) => {
    try {
      const { data, error } = await supabase
        .from('requester')
        .select('req_id,status:status_id(status_current)')
        .eq('user_id', requestData.userId)
        .eq('req_fname', requestData.firstName)
        .eq('req_lname', requestData.lastName)
        .eq('req_contact', requestData.contactNumber)
        .eq('req_purpose', requestData.purpose)
        .eq('is_draft', false)
        .limit(1); // Only need to know if one exists

      if (error) return false;

      return data?.some(req => {
        const status = req.status?.status_current?.toLowerCase();
        return status && !['completed', 'cancelled', 'rejected', 'approved'].includes(status);
      });
    } catch (error) {
      console.error('Duplicate check error:', error);
      return false;
    }
  }, []);

  // Optimized getRequestById with caching
  const getRequestById = useCallback(async (id) => {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) throw new Error("Invalid request ID.");

    try {
      dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });
      
      // Check cache first
      const cacheKey = getCacheKey('getById', parsedId);
      const cached = state.cache.get(cacheKey);
      if (isCacheValid(cached)) {
        dispatch({ type: REQUEST_ACTIONS.SET_CURRENT_REQUEST, payload: cached.data });
        dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: false });
        return cached.data;
      }

      const { data, error } = await supabase
        .from('requester')
        .select(`
          *,
          owner:owner_id(*,
            parent:parent_id(*),
            address:address_id(*)
          ),
          status:status_id(status_current)
        `)
        .eq('req_id', parsedId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Request not found.");

      // Update cache
      dispatch({ 
        type: REQUEST_ACTIONS.UPDATE_CACHE, 
        payload: { key: cacheKey, data }
      });

      dispatch({ type: REQUEST_ACTIONS.SET_CURRENT_REQUEST, payload: data });
      dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: false });
      return data;
    } catch (error) {
      setErrorDebounced(error.message);
      throw error;
    }
  }, [state.cache, setErrorDebounced]);

  // Optimized cascading delete with transaction-like behavior
  const deleteDraftWithCascade = useCallback(async (reqId) => {
    try {
      console.log('Starting optimized cascading delete for request:', reqId);
      
      // Get all related data in one query
      const { data: requestData, error: requestError } = await supabase
        .from('requester')
        .select(`
          req_id,
          owner_id,
          owner:owner_id(owner_id, parent_id, address_id)
        `)
        .eq('req_id', reqId)
        .single();

      if (requestError) throw requestError;

      // Batch delete operations
      const deleteOperations = [];

      // Status table
      deleteOperations.push(
        supabase.from('status').delete().eq('req_id', reqId)
      );

      // Birth certificate table
      deleteOperations.push(
        supabase.from('birthcertificate').delete().eq('req_id', reqId)
      );

      if (requestData.owner) {
        const owner = requestData.owner;
        
        // Owner table
        deleteOperations.push(
          supabase.from('owner').delete().eq('owner_id', owner.owner_id)
        );

        // Parent table
        if (owner.parent_id) {
          deleteOperations.push(
            supabase.from('parent').delete().eq('parent_id', owner.parent_id)
          );
        }

        // Address table
        if (owner.address_id) {
          deleteOperations.push(
            supabase.from('address').delete().eq('address_id', owner.address_id)
          );
        }
      }

      // Execute all delete operations
      await Promise.allSettled(deleteOperations);

      // Finally delete the main request
      const { error: requesterDeleteError } = await supabase
        .from('requester')
        .delete()
        .eq('req_id', reqId);

      if (requesterDeleteError) throw requesterDeleteError;

      // Clear cache entries related to this request
      const newCache = new Map(state.cache);
      for (const [key] of newCache) {
        if (key.includes(reqId.toString())) {
          newCache.delete(key);
        }
      }
      
      dispatch({ 
        type: REQUEST_ACTIONS.BATCH_UPDATE, 
        payload: { cache: newCache }
      });

      console.log('Optimized cascading delete completed for request:', reqId);
      return { success: true };
      
    } catch (error) {
      console.error('Error in cascading delete:', error);
      throw error;
    }
  }, [state.cache]);

  // Memoized actions object
  const actions = useMemo(() => ({
    setLoading: (loading) => dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: loading }),
    setError: (error) => setErrorDebounced(error),
    clearError: () => dispatch({ type: REQUEST_ACTIONS.CLEAR_ERROR }),
    fetchFilteredRequests,
    getRequestById,
    deleteDraftWithCascade,

    // Optimized fetchRequests
    fetchRequests: async (userId = null) => {
      return await fetchFilteredRequests({ 
        userId, 
        includeOwner: true, 
        includeStatus: true,
        limit: 100
      });
    },

    fetchUserRequests: async () => {
      if (!currentUser?.id) return [];
      return await fetchFilteredRequests({ 
        userId: currentUser.id, 
        includeOwner: true, 
        includeStatus: true 
      });
    },

    // Optimized createInitialRequest
    createInitialRequest: async (requestData) => {
      try {
        dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });
        
        // Check for duplicates only if not creating a draft
        if (!requestData.isDraft) {
          const isDuplicate = await checkDuplicateRequest(requestData);
          if (isDuplicate) {
            throw new Error('A similar request already exists and is still in progress.');
          }
        }

        // Prepare insert data
        const insertData = {
          user_id: requestData.userId,
          owner_id: null,
          bc_number: requestData.bcNumber || null,
          req_fname: requestData.firstName.trim(),
          req_lname: requestData.lastName.trim(),
          req_contact: requestData.contactNumber.trim(),
          req_purpose: requestData.purpose.trim(),
          req_date: new Date().toISOString(),
          is_draft: requestData.isDraft || true
        };

        const { data: insertedRequest, error } = await supabase
          .from('requester')
          .insert([insertData])
          .select()
          .single();

        if (error) throw error;

        const reqId = insertedRequest.req_id;

        // Batch create related records for non-draft requests
        if (!requestData.isDraft) {
          const relatedInserts = [
            supabase.from('status').insert([{ req_id: reqId, status_current: 'pending' }]),
            supabase.from('birthcertificate').insert([{ req_id: reqId }])
          ];
          
          const results = await Promise.allSettled(relatedInserts);
          const failures = results.filter(result => result.status === 'rejected');
          
          if (failures.length > 0) {
            console.error('Some related records failed to create:', failures);
            // Could implement rollback here if needed
          }
        }

        // Clear relevant cache entries
        const newCache = new Map(state.cache);
        for (const [key] of newCache) {
          if (key.includes('fetchFiltered')) {
            newCache.delete(key);
          }
        }
        
        dispatch({ 
          type: REQUEST_ACTIONS.BATCH_UPDATE, 
          payload: { cache: newCache }
        });

        dispatch({ type: REQUEST_ACTIONS.ADD_REQUEST, payload: insertedRequest });
        return insertedRequest;
      } catch (error) {
        setErrorDebounced(error.message);
        throw error;
      }
    },

    createRequest: async (requestData) => {
      return await actions.createInitialRequest({
        ...requestData,
        isDraft: false
      });
    },

    // Optimized update with cache invalidation
    updateRequest: async (id, updateData) => {
      try {
        dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });
        
        const { data, error } = await supabase
          .from('requester')
          .update(updateData)
          .eq('req_id', id)
          .select()
          .single();
          
        if (error) throw error;
        
        // Clear cache entries for this request
        const newCache = new Map(state.cache);
        for (const [key] of newCache) {
          if (key.includes(id.toString()) || key.includes('fetchFiltered')) {
            newCache.delete(key);
          }
        }
        
        dispatch({ 
          type: REQUEST_ACTIONS.BATCH_UPDATE, 
          payload: { cache: newCache }
        });
        
        dispatch({ type: REQUEST_ACTIONS.UPDATE_REQUEST, payload: data });
        return data;
      } catch (error) {
        setErrorDebounced(error.message);
        throw error;
      }
    },

    updateRequestStatus: async (reqId, newStatus) => {
      try {
        dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });
        
        const { error } = await supabase
          .from('status')
          .update({ status_current: newStatus })
          .eq('req_id', reqId);
          
        if (error) throw error;
        
        // Refresh the current request
        await actions.getRequestById(reqId);
      } catch (error) {
        setErrorDebounced(error.message);
        throw error;
      }
    },

    deleteRequest: async (id) => {
      try {
        dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });
        
        // Clean up session storage
        if (id === sessionStorage.getItem("currentRequestId")) {
          sessionStorage.removeItem("currentRequestId");
        }

        // Batch delete related records
        const deleteOperations = [
          supabase.from('status').delete().eq('req_id', id),
          supabase.from('birthcertificate').delete().eq('req_id', id)
        ];
        
        await Promise.allSettled(deleteOperations);
        
        // Delete the main request
        const { error } = await supabase.from('requester').delete().eq('req_id', id);
        if (error) throw error;
        
        // Clear cache
        const newCache = new Map(state.cache);
        for (const [key] of newCache) {
          if (key.includes(id.toString()) || key.includes('fetchFiltered')) {
            newCache.delete(key);
          }
        }
        
        dispatch({ 
          type: REQUEST_ACTIONS.BATCH_UPDATE, 
          payload: { cache: newCache }
        });
        
        dispatch({ type: REQUEST_ACTIONS.DELETE_REQUEST, payload: id });
      } catch (error) {
        setErrorDebounced(error.message);
        throw error;
      }
    },

    getCurrentUserDraft: async () => {
      if (!currentUser?.id) return null;
      
      try {
        const cacheKey = getCacheKey('userDraft', currentUser.id);
        const cached = state.cache.get(cacheKey);
        if (isCacheValid(cached)) {
          return cached.data;
        }

        const { data, error } = await supabase
          .from('requester')
          .select(`
            *,
            owner:owner_id(*,
              parent:parent_id(*),
              address:address_id(*)
            ),
            status:status_id(status_current)
          `)
          .eq('user_id', currentUser.id)
          .eq('is_draft', true)
          .order('req_date', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (error) throw error;

        // Update cache
        dispatch({ 
          type: REQUEST_ACTIONS.UPDATE_CACHE, 
          payload: { key: cacheKey, data }
        });

        return data;
      } catch (error) {
        console.error('Error fetching user draft:', error);
        return null;
      }
    },

    setFilters: (filters) => dispatch({ type: REQUEST_ACTIONS.SET_FILTERS, payload: filters }),
    
    setCurrentRequest: (request) => {
      if (request?.req_id) {
        sessionStorage.setItem('currentRequestId', request.req_id);
        window.dispatchEvent(new CustomEvent('currentRequestIdChanged', {
          detail: { key: 'currentRequestId', newValue: request.req_id }
        }));
      } else {
        sessionStorage.removeItem('currentRequestId');
        window.dispatchEvent(new CustomEvent('currentRequestIdChanged', {
          detail: { key: 'currentRequestId', newValue: null }
        }));
      }
      dispatch({ type: REQUEST_ACTIONS.SET_CURRENT_REQUEST, payload: request });
    },
    
    clearCurrentRequest: () => {
      sessionStorage.removeItem('currentRequestId');
      dispatch({ type: REQUEST_ACTIONS.CLEAR_CURRENT_REQUEST });
    },

    getRequestWithOwnerDetails: async (reqId) => {
      try {
        const cacheKey = getCacheKey('withOwner', reqId);
        const cached = state.cache.get(cacheKey);
        if (isCacheValid(cached)) {
          return cached.data;
        }

        const { data, error } = await supabase
          .from('requester')
          .select(`
            *,
            owner:owner_id(*,
              parent:parent_id(*),
              address:address_id(*)
            ),
            status:status_id(status_current)
          `)
          .eq('req_id', reqId)
          .single();
          
        if (error) throw error;

        // Update cache
        dispatch({ 
          type: REQUEST_ACTIONS.UPDATE_CACHE, 
          payload: { key: cacheKey, data }
        });

        return data;
      } catch (error) {
        console.error('Error fetching request with owner details:', error);
        throw error;
      }
    }
  }), [currentUser?.id, fetchFilteredRequests, getRequestById, deleteDraftWithCascade, checkDuplicateRequest, setErrorDebounced, state.cache]);

  // Memoized computed values
  const memoizedValues = useMemo(() => {
    const getFilteredRequests = () => {
      let filtered = state.requests;
      
      if (state.filters.statusId !== 'all') {
        filtered = filtered.filter(r => r.status?.status_current === state.filters.statusId);
      }
      
      if (state.filters.purpose !== 'all') {
        filtered = filtered.filter(r => 
          r.req_purpose.toLowerCase().includes(state.filters.purpose.toLowerCase())
        );
      }
      
      if (state.filters.isDraft !== 'all') {
        filtered = filtered.filter(r => r.is_draft === (state.filters.isDraft === 'true'));
      }
      
      if (state.filters.dateRange) {
        const { startDate, endDate } = state.filters.dateRange;
        filtered = filtered.filter(r => {
          const date = new Date(r.req_date);
          return (!startDate || date >= new Date(startDate)) && 
                 (!endDate || date <= new Date(endDate));
        });
      }
      
      return filtered;
    };

    const getRequestStats = () => {
      const stats = {
        total: state.requests.length,
        drafts: 0,
        submitted: 0,
        byStatus: {},
        byPurpose: {}
      };
      
      for (const request of state.requests) {
        if (request.is_draft) {
          stats.drafts++;
        } else {
          stats.submitted++;
          const status = request.status?.status_current || 'unknown';
          stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        }
        
        const purpose = request.req_purpose || 'unknown';
        stats.byPurpose[purpose] = (stats.byPurpose[purpose] || 0) + 1;
      }
      
      return stats;
    };

    return {
      filteredRequests: getFilteredRequests(),
      stats: getRequestStats()
    };
  }, [state.requests, state.filters]);

  // Optimized initialization
  useEffect(() => {
    if (!currentUser?.id) return;

    let isMounted = true;

    const initializeContext = async () => {
      try {
        const savedId = sessionStorage.getItem('currentRequestId');
        if (savedId && isMounted) {
          try {
            await actions.getRequestById(savedId);
          } catch (err) {
            console.warn('Failed to load saved request, clearing session:', err);
            sessionStorage.removeItem('currentRequestId');
            if (isMounted) {
              await actions.fetchUserRequests();
            }
          }
        } else if (isMounted) {
          await actions.fetchUserRequests();
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error initializing request context:', error);
          setErrorDebounced(error.message);
        }
      }
    };

    initializeContext();

    // Optimized real-time subscription
    const subscription = supabase
      .channel('requester_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'requester',
        filter: `user_id=eq.${currentUser.id}` // Only listen to current user's changes
      }, (payload) => {
        if (!isMounted) return;
        
        // Queue updates to prevent rapid re-renders
        requestQueue.current.push(() => {
          switch (payload.eventType) {
            case 'INSERT':
              dispatch({ type: REQUEST_ACTIONS.ADD_REQUEST, payload: payload.new });
              break;
            case 'UPDATE':
              dispatch({ type: REQUEST_ACTIONS.UPDATE_REQUEST, payload: payload.new });
              break;
            case 'DELETE':
              dispatch({ type: REQUEST_ACTIONS.DELETE_REQUEST, payload: payload.old.req_id });
              break;
          }
        });
        
        processRequestQueue();
      })
      .subscribe();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentUser?.id, actions, setErrorDebounced, processRequestQueue]);

  const contextValue = useMemo(() => ({
    ...state,
    ...actions,
    ...memoizedValues
  }), [state, actions, memoizedValues]);

  return (
    <RequestContext.Provider value={contextValue}>
      {children}
    </RequestContext.Provider>
  );
};

export const useRequest = () => {
  const context = useContext(RequestContext);
  if (!context) {
    throw new Error('useRequest must be used within a RequestProvider');
  }
  return context;
};

export default RequestContext;