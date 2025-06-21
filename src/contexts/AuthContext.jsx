import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { supabase, supabaseHelpers } from "../../supabase";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);

  // Memoized session storage operations
  const sessionOps = useMemo(
    () => ({
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
            sessionStorage.setItem("user", JSON.stringify(user));
          } else {
            sessionStorage.removeItem("user");
          }
        } catch (error) {
          console.warn("Failed to update session storage:", error);
        }
      },
    }),
    []
  );

  // Enhanced user profile fetching with timeout handling
  const getUserWithProfile = useCallback(
    async (authUser, isGoogleOAuth = false, timeoutMs = 5000) => {
      if (!authUser) return null;

      try {
        // Use Promise.race to implement timeout
        const profilePromise = supabase
          .from("user")
          .select("fname, lname, contact, role, creationdate")
          .eq("user_id", authUser.id)
          .single();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Profile fetch timeout")),
            timeoutMs
          )
        );

        const { data: profile, error } = await Promise.race([
          profilePromise,
          timeoutPromise,
        ]);

        if (error) {
          console.warn(
            "Profile fetch failed, using auth user only:",
            error.message
          );
          return authUser;
        }

        // Handle Google OAuth profile updates more efficiently
        if (isGoogleOAuth && authUser.user_metadata) {
          const updateData = {};
          const { first_name, last_name, full_name } = authUser.user_metadata;

          if (first_name && !profile.fname) updateData.fname = first_name;
          if (last_name && !profile.lname) updateData.lname = last_name;

          // Handle full_name fallback
          if (
            full_name &&
            !profile.fname &&
            !profile.lname &&
            !first_name &&
            !last_name
          ) {
            const [firstName, ...lastNameParts] = full_name.split(" ");
            updateData.fname = firstName;
            updateData.lname = lastNameParts.join(" ") || "";
          }

          // Batch update if needed (with timeout)
          if (Object.keys(updateData).length > 0) {
            try {
              const updatePromise = supabase
                .from("user")
                .update(updateData)
                .eq("user_id", authUser.id)
                .select("fname, lname")
                .single();

              const updateTimeoutPromise = new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Profile update timeout")),
                  3000
                )
              );

              const { data: updatedProfile } = await Promise.race([
                updatePromise,
                updateTimeoutPromise,
              ]);

              if (updatedProfile) {
                profile.fname = updatedProfile.fname;
                profile.lname = updatedProfile.lname;
              }
            } catch (updateError) {
              console.warn(
                "Profile update failed, continuing with existing data:",
                updateError.message
              );
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
        console.warn(
          "Profile fetch error, using auth user only:",
          error.message
        );
        return authUser;
      }
    },
    []
  );

  // Optimized user state updater
  const updateUserState = useCallback(
    (newUser) => {
      setUser(newUser);
      sessionOps.set(newUser);
      setConnectionError(null); // Clear connection error when user state updates successfully
    },
    [sessionOps]
  );

  useEffect(() => {
    let mounted = true;
    let authSubscription = null;

    // Load cached user immediately for better UX
    const cachedUser = sessionOps.get();
    if (cachedUser) {
      setUser(cachedUser);
      console.log("🔄 Loaded cached user, will verify with server");
    }

    // Enhanced auth initialization with timeout handling
    const initializeAuth = async () => {
      try {
        console.log("🔐 Initializing auth with timeout handling...");

        // First, try the quick auth check from supabaseHelpers
        const quickAuthResult = await supabaseHelpers.quickAuthCheck();

        if (!mounted) return;

        if (quickAuthResult.success && quickAuthResult.session?.user) {
          console.log("✅ Quick auth check successful");
          const userWithProfile = await getUserWithProfile(
            quickAuthResult.session.user,
            false
          );
          updateUserState(userWithProfile);
        } else if (quickAuthResult.success && !quickAuthResult.session) {
          console.log("ℹ️ No active session found");
          updateUserState(null);
        } else {
          // Quick auth failed, try fallback with longer timeout
          console.log("⚠️ Quick auth failed, trying fallback method...");

          try {
            const fallbackPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Session fetch timeout")), 8000)
            );

            const {
              data: { session },
            } = await Promise.race([fallbackPromise, timeoutPromise]);

            if (!mounted) return;

            if (session?.user) {
              console.log("✅ Fallback auth successful");
              const userWithProfile = await getUserWithProfile(
                session.user,
                false
              );
              updateUserState(userWithProfile);
            } else {
              console.log("ℹ️ No session in fallback");
              updateUserState(null);
            }
          } catch (fallbackError) {
            console.warn("❌ Both auth methods failed:", fallbackError.message);
            setConnectionError(
              "Unable to verify authentication. Please check your connection."
            );

            // If we have cached user, keep them but show warning
            if (!cachedUser) {
              updateUserState(null);
            }
          }
        }
      } catch (error) {
        console.error("❌ Auth initialization error:", error);
        setConnectionError("Authentication service unavailable");

        // If we have cached user, keep them but show warning
        if (!cachedUser) {
          updateUserState(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          console.log("🔐 Auth initialization completed");
        }
      }
    };

    // Start initialization
    initializeAuth();

    // Set up auth state listener using the helper
    authSubscription = supabaseHelpers.setupAuthListener(
      async (event, session) => {
        if (!mounted) return;

        console.log("🔄 Auth state changed:", event);

        if (event === "PASSWORD_RECOVERY") {
          // Don't update user state during password recovery
          setLoading(false);
          return;
        }

        const sessionUser = session?.user ?? null;
        const isGoogleOAuth =
          event === "SIGNED_IN" &&
          sessionUser?.app_metadata?.provider === "google";

        if (sessionUser) {
          console.log("✅ User signed in via auth listener");
          try {
            const userWithProfile = await getUserWithProfile(
              sessionUser,
              isGoogleOAuth
            );
            updateUserState(userWithProfile);
          } catch (error) {
            console.warn(
              "Profile fetch failed via auth listener:",
              error.message
            );
            updateUserState(sessionUser); // Use basic auth user if profile fails
          }
        } else {
          console.log("ℹ️ User signed out via auth listener");
          updateUserState(null);
        }

        setLoading(false);
      }
    );

    // Cleanup function
    return () => {
      mounted = false;
      if (authSubscription?.unsubscribe) {
        authSubscription.unsubscribe();
      }
    };
  }, [getUserWithProfile, updateUserState, sessionOps]);

  // Enhanced signup with timeout handling
  const signUp = useCallback(async (email, password, additionalData = {}) => {
    try {
      const signUpPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName: additionalData.firstName,
            lastName: additionalData.lastName,
            contact: additionalData.contact,
            name: `${additionalData.firstName || ""} ${
              additionalData.lastName || ""
            }`.trim(),
          },
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Sign up timeout")), 10000)
      );

      const { data: authData, error: authError } = await Promise.race([
        signUpPromise,
        timeoutPromise,
      ]);

      if (authError) return { data: authData, error: authError };

      return { data: authData, error: null };
    } catch (error) {
      if (error.message === "Sign up timeout") {
        return {
          data: null,
          error: {
            message:
              "Sign up is taking longer than expected. Please try again.",
          },
        };
      }
      return { data: null, error };
    }
  }, []);

  // Enhanced sign in with timeout handling
  const signIn = useCallback(async (email, password) => {
    try {
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Sign in timeout")), 8000)
      );

      const { data, error } = await Promise.race([
        signInPromise,
        timeoutPromise,
      ]);
      return { data, error };
    } catch (error) {
      if (error.message === "Sign in timeout") {
        return {
          data: null,
          error: {
            message:
              "Sign in is taking longer than expected. Please try again.",
          },
        };
      }
      return { data: null, error };
    }
  }, []);

  // Enhanced sign out with immediate local state update
  const signOut = useCallback(async () => {
    try {
      // Clear local state immediately for responsive UI
      updateUserState(null);

      // Clear any cached data
      supabaseHelpers.clearCache();

      // Sign out from Supabase with timeout
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Sign out timeout")), 5000)
      );

      try {
        await Promise.race([signOutPromise, timeoutPromise]);
        return { error: null };
      } catch (signOutError) {
        console.warn(
          "Sign out timeout, but local state cleared:",
          signOutError.message
        );
        return { error: null }; // Don't report timeout as error since local state is cleared
      }
    } catch (error) {
      console.warn("Sign out error (local state cleared):", error);
      return { error };
    }
  }, [updateUserState]);

  // Enhanced Google sign in with timeout
  const signInWithGoogle = useCallback(async () => {
    try {
      const googleSignInPromise = supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Google sign in timeout")), 10000)
      );

      const { data, error } = await Promise.race([
        googleSignInPromise,
        timeoutPromise,
      ]);
      return { data, error };
    } catch (error) {
      if (error.message === "Google sign in timeout") {
        return {
          data: null,
          error: {
            message:
              "Google sign in is taking longer than expected. Please try again.",
          },
        };
      }
      return { data: null, error };
    }
  }, []);

  // Enhanced reset password with timeout
  const resetPassword = useCallback(async (email) => {
    try {
      const resetPromise = supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Reset password timeout")), 8000)
      );

      const { data, error } = await Promise.race([
        resetPromise,
        timeoutPromise,
      ]);
      return { data, error };
    } catch (error) {
      if (error.message === "Reset password timeout") {
        return {
          data: null,
          error: {
            message:
              "Password reset is taking longer than expected. Please try again.",
          },
        };
      }
      return { data: null, error };
    }
  }, []);

  // Enhanced update password with timeout
  const updatePassword = useCallback(
    async (newPassword) => {
      try {
        const updatePromise = supabase.auth.updateUser({
          password: newPassword,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Update password timeout")), 8000)
        );

        const { data, error } = await Promise.race([
          updatePromise,
          timeoutPromise,
        ]);

        if (!error && data?.user && user) {
          try {
            const userWithProfile = await getUserWithProfile(data.user, false);
            updateUserState(userWithProfile);
          } catch (profileError) {
            console.warn(
              "Profile refresh failed after password update:",
              profileError.message
            );
          }
        }

        return { data, error };
      } catch (error) {
        if (error.message === "Update password timeout") {
          return {
            data: null,
            error: {
              message:
                "Password update is taking longer than expected. Please try again.",
            },
          };
        }
        return { data: null, error };
      }
    },
    [getUserWithProfile, updateUserState, user]
  );

  // Enhanced profile operations with timeout
  const getUserProfile = useCallback(async (userId) => {
    try {
      const profilePromise = supabase
        .from("user")
        .select("*")
        .eq("user_id", userId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Get profile timeout")), 5000)
      );

      const { data, error } = await Promise.race([
        profilePromise,
        timeoutPromise,
      ]);
      return { data, error };
    } catch (error) {
      if (error.message === "Get profile timeout") {
        return {
          data: null,
          error: { message: "Profile fetch is taking longer than expected." },
        };
      }
      return { data: null, error };
    }
  }, []);

  const updateUserProfile = useCallback(
    async (userId, profileData) => {
      try {
        const updatePromise = supabase
          .from("user")
          .update(profileData)
          .eq("user_id", userId)
          .select()
          .single();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Update profile timeout")), 5000)
        );

        const { data, error } = await Promise.race([
          updatePromise,
          timeoutPromise,
        ]);

        if (!error && data && user) {
          const updatedUser = { ...user, ...data };
          updateUserState(updatedUser);

          // Clear relevant cache entries
          supabaseHelpers.clearCache("getCurrentUser|getUserProfile");
        }

        return { data, error };
      } catch (error) {
        if (error.message === "Update profile timeout") {
          return {
            data: null,
            error: {
              message: "Profile update is taking longer than expected.",
            },
          };
        }
        return { data: null, error };
      }
    },
    [user, updateUserState]
  );

  // Retry connection function for manual retry
  const retryConnection = useCallback(async () => {
    setLoading(true);
    setConnectionError(null);

    try {
      const quickAuthResult = await supabaseHelpers.quickAuthCheck();

      if (quickAuthResult.success && quickAuthResult.session?.user) {
        const userWithProfile = await getUserWithProfile(
          quickAuthResult.session.user,
          false
        );
        updateUserState(userWithProfile);
      } else {
        updateUserState(null);
      }
    } catch (error) {
      console.error("Retry connection failed:", error);
      setConnectionError(
        "Connection retry failed. Please check your internet connection."
      );
    } finally {
      setLoading(false);
    }
  }, [getUserWithProfile, updateUserState]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
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
      connectionError,
      retryConnection,
    }),
    [
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
      connectionError,
      retryConnection,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
