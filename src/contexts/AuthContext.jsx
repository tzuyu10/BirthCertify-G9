import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../supabase';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ Set user from sessionStorage first (for early availability)
    const cachedUser = sessionStorage.getItem("user");
    if (cachedUser) {
      setUser(JSON.parse(cachedUser));
    }

    const saveToSession = (sessionUser) => {
      if (sessionUser) {
        sessionStorage.setItem('user', JSON.stringify(sessionUser));
      } else {
        sessionStorage.removeItem('user');
      }
    };

    // ✅ Get actual session from Supabase
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      saveToSession(sessionUser);
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        saveToSession(sessionUser);
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    sessionStorage.removeItem('user');
    return { error };
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    return { data, error };
  };

  const value = {
    user,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
