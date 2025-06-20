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
      // Check existing user more efficiently
      const { count, error: countError } = await supabase
        .from('user')
        .select('*', { count: 'exact', head: true })
        .eq('email', email);

      if (countError && countError.code !== 'PGRST116') {
        return { data: null, error: { message: 'Error checking existing user' } };
      }

      if (count > 0) {
        return { data: null, error: { message: 'User already exists' } };
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: additionalData.firstName,
            last_name: additionalData.lastName,
            contact: additionalData.contact,
          }
        }
      });

      if (authError) return { data: authData, error: authError };

      // Insert user profile
      if (authData.user) {
        const { error: userError } = await supabase
          .from('user')
          .insert({
            user_id: authData.user.id,
            email,
            fname: additionalData.firstName || null,
            lname: additionalData.lastName || null,
            contact: additionalData.contact || null,
            role: 'user',
            creationdate: new Date().toISOString(),
          });

        if (userError) {
          // Cleanup on profile creation failure
          await supabase.auth.signOut();
          return { data: authData, error: userError };
        }
      }

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

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      sessionOps.set(null);
      return { error };
    } catch (error) {
      return { error };
    }
  }, [sessionOps]);

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
    getUserProfile,
    updateUserProfile,
    loading,
  }), [user, signUp, signIn, signOut, signInWithGoogle, getUserProfile, updateUserProfile, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};