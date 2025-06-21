import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../supabase';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Memoized session storage operations
  const sessionOps = useMemo(() => ({
    get: () => {
      try {
        const cached = sessionStorage.getItem("user");
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    },
    set: (user) => {
      try {
        if (user) {
          sessionStorage.setItem('user', JSON.stringify(user));
        } else {
          sessionStorage.removeItem('user');
        }
      } catch (error) {
        console.warn('Failed to update session storage:', error);
      }
    }
  }), []);

  // Optimized user profile fetching with caching
  const getUserWithProfile = useCallback(async (authUser, isGoogleOAuth = false) => {
    if (!authUser) return null;
    
    try {
      const { data: profile, error } = await supabase
        .from('user')
        .select('fname, lname, contact, role, creationdate')
        .eq('user_id', authUser.id)
        .single();
      
      if (error) {
        // Return auth user if profile fetch fails
        return authUser;
      }
      
      // Handle Google OAuth profile updates more efficiently
      if (isGoogleOAuth && authUser.user_metadata) {
        const updateData = {};
        const { first_name, last_name, full_name } = authUser.user_metadata;
        
        if (first_name && !profile.fname) updateData.fname = first_name;
        if (last_name && !profile.lname) updateData.lname = last_name;
        
        // Handle full_name fallback
        if (full_name && !profile.fname && !profile.lname && !first_name && !last_name) {
          const [firstName, ...lastNameParts] = full_name.split(' ');
          updateData.fname = firstName;
          updateData.lname = lastNameParts.join(' ') || '';
        }
        
        // Batch update if needed
        if (Object.keys(updateData).length > 0) {
          const { data: updatedProfile } = await supabase
            .from('user')
            .update(updateData)
            .eq('user_id', authUser.id)
            .select('fname, lname')
            .single();
          
          if (updatedProfile) {
            profile.fname = updatedProfile.fname;
            profile.lname = updatedProfile.lname;
          }
        }
      }
      
      // Return merged user object
      return {
        ...authUser,
        fname: profile.fname,
        lname: profile.lname,
        contact: profile.contact,
        role: profile.role,
        creationdate: profile.creationdate,
      };
    } catch (error) {
      console.error('Profile fetch error:', error);
      return authUser;
    }
  }, []);

  // Optimized user state updater
  const updateUserState = useCallback((newUser) => {
    setUser(newUser);
    sessionOps.set(newUser);
  }, [sessionOps]);

  useEffect(() => {
    let mounted = true;
    
    // Load cached user immediately for better UX
    const cachedUser = sessionOps.get();
    if (cachedUser) {
      setUser(cachedUser);
    }

    // Get session asynchronously
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          const userWithProfile = await getUserWithProfile(session.user, false);
          updateUserState(userWithProfile);
        } else {
          updateUserState(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'PASSWORD_RECOVERY') {
          // Don't update user state during password recovery
          // Let the reset password page handle this
          setLoading(false);
          return;
        }
        
        const sessionUser = session?.user ?? null;
        const isGoogleOAuth = event === 'SIGNED_IN' && 
          sessionUser?.app_metadata?.provider === 'google';
        
        if (sessionUser) {
          const userWithProfile = await getUserWithProfile(sessionUser, isGoogleOAuth);
          updateUserState(userWithProfile);
        } else {
          updateUserState(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [getUserWithProfile, updateUserState, sessionOps]);

  // Optimized signup with reduced database calls
  
const signUp = useCallback(async (email, password, additionalData = {}) => {
  try {
    // Create auth user - let the trigger handle the user table insertion
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName: additionalData.firstName,  // Store in raw_user_meta_data
          lastName: additionalData.lastName,
          contact: additionalData.contact,
          // Also store as 'name' for your trigger to parse
          name: `${additionalData.firstName || ''} ${additionalData.lastName || ''}`.trim()
        }
      }
    });

    if (authError) return { data: authData, error: authError };

    return { data: authData, error: null };
  } catch (error) {
    return { data: null, error };
  }
}, []);

  const signIn = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }, []);

  // Optimized sign out with immediate local state update
  const signOut = useCallback(async () => {
    try {
      // Clear local state immediately for responsive UI
      updateUserState(null);
      
      // Sign out from Supabase in background
      const { error } = await supabase.auth.signOut();
      
      // Only return error if there was one, but don't block UI
      return { error };
    } catch (error) {
      // Even if sign out fails, keep local state cleared
      // This prevents stuck authentication states
      console.warn('Sign out error (local state cleared):', error);
      return { error };
    }
  }, [updateUserState]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }, []);

  // Reset password functionality
  const resetPassword = useCallback(async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }, []);

  // Update password functionality
  const updatePassword = useCallback(async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      // If password update is successful and we have user data, 
      // refresh the user profile to ensure consistency
      if (!error && data?.user && user) {
        const userWithProfile = await getUserWithProfile(data.user, false);
        updateUserState(userWithProfile);
      }
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }, [getUserWithProfile, updateUserState, user]);

  const getUserProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('user_id', userId)
        .single();
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }, []);

  const updateUserProfile = useCallback(async (userId, profileData) => {
    try {
      const { data, error } = await supabase
        .from('user')
        .update(profileData)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (!error && data && user) {
        const updatedUser = { ...user, ...data };
        updateUserState(updatedUser);
      }
    
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }, [user, updateUserState]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    getUserProfile,
    updateUserProfile,
    loading,
  }), [user, signUp, signIn, signOut, signInWithGoogle, resetPassword, updatePassword, getUserProfile, updateUserProfile, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};