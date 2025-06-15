// OwnerContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from './AuthContext';

const OwnerContext = createContext();

export const useOwner = () => useContext(OwnerContext);

export const OwnerProvider = ({ children }) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    // Owner
    owner_fname: '',
    owner_mname: '',
    owner_lname: '',
    owner_suffix: '',
    owner_sex: '',
    owner_dob: '',
    owner_nationality: 'Filipino',
    place_of_birth: '',

    // Address
    house_no: '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    country: 'Philippines',

    // Father's Info
    f_fname: '',
    f_mname: '',
    f_lname: '',

    // Mother's Info
    m_fname: '',
    m_mname: '',
    m_lname: ''
  });

  const [currentRequestId, setCurrentRequestId] = useState(() => {
    // Initialize from sessionStorage
    return sessionStorage.getItem('currentRequestId') || null;
  });
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  // Add a listener for storage changes to sync across contexts
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'currentRequestId') {
        setCurrentRequestId(e.newValue);
      }
    };

    // Listen for storage changes from other tabs/contexts
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events within the same tab
    const handleCustomStorageChange = (e) => {
      if (e.detail.key === 'currentRequestId') {
        setCurrentRequestId(e.detail.newValue);
      }
    };

    window.addEventListener('currentRequestIdChanged', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('currentRequestIdChanged', handleCustomStorageChange);
    };
  }, []);

  // Add a periodic check to ensure sync with session storage
  useEffect(() => {
    const syncWithSessionStorage = () => {
      const sessionId = sessionStorage.getItem('currentRequestId');
      if (sessionId !== currentRequestId) {
        console.log('Syncing currentRequestId from session storage:', sessionId);
        setCurrentRequestId(sessionId);
      }
    };

    // Check every 1 second for sync issues
    const interval = setInterval(syncWithSessionStorage, 1000);
    
    return () => clearInterval(interval);
  }, [currentRequestId]);

  // Save currentRequestId to sessionStorage whenever it changes
  useEffect(() => {
    if (currentRequestId) {
      sessionStorage.setItem('currentRequestId', currentRequestId);
      // Dispatch custom event for same-tab synchronization
      window.dispatchEvent(new CustomEvent('currentRequestIdChanged', {
        detail: { key: 'currentRequestId', newValue: currentRequestId }
      }));
    } else {
      sessionStorage.removeItem('currentRequestId');
      window.dispatchEvent(new CustomEvent('currentRequestIdChanged', {
        detail: { key: 'currentRequestId', newValue: null }
      }));
    }
  }, [currentRequestId]);

  // Load draft data on component mount
  useEffect(() => {
    if (currentUser?.id && !currentRequestId) {
      loadDraftData();
    }
  }, [currentUser]);

  const loadDraftData = async () => {
    try {
      setIsLoadingDraft(true);
      // Find the most recent draft request for the current user
      const { data: draftRequest, error: requestError } = await supabase
        .from('requester')
        .select('req_id, owner_id')
        .eq('user_id', currentUser.id)
        .eq('is_draft', true)
        .order('req_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (requestError) throw requestError;

      if (draftRequest) {
        setCurrentRequestId(draftRequest.req_id);

        // If there's an owner_id, load the owner data
        if (draftRequest.owner_id) {
          await loadOwnerData(draftRequest.owner_id);
        }
      }
    } catch (error) {
      console.error('Error loading draft data:', error);
    } finally {
      setIsLoadingDraft(false);
    }
  };

  // Enhanced method to set current request ID with session storage
  const setCurrentRequestIdWithSession = (reqId) => {
    console.log('Setting currentRequestId:', reqId);
    setCurrentRequestId(reqId);
    if (reqId) {
      sessionStorage.setItem('currentRequestId', reqId);
    } else {
      sessionStorage.removeItem('currentRequestId');
    }
  };

  // New method to load existing draft by ID
  const loadExistingDraft = async (reqId) => {
    try {
      setIsLoadingDraft(true);
      
      // Get the request details
      const { data: requestData, error: requestError } = await supabase
        .from('requester')
        .select('owner_id')
        .eq('req_id', reqId)
        .single();

      if (requestError) throw requestError;

      setCurrentRequestIdWithSession(reqId);

      // If there's owner data, load it
      if (requestData.owner_id) {
        await loadOwnerData(requestData.owner_id);
      } else {
        // Reset form data if no owner data exists
        resetFormData();
      }
    } catch (error) {
      console.error('Error loading existing draft:', error);
      throw error;
    } finally {
      setIsLoadingDraft(false);
    }
  };

  const loadOwnerData = async (ownerId) => {
    try {
      const { data: ownerData, error: ownerError } = await supabase
        .from('owner')
        .select(`
          *,
          parent:parent_id(*),
          address:address_id(*)
        `)
        .eq('owner_id', ownerId)
        .single();

      if (ownerError) throw ownerError;

      if (ownerData) {
        setFormData({
          owner_fname: ownerData.owner_fname || '',
          owner_mname: ownerData.owner_mname || '',
          owner_lname: ownerData.owner_lname || '',
          owner_suffix: ownerData.owner_suffix || '',
          owner_sex: ownerData.owner_sex || '',
          owner_dob: ownerData.owner_dob || '',
          owner_nationality: ownerData.owner_nationality || 'Filipino',
          place_of_birth: ownerData.place_of_birth || '',
          house_no: ownerData.address?.owner_house_no || '',
          street: ownerData.address?.owner_street || '',
          barangay: ownerData.address?.owner_barangay || '',
          city: ownerData.address?.owner_city || '',
          province: ownerData.address?.owner_province || '',
          country: ownerData.address?.owner_country || 'Philippines',
          f_fname: ownerData.parent?.owner_f_fname || '',
          f_mname: ownerData.parent?.owner_f_mname || '',
          f_lname: ownerData.parent?.owner_f_lname || '',
          m_fname: ownerData.parent?.owner_m_fname || '',
          m_mname: ownerData.parent?.owner_m_mname || '',
          m_lname: ownerData.parent?.owner_m_lname || ''
        });
      }
    } catch (error) {
      console.error('Error loading owner data:', error);
      throw error;
    }
  };

  const resetFormData = () => {
    setFormData({
      owner_fname: '',
      owner_mname: '',
      owner_lname: '',
      owner_suffix: '',
      owner_sex: '',
      owner_dob: '',
      owner_nationality: 'Filipino',
      place_of_birth: '',
      house_no: '',
      street: '',
      barangay: '',
      city: '',
      province: '',
      country: 'Philippines',
      f_fname: '',
      f_mname: '',
      f_lname: '',
      m_fname: '',
      m_mname: '',
      m_lname: ''
    });
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const findOrCreate = async (table, matchFields, insertFields) => {
    const { data: existing, error: findError } = await supabase
      .from(table)
      .select('*')
      .match(matchFields)
      .maybeSingle();

    if (findError) throw findError;
    if (existing) return existing;

    const { data: inserted, error: insertError } = await supabase
      .from(table)
      .insert(insertFields)
      .select()
      .single();

    if (insertError) throw insertError;
    return inserted;
  };

  const handleOwnerSubmission = async (isDraft = false) => {
    try {
      // Get current request ID with multiple fallback methods
      let reqId = currentRequestId || sessionStorage.getItem('currentRequestId');
      
      // If still no reqId, try to find the most recent draft for this user
      if (!reqId && currentUser?.id) {
        console.log('No currentRequestId found, searching for user draft...');
        const { data: draftRequest, error: draftError } = await supabase
          .from('requester')
          .select('req_id')
          .eq('user_id', currentUser.id)
          .eq('is_draft', true)
          .order('req_date', { ascending: false })
          .limit(1)
          .maybeSingle();
  
        if (draftError) {
          console.error('Error finding draft request:', draftError);
        } else if (draftRequest) {
          reqId = draftRequest.req_id;
          console.log('Found draft request ID:', reqId);
          setCurrentRequestIdWithSession(reqId);
        }
      }
      
      if (!reqId) {
        throw new Error('No current request ID found. Please start a new request.');
      }
  
      console.log('Using request ID:', reqId);
  
      // Verify the request exists and belongs to the current user
      const { data: requestData, error: verifyError } = await supabase
        .from('requester')
        .select('req_id, user_id, owner_id, is_draft')
        .eq('req_id', reqId)
        .single();
  
      if (verifyError) {
        console.error('Error verifying request:', verifyError);
        throw new Error('Invalid request ID. Please start a new request.');
      }
  
      if (requestData.user_id !== currentUser.id) {
        throw new Error('Request does not belong to current user.');
      }
  
      // Create or find parent record
      const parent = await findOrCreate(
        'parent',
        {
          owner_f_fname: formData.f_fname,
          owner_f_lname: formData.f_lname,
          owner_m_fname: formData.m_fname,
          owner_m_lname: formData.m_lname,
        },
        {
          owner_f_fname: formData.f_fname,
          owner_f_mname: formData.f_mname,
          owner_f_lname: formData.f_lname,
          owner_m_fname: formData.m_fname,
          owner_m_mname: formData.m_mname,
          owner_m_lname: formData.m_lname,
        }
      );
  
      // Create or find address record
      const address = await findOrCreate(
        'address',
        {
          owner_house_no: formData.house_no,
          owner_street: formData.street,
          owner_barangay: formData.barangay,
          owner_city: formData.city,
          owner_province: formData.province,
          owner_country: formData.country,
        },
        {
          owner_house_no: formData.house_no,
          owner_street: formData.street,
          owner_barangay: formData.barangay,
          owner_city: formData.city,
          owner_province: formData.province,
          owner_country: formData.country,
        }
      );
  
      let ownerData;
      
      if (requestData.owner_id) {
        // Update existing owner
        const { data: updatedOwner, error: updateError } = await supabase
          .from('owner')
          .update({
            owner_fname: formData.owner_fname,
            owner_mname: formData.owner_mname,
            owner_lname: formData.owner_lname,
            owner_suffix: formData.owner_suffix,
            owner_sex: formData.owner_sex,
            owner_dob: formData.owner_dob,
            owner_nationality: formData.owner_nationality,
            place_of_birth: formData.place_of_birth,
            parent_id: parent.parent_id,
            address_id: address.address_id,
          })
          .eq('owner_id', requestData.owner_id)
          .select()
          .single();
  
        if (updateError) throw updateError;
        ownerData = updatedOwner;
      } else {
        // Create new owner record
        const { data: newOwner, error: ownerError } = await supabase
          .from('owner')
          .insert({
            owner_fname: formData.owner_fname,
            owner_mname: formData.owner_mname,
            owner_lname: formData.owner_lname,
            owner_suffix: formData.owner_suffix,
            owner_sex: formData.owner_sex,
            owner_dob: formData.owner_dob,
            owner_nationality: formData.owner_nationality,
            place_of_birth: formData.place_of_birth,
            parent_id: parent.parent_id,
            address_id: address.address_id,
          })
          .select()
          .single();
  
        if (ownerError) throw ownerError;
        ownerData = newOwner;
  
        // Update the requester record with owner_id
        const { error: updateRequestError } = await supabase
          .from('requester')
          .update({ owner_id: ownerData.owner_id })
          .eq('req_id', reqId);
  
        if (updateRequestError) throw updateRequestError;
      }
  
      // Update draft status
      const { error: updateError } = await supabase
        .from('requester')
        .update({ is_draft: isDraft })
        .eq('req_id', reqId);
  
      if (updateError) throw updateError;
  
      // If converting from draft to submitted (not draft), create status and birthcertificate records
      if (!isDraft && requestData.is_draft) {
        // Check if status record already exists
        const { data: existingStatus, error: statusCheckError } = await supabase
          .from('status')
          .select('req_id')
          .eq('req_id', reqId)
          .maybeSingle();
  
        if (statusCheckError) throw statusCheckError;
  
        if (!existingStatus) {
          // Create status record
          const { error: statusError } = await supabase
            .from('status')
            .insert([{ req_id: reqId, status_current: 'pending' }]);
          if (statusError) throw statusError;
        } else {
          // Update existing status to pending
          const { error: statusUpdateError } = await supabase
            .from('status')
            .update({ status_current: 'pending' })
            .eq('req_id', reqId);
          if (statusUpdateError) throw statusUpdateError;
        }
  
        // Check if birthcertificate record already exists
        const { data: existingBC, error: bcCheckError } = await supabase
          .from('birthcertificate')
          .select('req_id')
          .eq('req_id', reqId)
          .maybeSingle();
  
        if (bcCheckError) throw bcCheckError;
  
        if (!existingBC) {
          // Create birth certificate record
          const { error: bcError } = await supabase
            .from('birthcertificate')
            .insert([{ req_id: reqId }]);
          if (bcError) throw bcError;
        }
      } else if (!isDraft) {
        // If not a draft and not converting from draft, just update the status to 'pending'
        const { error: statusError } = await supabase
          .from('status')
          .update({ status_current: 'pending' })
          .eq('req_id', reqId);
  
        if (statusError) throw statusError;
      }
  
      console.log(`Owner data ${isDraft ? 'saved as draft' : 'submitted'} successfully.`);
      return ownerData;
    } catch (error) {
      console.error('Submission error:', error);
      throw error;
    }
  };

  const clearDraft = () => {
    resetFormData();
    setCurrentRequestId(null);
    sessionStorage.removeItem('currentRequestId');
  };

  return (
    <OwnerContext.Provider value={{ 
      formData, 
      handleChange, 
      handleOwnerSubmission, 
      clearDraft,
      currentRequestId,
      setCurrentRequestId: setCurrentRequestIdWithSession,
      loadExistingDraft,
      isLoadingDraft
    }}>
      {children}
    </OwnerContext.Provider>
  );
};