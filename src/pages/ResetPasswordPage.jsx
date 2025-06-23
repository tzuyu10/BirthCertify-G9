import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../supabase';
import '../styles/ResetPassword.css';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [validating, setValidating] = useState(true);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [backgroundError, setBackgroundError] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { signOut } = useAuth();

  // Debug logging for URL information
  useEffect(() => {
    console.log('=== Reset Password Debug Info ===');
    console.log('Full URL:', window.location.href);
    console.log('Search params:', window.location.search);
    console.log('Hash:', window.location.hash);
    console.log('Pathname:', window.location.pathname);
    console.log('Location state:', location.state);
  }, [location]);

  // Handler for back to login that signs out first
  const handleBackToLogin = async () => {
    try {
      await signOut(); // Sign out the user first
      navigate('/login'); // Then navigate to login
    } catch (error) {
      console.error('Error signing out:', error);
      // Still navigate even if signOut fails
      navigate('/login');
    }
  };

  // Preload background image (same as Login component)
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setBackgroundLoaded(true)
      setBackgroundError(false)
    }
    img.onerror = () => {
      setBackgroundLoaded(false)
      setBackgroundError(true)
      console.warn('Background image failed to load, using fallback')
    }
    
    // Try multiple image paths
    const imagePaths = [
      './Login.png',
      '/Login.png',
      '/images/Login.png',
      '/assets/Login.png'
    ]
    
    const tryLoadImage = (index = 0) => {
      if (index >= imagePaths.length) {
        setBackgroundError(true)
        return
      }
      
      img.src = imagePaths[index]
      img.onerror = () => tryLoadImage(index + 1)
    }
    
    tryLoadImage()
  }, [])

  // Improved token extraction function
  const getTokensFromURL = () => {
    const params = {};
    
    // Get current URL
    const currentUrl = window.location.href;
    console.log('Current URL:', currentUrl);
    
    // Check query parameters
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    // Check URL fragment (hash) - this is where Supabase usually puts tokens
    if (window.location.hash) {
      const hashString = window.location.hash.substring(1); // Remove the #
      console.log('Hash string:', hashString);
      
      // Handle both & and # separators
      const hashParams = new URLSearchParams(hashString);
      hashParams.forEach((value, key) => {
        params[key] = value;
      });
    }
    
    console.log('Extracted params:', params);
    return params;
  };
  
  // Simplified and improved reset session validation
  useEffect(() => {
    const validateResetSession = async () => {
      try {
        setValidating(true);
        setError('');
        
        console.log('🔐 Starting reset password validation...');
        
        // First, let Supabase handle the session automatically
        // This should work if the user clicked a valid reset link
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('Session check result:', { session: !!session, user: session?.user?.email, error: sessionError });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Invalid reset link. Please request a new password reset.');
          setValidating(false);
          return;
        }
        
        if (session?.user) {
          console.log('✅ Valid session found for user:', session.user.email);
          
          // Additional check: verify this is actually a password recovery session
          // Check if the user has recently requested a password reset
          const userMetadata = session.user.user_metadata || {};
          const lastSignInAt = session.user.last_sign_in_at;
          const emailConfirmedAt = session.user.email_confirmed_at;
          
          console.log('User metadata:', userMetadata);
          console.log('Last sign in:', lastSignInAt);
          console.log('Email confirmed:', emailConfirmedAt);
          
          setIsValidSession(true);
          setError('');
        } else {
          console.log('❌ No valid session found');
          
          // If no session, try manual token extraction as fallback
          const tokens = getTokensFromURL();
          
          if (tokens.access_token && tokens.refresh_token) {
            console.log('🔑 Found tokens in URL, attempting to set session...');
            
            try {
              const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token
              });
              
              if (setSessionError) {
                console.error('Set session error:', setSessionError);
                setError('Invalid or expired reset link. Please request a new password reset.');
              } else if (sessionData?.session?.user) {
                console.log('✅ Session set successfully for user:', sessionData.session.user.email);
                setIsValidSession(true);
                setError('');
              } else {
                console.error('Session set but no user found');
                setError('Invalid reset link. Please request a new password reset.');
              }
            } catch (setSessionErr) {
              console.error('Error setting session:', setSessionErr);
              setError('Failed to validate reset link. Please try again.');
            }
          } else {
            console.log('❌ No tokens found in URL');
            setError('Invalid reset link. Please request a new password reset.');
          }
        }
        
      } catch (err) {
        console.error('Reset validation error:', err);
        setError('Session validation failed. Please try again.');
      } finally {
        setValidating(false);
        console.log('🔐 Reset password validation completed');
      }
    };

    // Add a small delay to allow URL to fully load
    const timer = setTimeout(validateResetSession, 100);
    
    return () => clearTimeout(timer);
  }, []); // Simplified dependencies

  const validatePassword = (pwd) => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isValidSession) {
      setError('Invalid session. Please request a new password reset.');
      return;
    }
    
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔄 Updating password...');
      
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });
      
      console.log('Password update result:', { success: !error, error });
      
      if (error) {
        console.error('Password update error:', error);
        setError(error.message || 'Failed to update password');
      } else {
        console.log('✅ Password updated successfully');
        // Show success message briefly then redirect
        setError(''); // Clear any errors
        alert('Password updated successfully! Please log in with your new password.');
        
        // Sign out and redirect
        try {
          await signOut();
        } catch (signOutError) {
          console.warn('Sign out error after password update:', signOutError);
        }
        
        navigate('/login');
      }
    } catch (err) {
      console.error('Unexpected password update error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Show loading while validating session
  if (validating) {
    return (
      <div 
        className={`reset-password-page ${backgroundLoaded ? 'background-loaded' : ''} ${backgroundError ? 'background-error' : ''}`}

      >
        {/* Loading overlay for background */}
        {!backgroundLoaded && !backgroundError && (
          <div className="background-loading">
            <div className="background-spinner"></div>
          </div>
        )}
        
        <div className="reset-password-container">
          <div className="reset-password-wrapper">
            <div className="reset-password-loading">
              <div className="loading-spinner"></div>
              <p>Validating reset link...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If there's an error with the reset link, show error message
  if (error && (
    error.includes('Invalid reset link') || 
    error.includes('No tokens found') || 
    error.includes('Missing required tokens') ||
    error.includes('expired reset link') ||
    error.includes('Session validation failed')
  )) {
    return (
      <div 
        className={`reset-password-page ${backgroundLoaded ? 'background-loaded' : ''} ${backgroundError ? 'background-error' : ''}`}
        style={{
          backgroundImage: backgroundLoaded && !backgroundError ? 'linear-gradient(135deg, #87CEEB 0%, #4A90E2 25%, #2E86AB 50%, #4A90E2 75%, #87CEEB 100%)' : 'none'
        }}
      >
        {/* Loading overlay for background */}
        {!backgroundLoaded && !backgroundError && (
          <div className="background-loading">
            <div className="background-spinner"></div>
          </div>
        )}
        
        <div className="reset-password-container">
          <div className="reset-password-wrapper">
            <div className="reset-password-error-page">
              <h1 className="reset-password-title">Invalid Reset Link</h1>
              <div className="reset-password-message error">
                {error}
              </div>
              <div className="reset-password-actions">
                <button
                  onClick={handleBackToLogin}
                  className="reset-password-btn-secondary"
                >
                  Back to Login
                </button>
                <button
                  onClick={handleBackToLogin}
                  className="reset-password-btn"
                >
                  Request New Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`reset-password-page ${backgroundLoaded ? 'background-loaded' : ''} ${backgroundError ? 'background-error' : ''}`}
      style={{
        backgroundImage: backgroundLoaded && !backgroundError ? 'linear-gradient(135deg, #87CEEB 0%, #4A90E2 25%, #2E86AB 50%, #4A90E2 75%, #87CEEB 100%)' : 'none'
      }}
    >
      {/* Loading overlay for background */}
      {!backgroundLoaded && !backgroundError && (
        <div className="background-loading">
          <div className="background-spinner"></div>
        </div>
      )}
      
      <div className="reset-password-container">
        <div className="reset-password-wrapper">
          <h1 className="reset-password-title">Set New Password</h1>
          <p className="reset-password-subtitle">Enter your new password below</p>

          {error && !error.includes('Invalid reset link') && (
            <div className="reset-password-message error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="reset-password-form">
            <div className="reset-password-input-box">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <i 
                className={`bx ${showPassword ? 'bx-show' : 'bx-hide'} password-toggle`}
                onClick={togglePasswordVisibility}
              ></i>
            </div>

            <div className="reset-password-input-box">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
              <i 
                className={`bx ${showConfirmPassword ? 'bx-show' : 'bx-hide'} password-toggle`}
                onClick={toggleConfirmPasswordVisibility}
              ></i>
            </div>

            <div className="reset-password-requirements">
              <p>Password requirements:</p>
              <ul>
                <li>At least 8 characters long</li>
                <li>Contains uppercase and lowercase letters</li>
                <li>Contains at least one number</li>
              </ul>
            </div>

            <button
              type="submit"
              className="reset-password-btn"
              disabled={loading || !isValidSession}
            >
              {loading && <span className="btn-spinner"></span>}
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div className="reset-password-register-link">
            <p>
              Remember your password?{' '}
              <button 
                type="button"
                onClick={handleBackToLogin}
                className="link-button"
              >
                Back to Login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;