import { useState, useEffect } from 'react';
import { supabase } from '../../supabase'
import { useAuth } from '../contexts/AuthContext';

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      console.log('🔍 Starting fetchUserRole...');
      console.log('Auth user:', user);
      
      if (!user) {
        console.log('❌ No user found');
        setUserRole(null);
        setRoleLoading(false);
        return;
      }

      try {
        console.log('🔄 Querying database for user_id:', user.id);
        
        const { data, error } = await supabase
          .from('user')
          .select('role, fname, lname, contact')
          .eq('user_id', user.id)
          .single();

        console.log('📊 Database response - Data:', data);
        console.log('📊 Database response - Error:', error);

        if (error) {
          console.error('❌ Error fetching user role:', error);
          console.error('Error details:', error.message, error.code);
          setUserRole(null);
        } else {
          console.log('✅ Successfully fetched user role:', data);
          setUserRole(data);
        }
      } catch (error) {
        console.error('❌ Catch block error:', error);
        setUserRole(null);
      } finally {
        setRoleLoading(false);
      }
    };

    if (!authLoading) {
      fetchUserRole();
    }
  }, [user, authLoading]);

  const isAdmin = () => {
    const result = userRole?.role === 'admin';
    console.log('🔐 isAdmin check - userRole:', userRole, 'result:', result);
    return result;
  };

  const isAuthenticated = () => {
    return !!user;
  };

  return {
    user,
    userRole,
    loading: authLoading || roleLoading,
    isAdmin,
    isAuthenticated,
  };
};