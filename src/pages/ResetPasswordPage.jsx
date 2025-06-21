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

  // Function to extract parameters from both URL query and fragment
  const getTokensFromURL = () => {
    const params = new URLSearchParams();
    
    // Check query parameters first
    searchParams.forEach((value, key) => {
      params.set(key, value);
    });
    
    // Check URL fragment (hash) parameters  
    if (location.hash) {
      const hashParams = new URLSearchParams(location.hash.substring(1));
      hashParams.forEach((value, key) => {
        params.set(key, value);
      });
    }
    
    // Convert to object
    const tokenObj = {};
    params.forEach((value, key) => {
      tokenObj[key] = value;
    });
    
    return tokenObj;
  };
  
  // Validate reset session
  useEffect(() => {
    const validateResetSession = async () => {
      try {
        setValidating(true);
        const tokens = getTokensFromURL();
        
        console.log('Validating reset session with tokens:', tokens);
        
        // Check for tokens
        if (Object.keys(tokens).length === 0) {
          // No tokens found - might be a fresh page load
          // Check if we have an active session from the Supabase redirect
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (session && session.user) {
            console.log('Found existing session from Supabase redirect');
            setIsValidSession(true);
            setError('');
            setValidating(false);
            return;
          } else {
            setError('Invalid reset link. Please request a new password reset.');
            setValidating(false);
            return;
          }
        }
        
        // Handle different token formats
        if (tokens.access_token && tokens.refresh_token) {
          console.log('Found access_token and refresh_token in URL');
          
          // Verify the type is recovery
          if (tokens.type && tokens.type !== 'recovery') {
            setError(`Invalid reset link type. Please request a new password reset.`);
            setValidating(false);
            return;
          }
  
          // Set the session
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token
          });
  
          if (sessionError) {
            console.error('Session error:', sessionError);
            setError(`Session error. Please try clicking the reset link again.`);
            setValidating(false);
            return;
          }
  
          // Verify we can get the current user
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            console.error('User error:', userError);
            setError(`User verification failed. Please request a new password reset.`);
            setValidating(false);
            return;
          }
  
          console.log('Valid session established for user:', user.email);
          setIsValidSession(true);
          setError('');
        } 
        else {
          // Try to get current session - maybe Supabase already set it
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (session && session.user) {
            console.log('Using existing Supabase session');
            setIsValidSession(true);
            setError('');
          } else {
            setError(`Invalid reset link. Please request a new password reset.`);
            setValidating(false);
            return;
          }
        }
      } catch (err) {
        console.error('Session validation error:', err);
        setError(`Validation error. Please try again.`);
      } finally {
        setValidating(false);
      }
    };
  
    validateResetSession();
  }, [searchParams, location.hash, location.search, location.pathname]);

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
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        setError(error.message || 'Failed to update password');
      } else {
        // Show success message briefly then redirect
        setError(''); // Clear any errors
        alert('Password updated successfully! Please log in with your new password.');
        await signOut();
        navigate('/login');
      }
    } catch (err) {
      console.error('Password update error:', err);
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
        style={{
          backgroundImage: backgroundLoaded && !backgroundError ? 'url(./Login.png)' : 'none'
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
  if (error && (error.includes('Invalid reset link') || error.includes('No tokens found') || error.includes('Missing required tokens'))) {
    return (
      <div 
        className={`reset-password-page ${backgroundLoaded ? 'background-loaded' : ''} ${backgroundError ? 'background-error' : ''}`}
        style={{
          backgroundImage: backgroundLoaded && !backgroundError ? 'url(./Login.png)' : 'none'
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
        backgroundImage: backgroundLoaded && !backgroundError ? 'url(./Login.png)' : 'none'
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