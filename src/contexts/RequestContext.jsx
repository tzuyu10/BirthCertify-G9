import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
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
  }
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
  CLEAR_CURRENT_REQUEST: 'CLEAR_CURRENT_REQUEST'
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
      return { ...state, requests: action.payload, loading: false };
    case REQUEST_ACTIONS.ADD_REQUEST:
      return { ...state, requests: [...state.requests, action.payload], loading: false };
    case REQUEST_ACTIONS.UPDATE_REQUEST:
      return {
        ...state,
        requests: state.requests.map(req => req.req_id === action.payload.req_id ? action.payload : req),
        currentRequest: state.currentRequest?.req_id === action.payload.req_id ? action.payload : state.currentRequest,
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
    default:
      return state;
  }
};

const RequestContext = createContext();

export const RequestProvider = ({ children }) => {
  const [state, dispatch] = useReducer(requestReducer, initialState);
  const { user: currentUser } = useAuth();

  const fetchFilteredRequests = useCallback(async (filters = {}) => {
    try {
      dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });

      let selectClause = `
        req_id,
        req_fname,
        req_lname,
        req_purpose,
        req_contact,
        req_date,
        bc_number,
        owner_id
      `;

      if (filters.includeOwner || filters.includeStatus) {
        selectClause += `
          ${filters.includeOwner ? ', owner:owner_id(*)' : ''}
          ${filters.includeStatus ? ', status:status_id(status_current)' : ''}
        `;
      }

      let query = supabase.from('requester').select(selectClause);

      if (filters.statusId && filters.statusId !== 'all') {
        query = query.eq('status_id', filters.statusId);
      }

      if (filters.purpose && filters.purpose !== 'all') {
        query = query.ilike('req_purpose', `%${filters.purpose}%`);
      }

      if (filters.isDraft && filters.isDraft !== 'all') {
        query = query.eq('is_draft', filters.isDraft === 'true');
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.dateRange) {
        if (filters.dateRange.startDate) {
          query = query.gte('req_date', filters.dateRange.startDate);
        }
        if (filters.dateRange.endDate) {
          query = query.lte('req_date', filters.dateRange.endDate);
        }
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query.order('req_date', { ascending: false });
      if (error) throw error;
      
      dispatch({ type: REQUEST_ACTIONS.SET_REQUESTS, payload: data || [] });
      return data;
    } catch (error) {
      dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  const checkDuplicateRequest = async (requestData) => {
    try {
      let query = supabase
        .from('requester')
        .select('*, status:status_id(status_current)')
        .eq('user_id', requestData.userId)
        .eq('req_fname', requestData.firstName)
        .eq('req_lname', requestData.lastName)
        .eq('req_contact', requestData.contactNumber)
        .eq('req_purpose', requestData.purpose)
        .eq('is_draft', false);

      if (requestData.ownerId !== null && requestData.ownerId !== undefined) {
        query = query.eq('owner_id', requestData.ownerId);
      }

      if (requestData.bcNumber !== null && requestData.bcNumber !== undefined) {
        query = query.eq('bc_number', requestData.bcNumber);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.some(req =>
        req.status?.status_current &&
        !['completed', 'cancelled', 'rejected', 'approved'].includes(req.status.status_current.toLowerCase())
      );
    } catch (error) {
      console.error('Error checking duplicate request:', error);
      return false; // Don't block request creation on duplicate check failure
    }
  };

  const getRequestById = async (id) => {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) throw new Error("Invalid request ID.");

    try {
      dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });
      
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

      dispatch({ type: REQUEST_ACTIONS.SET_CURRENT_REQUEST, payload: data });
      dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: false });
      return data;
    } catch (error) {
      dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // Add this function to your RequestContext or create a utility function
const deleteDraftWithCascade = async (reqId) => {
  try {
    console.log('Starting cascading delete for request:', reqId);
    
    // First, get the request details to find associated records
    const { data: requestData, error: requestError } = await supabase
      .from('requester')
      .select('owner_id')
      .eq('req_id', reqId)
      .single();

    if (requestError) {
      console.error('Error fetching request data:', requestError);
      throw requestError;
    }

    let ownerData = null;
    
    // If there's an owner_id, get the owner details to find parent_id and address_id
    if (requestData?.owner_id) {
      const { data: owner, error: ownerError } = await supabase
        .from('owner')
        .select('owner_id, parent_id, address_id')
        .eq('owner_id', requestData.owner_id)
        .single();

      if (ownerError) {
        console.error('Error fetching owner data:', ownerError);
        throw ownerError;
      }
      
      ownerData = owner;
    }

    // Delete in reverse order of dependencies
    
    // 1. Delete from status table first (if exists)
    const { error: statusDeleteError } = await supabase
      .from('status')
      .delete()
      .eq('req_id', reqId);
    
    if (statusDeleteError) {
      console.error('Error deleting status:', statusDeleteError);
      // Don't throw here as status might not exist
    }

    // 2. Delete from requester table
    const { error: requesterDeleteError } = await supabase
      .from('requester')
      .delete()
      .eq('req_id', reqId);

    if (requesterDeleteError) {
      console.error('Error deleting requester:', requesterDeleteError);
      throw requesterDeleteError;
    }

    // 3. Delete owner and related records if they exist
    if (ownerData) {
      // Delete owner
      const { error: ownerDeleteError } = await supabase
        .from('owner')
        .delete()
        .eq('owner_id', ownerData.owner_id);

      if (ownerDeleteError) {
        console.error('Error deleting owner:', ownerDeleteError);
        throw ownerDeleteError;
      }

      // Delete parent if exists
      if (ownerData.parent_id) {
        const { error: parentDeleteError } = await supabase
          .from('parent')
          .delete()
          .eq('parent_id', ownerData.parent_id);

        if (parentDeleteError) {
          console.error('Error deleting parent:', parentDeleteError);
          throw parentDeleteError;
        }
      }

      // Delete address if exists
      if (ownerData.address_id) {
        const { error: addressDeleteError } = await supabase
          .from('address')
          .delete()
          .eq('address_id', ownerData.address_id);

        if (addressDeleteError) {
          console.error('Error deleting address:', addressDeleteError);
          throw addressDeleteError;
        }
      }
    }

    console.log('Cascading delete completed successfully for request:', reqId);
    return { success: true };
    
  } catch (error) {
    console.error('Error in cascading delete:', error);
    throw error;
  }
};

  const actions = {
    setLoading: (loading) => dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: loading }),
    setError: (error) => dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error }),
    clearError: () => dispatch({ type: REQUEST_ACTIONS.CLEAR_ERROR }),
    fetchFilteredRequests,
    getRequestById,
    deleteDraftWithCascade,

    fetchRequests: async (userId = null) => {
      try {
        dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });
        
        let query = supabase
          .from('requester')
          .select(`*, owner:owner_id(*), status:status_id(status_current)`)
          .order('req_date', { ascending: false });
        
        if (userId) {
          query = query.eq('user_id', userId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        dispatch({ type: REQUEST_ACTIONS.SET_REQUESTS, payload: data || [] });
        return data;
      } catch (error) {
        dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    fetchUserRequests: async () => {
      if (!currentUser?.id) return [];
      return await actions.fetchRequests(currentUser.id);
    },

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
    
        const { data: insertedRequest, error } = await supabase
          .from('requester')
          .insert([{
            user_id: requestData.userId,
            owner_id: null,
            bc_number: requestData.bcNumber || null,
            req_fname: requestData.firstName,
            req_lname: requestData.lastName,
            req_contact: requestData.contactNumber,
            req_purpose: requestData.purpose,
            req_date: new Date().toISOString(),
            is_draft: requestData.isDraft || true
          }])
          .select()
          .single();
    
        if (error) throw error;
    
        const reqId = insertedRequest.req_id;
    
        // Only create status and birthcertificate records if NOT a draft
        if (!requestData.isDraft) {
          // Create status record
          const { error: statusError } = await supabase
            .from('status')
            .insert([{ req_id: reqId, status_current: 'pending' }]);
          if (statusError) throw statusError;
    
          // Create birth certificate record  
          const { error: bcError } = await supabase
            .from('birthcertificate')
            .insert([{ req_id: reqId }]);
          if (bcError) throw bcError;
        }
    
        dispatch({ type: REQUEST_ACTIONS.ADD_REQUEST, payload: insertedRequest });
        return insertedRequest;
      } catch (error) {
        dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    createRequest: async (requestData) => {
      return await actions.createInitialRequest({
        ...requestData,
        isDraft: false
      });
    },

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
        
        dispatch({ type: REQUEST_ACTIONS.UPDATE_REQUEST, payload: data });
        return data;
      } catch (error) {
        dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error.message });
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
        
        // Refresh the current request to get updated status
        await actions.getRequestById(reqId);
      } catch (error) {
        dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    deleteRequest: async (id) => {
      try {
        dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });
        
        // Clean up session storage if this is the current request
        if (id === sessionStorage.getItem("currentRequestId")) {
          sessionStorage.removeItem("currentRequestId");
        }

        // Delete related records first (foreign key constraints)
        await supabase.from('status').delete().eq('req_id', id);
        await supabase.from('birthcertificate').delete().eq('req_id', id);
        
        // Delete the main request
        const { error } = await supabase.from('requester').delete().eq('req_id', id);
        if (error) throw error;
        
        dispatch({ type: REQUEST_ACTIONS.DELETE_REQUEST, payload: id });
      } catch (error) {
        dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    getCurrentUserDraft: async () => {
      if (!currentUser?.id) return null;
      
      try {
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

    getFilteredRequests: () => {
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
    },

    getRequestStats: () => {
      const stats = {
        total: state.requests.length,
        drafts: state.requests.filter(r => r.is_draft).length,
        submitted: state.requests.filter(r => !r.is_draft).length,
        byStatus: {},
        byPurpose: {}
      };
      
      state.requests.filter(r => !r.is_draft).forEach(r => {
        const status = r.status?.status_current || 'unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      });
      
      state.requests.forEach(r => {
        const purpose = r.req_purpose || 'unknown';
        stats.byPurpose[purpose] = (stats.byPurpose[purpose] || 0) + 1;
      });
      
      return stats;
    },

    getRequestWithOwnerDetails: async (reqId) => {
      try {
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
        return data;
      } catch (error) {
        console.error('Error fetching request with owner details:', error);
        throw error;
      }
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;

    const initializeContext = async () => {
      try {
        const savedId = sessionStorage.getItem('currentRequestId');
        if (savedId) {
          try {
            await actions.getRequestById(savedId);
          } catch (err) {
            console.warn('Failed to load saved request, clearing session:', err);
            sessionStorage.removeItem('currentRequestId');
            await actions.fetchUserRequests();
          }
        } else {
          await actions.fetchUserRequests();
        }
      } catch (error) {
        console.error('Error initializing request context:', error);
        dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error.message });
      }
    };

    initializeContext();

    // Set up real-time subscription
    const subscription = supabase
      .channel('requester_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'requester' 
      }, (payload) => {
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
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser]);

  return (
    <RequestContext.Provider value={{
      ...state,
      ...actions,
      filteredRequests: actions.getFilteredRequests(),
      stats: actions.getRequestStats()
    }}>
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