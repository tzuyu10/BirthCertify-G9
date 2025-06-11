import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { supabase } from '../../supabase';

const initialState = {
  requests: [],
  loading: false,
  error: null,
  currentRequest: null,
  filters: {
    statusId: 'all',
    purpose: 'all',
    dateRange: null
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

  const checkDuplicateRequest = async (requestData) => {
    let query = supabase
      .from('requester')
      .select('*, status:status_id(status_current)')
      .eq('user_id', requestData.userId)
      .eq('req_fname', requestData.firstName)
      .eq('req_lname', requestData.lastName)
      .eq('req_contact', requestData.contactNumber)
      .eq('req_purpose', requestData.purpose);

    if (requestData.ownerId !== null && requestData.ownerId !== undefined) {
      query = query.eq('owner_id', requestData.ownerId);
    }

    if (requestData.bcNumber !== null && requestData.bcNumber !== undefined) {
      query = query.eq('bc_number', requestData.bcNumber);
    }

    const { data: existingRequests, error } = await query;
    if (error) throw error;

    return existingRequests?.some(req =>
      req.status?.status_current &&
      !['completed', 'cancelled'].includes(req.status.status_current.toLowerCase())
    );
  };

  const actions = {
    setLoading: (loading) => dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: loading }),
    setError: (error) => dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error }),
    clearError: () => dispatch({ type: REQUEST_ACTIONS.CLEAR_ERROR }),

    fetchRequests: async () => {
      try {
        dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });
        const { data, error } = await supabase.from('requester').select('*').order('req_date', { ascending: false });
        if (error) throw error;
        dispatch({ type: REQUEST_ACTIONS.SET_REQUESTS, payload: data || [] });
      } catch (error) {
        dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error.message });
      }
    },

    createRequest: async (requestData) => {
      try {
        dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });

        const isDuplicate = await checkDuplicateRequest(requestData);
        if (isDuplicate) {
          throw new Error('A similar request already exists and is still in progress.');
        }

        const { data: insertedRequest, error } = await supabase
          .from('requester')
          .insert([{
            user_id: requestData.userId,
            owner_id: requestData.ownerId,
            bc_number: requestData.bcNumber,
            status_id: requestData.statusId,
            req_fname: requestData.firstName,
            req_lname: requestData.lastName,
            req_contact: requestData.contactNumber,
            req_purpose: requestData.purpose,
            req_date: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;

        const reqId = insertedRequest.req_id;

        const { error: statusError } = await supabase
          .from('status')
          .insert([{ req_id: reqId, status_current: 'pending' }]);
        if (statusError) throw statusError;

        const { error: bcError } = await supabase
          .from('birthcertificate')
          .insert([{ req_id: reqId }]);
        if (bcError) throw bcError;

        dispatch({ type: REQUEST_ACTIONS.ADD_REQUEST, payload: insertedRequest });
        return insertedRequest;
      } catch (error) {
        dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    updateRequest: async (id, updateData) => {
      try {
        dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });
        const { data, error } = await supabase
          .from('requester')
          .update({ ...updateData })
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

    deleteRequest: async (id) => {
      try {
        dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });
        const { error } = await supabase.from('requester').delete().eq('req_id', id);
        if (error) throw error;
        dispatch({ type: REQUEST_ACTIONS.DELETE_REQUEST, payload: id });
      } catch (error) {
        dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    getRequestById: async (id) => {
      try {
        dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });
        const { data, error } = await supabase.from('requester').select('*').eq('req_id', id).single();
        if (error) throw error;
        dispatch({ type: REQUEST_ACTIONS.SET_CURRENT_REQUEST, payload: data });
        dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: false });
        return data;
      } catch (error) {
        dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    fetchFilteredRequests: async (filters = {}) => {
      try {
        dispatch({ type: REQUEST_ACTIONS.SET_LOADING, payload: true });
        let query = supabase.from('requester').select('*');

        if (filters.statusId && filters.statusId !== 'all') {
          query = query.eq('status_id', filters.statusId);
        }

        if (filters.purpose && filters.purpose !== 'all') {
          query = query.ilike('req_purpose', `%${filters.purpose}%`);
        }

        if (filters.dateRange) {
          if (filters.dateRange.startDate) {
            query = query.gte('req_date', filters.dateRange.startDate);
          }
          if (filters.dateRange.endDate) {
            query = query.lte('req_date', filters.dateRange.endDate);
          }
        }

        const { data, error } = await query.order('req_date', { ascending: false });
        if (error) throw error;
        dispatch({ type: REQUEST_ACTIONS.SET_REQUESTS, payload: data || [] });
        return data;
      } catch (error) {
        dispatch({ type: REQUEST_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    setFilters: (filters) => dispatch({ type: REQUEST_ACTIONS.SET_FILTERS, payload: filters }),
    setCurrentRequest: (request) => dispatch({ type: REQUEST_ACTIONS.SET_CURRENT_REQUEST, payload: request }),
    clearCurrentRequest: () => dispatch({ type: REQUEST_ACTIONS.CLEAR_CURRENT_REQUEST }),

    getFilteredRequests: () => {
      let filtered = state.requests;

      if (state.filters.statusId !== 'all') {
        filtered = filtered.filter(req => req.status_id === state.filters.statusId);
      }

      if (state.filters.purpose !== 'all') {
        filtered = filtered.filter(req => req.req_purpose.toLowerCase() === state.filters.purpose.toLowerCase());
      }

      if (state.filters.dateRange) {
        const { startDate, endDate } = state.filters.dateRange;
        filtered = filtered.filter(req => {
          const date = new Date(req.req_date);
          return (!startDate || date >= new Date(startDate)) && (!endDate || date <= new Date(endDate));
        });
      }

      return filtered;
    },

    getRequestStats: () => {
      const requests = state.requests;
      return {
        total: requests.length,
        byStatus: requests.reduce((acc, r) => {
          acc[r.status_id] = (acc[r.status_id] || 0) + 1;
          return acc;
        }, {}),
        byPurpose: requests.reduce((acc, r) => {
          acc[r.req_purpose] = (acc[r.req_purpose] || 0) + 1;
          return acc;
        }, {})
      };
    }
  };

  useEffect(() => {
    actions.fetchRequests();
    const subscription = supabase
      .channel('requester')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requester' }, (payload) => {
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
          default:
            break;
        }
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

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
  if (!context) throw new Error('useRequest must be used within a RequestProvider');
  return context;
};

export default RequestContext;
