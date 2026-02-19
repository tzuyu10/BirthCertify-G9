import React, { useState, useEffect } from 'react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUserRole } from '../hooks/useUserRole'
import '../styles/Login.css'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [backgroundLoaded, setBackgroundLoaded] = useState(false)
  const [backgroundError, setBackgroundError] = useState(false)
  const [googleLogoLoaded, setGoogleLogoLoaded] = useState(false)
  const [googleLogoError, setGoogleLogoError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  
  const { signIn, signInWithGoogle, resetPassword } = useAuth()
  const { isAuthenticated, isAdmin, loading: roleLoading } = useUserRole()
  const location = useLocation()

  // Preload background image
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

  // Preload Google logo
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setGoogleLogoLoaded(true)
      setGoogleLogoError(false)
    }
    img.onerror = () => {
      setGoogleLogoError(true)
      console.warn('Google logo failed to load, using fallback')
    }
    img.src = "https://developers.google.com/identity/images/g-logo.png"
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setIsLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) throw error
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setMessage('')
    setIsLoading(true)
    try {
      const { error } = await signInWithGoogle()
      if (error) throw error
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setResetMessage('')
    setResetLoading(true)

    try {
      const { error } = await resetPassword(resetEmail)
      if (error) throw error
      
      setResetMessage('Password reset email sent! Check your inbox.')
      setTimeout(() => {
        setShowForgotPassword(false)
        setResetEmail('')
        setResetMessage('')
      }, 3000)
    } catch (error) {
      setResetMessage(error.message)
    } finally {
      setResetLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // Redirect if already authenticated
  if (isAuthenticated() && !roleLoading) {
    const from = location.state?.from?.pathname;
    if (from) {
      return <Navigate to={from} replace />;
    }
    return <Navigate to={isAdmin() ? "/admin/dashboard" : "/dashboard"} replace />;
  }

  return (
    <div 
      className={`login-page ${backgroundLoaded ? 'background-loaded' : ''} ${backgroundError ? 'background-error' : ''}`}
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
      
      <div className="login-container">
        <div className="login-wrapper">
          {!showForgotPassword ? (
            <div>
              <h1 className="login-title">Sign In</h1>

              {message && (
                <div className="login-message error">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-input-box">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <i className='bx bx-user'></i>
                </div>

                <div className="login-input-box">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <i 
                    className={`bx ${showPassword ? 'bx-show' : 'bx-hide'} password-toggle`}
                    onClick={togglePasswordVisibility}
                  ></i>
                </div>

                <div className="login-remember-forgot">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={showPassword}
                      onChange={togglePasswordVisibility}
                    />
                    Show Password
                  </label>
                  <a 
                    href="/reset-password-form" className="text-indigo-600 hover:text-indigo-500" 
                    onClick={(e) => {
                      e.preventDefault()
                      setShowForgotPassword(true)
                    }}
                  >
                    Forgot Password?
                  </a>
                </div>

                <button
                  type="submit"
                  className="login-btn"
                  disabled={isLoading}
                >
                  {isLoading && <span className="btn-spinner"></span>}
                  {isLoading ? 'Signing In...' : 'Login'}
                </button>
              </form>

              <button
                type="button"
                className="login-google-btn"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                {isLoading && <span className="btn-spinner"></span>}
                {!isLoading && !googleLogoError && (
                  <img
                    src="https://developers.google.com/identity/images/g-logo.png"
                    alt="Google logo"
                    onError={() => setGoogleLogoError(true)}
                    onLoad={() => setGoogleLogoLoaded(true)}
                    style={{ display: googleLogoLoaded ? 'block' : 'none' }}
                  />
                )}
                {!isLoading && googleLogoError && (
                  <div className="google-icon-fallback">G</div>
                )}
                {isLoading ? 'Signing In...' : 'Continue with Google'}
              </button>

              <div className="login-register-link">
                <p>
                  Don't have an account?{' '}
                  <Link to="/signup">Register</Link>
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="login-title">Reset Password</h1>

              {resetMessage && (
                <div className={`login-message ${resetMessage.includes('sent') ? 'success' : 'error'}`}>
                  {resetMessage}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="login-form">
                <div className="login-input-box">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    disabled={resetLoading}
                  />
                  <i className='bx bx-envelope'></i>
                </div>

                <button
                  type="submit"
                  className="login-btn"
                  disabled={resetLoading}
                >
                  {resetLoading && <span className="btn-spinner"></span>}
                  {resetLoading ? 'Sending...' : 'Send Reset Email'}
                </button>
              </form>

              <div className="login-register-link">
                <p>
                  Remember your password?{' '}
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault()
                      setShowForgotPassword(false)
                      setResetEmail('')
                      setResetMessage('')
                    }}
                  >
                    Back to Login
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login