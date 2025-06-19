import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../supabase';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 AuthProvider: useEffect started');
    
    // ✅ Set user from sessionStorage first (for early availability)
    const cachedUser = sessionStorage.getItem("user");
    if (cachedUser) {
      console.log('📱 AuthProvider: Found cached user in sessionStorage:', JSON.parse(cachedUser));
      setUser(JSON.parse(cachedUser));
    } else {
      console.log('📱 AuthProvider: No cached user found in sessionStorage');
    }

    const saveToSession = (sessionUser) => {
      if (sessionUser) {
        console.log('💾 AuthProvider: Saving user to sessionStorage:', sessionUser);
        sessionStorage.setItem('user', JSON.stringify(sessionUser));
      } else {
        console.log('💾 AuthProvider: Removing user from sessionStorage');
        sessionStorage.removeItem('user');
      }
    };

    // ✅ Get actual session from Supabase
    const getSession = async () => {
      console.log('🔄 AuthProvider: Getting session from Supabase...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const sessionUser = session?.user ?? null;
        console.log('✅ AuthProvider: Session retrieved:', {
          hasSession: !!session,
          userId: sessionUser?.id,
          email: sessionUser?.email
        });
        setUser(sessionUser);
        saveToSession(sessionUser);
        setLoading(false);
      } catch (error) {
        console.error('❌ AuthProvider: Error getting session:', error);
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 AuthProvider: Auth state changed:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email
        });
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        saveToSession(sessionUser);
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 AuthProvider: Cleaning up auth subscription');
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, additionalData = {}) => {
    console.log('🚀 SignUp: Starting signup process');
    console.log('📝 SignUp: Input parameters:', {
      email,
      hasPassword: !!password,
      additionalData: additionalData,
      additionalDataKeys: Object.keys(additionalData),
      firstName: additionalData.firstName,
      lastName: additionalData.lastName,
      contact: additionalData.contact
    });

    try {
      // Check if user already exists in our user table
      console.log('🔍 SignUp: Checking if user already exists...');
      const { data: existingUser, error: checkError } = await supabase
        .from('user')
        .select('user_id, email')
        .eq('email', email)
        .single();

      console.log('📊 SignUp: Existing user check result:', {
        hasExistingUser: !!existingUser,
        existingUser: existingUser,
        hasCheckError: !!checkError,
        checkError: checkError,
        checkErrorCode: checkError?.code
      });

      // Handle the check error properly
      if (checkError) {
        if (checkError.code === 'PGRST116') {
          // PGRST116 = no rows returned, which is what we want
          console.log('✅ SignUp: No existing user found (PGRST116), proceeding with signup');
        } else {
          // Other errors might indicate a real problem
          console.error('❌ SignUp: Error checking existing user:', checkError);
          return { 
            data: null, 
            error: { message: 'Error checking existing user: ' + checkError.message }
          };
        }
      } else if (existingUser) {
        console.log('❌ SignUp: User already exists:', existingUser);
        return { 
          data: null, 
          error: { message: 'User with this email already exists in our system' }
        };
      } else {
        console.log('✅ SignUp: No existing user found, proceeding with signup');
      }

      // First, create the auth user
      console.log('🔐 SignUp: Creating auth user with Supabase...');
      const authPayload = { 
        email, 
        password,
        options: {
          data: {
            first_name: additionalData.firstName,
            last_name: additionalData.lastName,
            contact: additionalData.contact,
          }
        }
      };
      
      console.log('📤 SignUp: Auth payload:', {
        email: authPayload.email,
        hasPassword: !!authPayload.password,
        metadata: authPayload.options.data
      });

      const { data: authData, error: authError } = await supabase.auth.signUp(authPayload);

      if (authError) {
        console.error('❌ SignUp: Auth error:', {
          message: authError.message,
          status: authError.status,
          details: authError
        });
        return { data: authData, error: authError };
      }

      console.log('✅ SignUp: Auth user created successfully:', {
        userId: authData.user?.id,
        email: authData.user?.email,
        confirmed: authData.user?.email_confirmed_at,
        userMetadata: authData.user?.user_metadata
      });

      // Insert user data into public.user table - always insert if we have user data
      if (authData.user) {
        const userInsertData = {
          user_id: authData.user.id,
          email: email,
          fname: additionalData.firstName || null,
          lname: additionalData.lastName || null,
          contact: additionalData.contact || null,
          role: 'user', // Default role, adjust as needed
          creationdate: new Date().toISOString(),
        };

        console.log('📊 SignUp: Prepared user data for database insertion:', {
          user_id: userInsertData.user_id,
          email: userInsertData.email,
          fname: userInsertData.fname,
          lname: userInsertData.lname,
          contact: userInsertData.contact,
          role: userInsertData.role,
          creationdate: userInsertData.creationdate,
          fnameType: typeof userInsertData.fname,
          lnameType: typeof userInsertData.lname,
          contactType: typeof userInsertData.contact
        });

        console.log('💾 SignUp: Inserting user profile into database...');

        // Use upsert to handle potential conflicts gracefully
        const { data: userData, error: userError } = await supabase
          .from('user')
          .upsert([userInsertData], { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          })
          .select()
          .single();

        console.log('📊 SignUp: Database upsert response:', {
          hasData: !!userData,
          hasError: !!userError,
          errorCode: userError?.code,
          errorMessage: userError?.message
        });

        if (userError) {
          console.error('❌ SignUp: User profile creation error:', {
            message: userError.message,
            details: userError.details,
            hint: userError.hint,
            code: userError.code,
            fullError: userError
          });
          
          // Clean up auth user if profile creation fails
          console.log('🧹 SignUp: Attempting to clean up auth user due to profile creation failure...');
          try {
            await supabase.auth.signOut();
            console.log('✅ SignUp: Auth user cleanup successful');
          } catch (cleanupError) {
            console.error('❌ SignUp: Cleanup error:', cleanupError);
          }
          
          return { data: authData, error: userError };
        }

        console.log('✅ SignUp: User profile created successfully:', {
          insertedData: userData,
          fname: userData?.fname,
          lname: userData?.lname,
          contact: userData?.contact
        });
      } else {
        console.warn('⚠️ SignUp: No auth user data available for profile creation');
      }

      console.log('🎉 SignUp: Signup process completed successfully');
      return { data: authData, error: null };
      
    } catch (error) {
      console.error('💥 SignUp: Unexpected error during signup:', {
        message: error.message,
        stack: error.stack,
        fullError: error
      });
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    console.log('🔑 SignIn: Attempting sign in for:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('❌ SignIn: Sign in error:', error);
      } else {
        console.log('✅ SignIn: Sign in successful:', {
          userId: data.user?.id,
          email: data.user?.email
        });
      }
      
      return { data, error };
    } catch (error) {
      console.error('💥 SignIn: Unexpected error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    console.log('👋 SignOut: Signing out user');
    try {
      const { error } = await supabase.auth.signOut();
      sessionStorage.removeItem('user');
      
      if (error) {
        console.error('❌ SignOut: Sign out error:', error);
      } else {
        console.log('✅ SignOut: Sign out successful');
      }
      
      return { error };
    } catch (error) {
      console.error('💥 SignOut: Unexpected error:', error);
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    console.log('🔍 SignInWithGoogle: Starting Google OAuth sign in');
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      console.log('📤 SignInWithGoogle: OAuth request sent:', {
        hasData: !!data,
        redirectTo: `${window.location.origin}/auth/callback`
      });
      
      if (error) {
        console.error('❌ SignInWithGoogle: OAuth error:', error);
      }
      
      return { data, error };
    } catch (error) {
      console.error('💥 SignInWithGoogle: Unexpected error:', error);
      return { data: null, error };
    }
  };

  // Helper function to get user profile data
  const getUserProfile = async (userId) => {
    console.log('👤 GetUserProfile: Fetching profile for user:', userId);
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('❌ GetUserProfile: Error fetching profile:', error);
      } else {
        console.log('✅ GetUserProfile: Profile fetched:', {
          userId: data?.user_id,
          email: data?.email,
          fname: data?.fname,
          lname: data?.lname,
          contact: data?.contact
        });
      }
    
      return { data, error };
    } catch (error) {
      console.error('💥 GetUserProfile: Unexpected error:', error);
      return { data: null, error };
    }
  };

  // Helper function to update user profile
  const updateUserProfile = async (userId, profileData) => {
    console.log('📝 UpdateUserProfile: Updating profile for user:', userId);
    console.log('📝 UpdateUserProfile: Profile data:', profileData);
    
    try {
      const { data, error } = await supabase
        .from('user')
        .update(profileData)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('❌ UpdateUserProfile: Error updating profile:', error);
      } else {
        console.log('✅ UpdateUserProfile: Profile updated successfully:', data);
      }
    
      return { data, error };
    } catch (error) {
      console.error('💥 UpdateUserProfile: Unexpected error:', error);
      return { data: null, error };
    }
  };

  const value = {
    user,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    getUserProfile,
    updateUserProfile,
    loading,
  };

  console.log('🏗️ AuthProvider: Rendering with current state:', {
    hasUser: !!user,
    userId: user?.id,
    email: user?.email,
    loading
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};