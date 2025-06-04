import React, { useState } from 'react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUserRole } from '../hooks/useUserRole'
import '../styles/loginstyle.css'


const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, signInWithGoogle } = useAuth()
  const { isAuthenticated, isAdmin, loading: roleLoading } = useUserRole()
  const location = useLocation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setIsLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      // Success - RoleBasedRedirect will handle the redirect
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
      // Success - RoleBasedRedirect will handle the redirect
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsLoading(false)
    }
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
  <div className="wrapper">
    <div>
      <h1>Sign in</h1>

      {message && (
        <div className="message error">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="input-box">
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

        <div className="input-box">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          <i className='bx bx-lock'></i>
        </div>

        <div className="remember-forgot">
          <label>
            <input type="checkbox" />
            Remember Me
          </label>
          <a href="#">Forgot Password</a>
        </div>

        <button
          type="submit"
          className="btn"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Login'}
        </button>
      </form>

      <button
        type="button"
        className="google-btn"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <img
          src="https://developers.google.com/identity/images/g-logo.png"
          alt="Google logo"
        />
        Continue with Google
      </button>

      <div className="register-link">
        <p>
          Don't have an account?{' '}
          <Link to="/signup">Register</Link>
        </p>
      </div>
    </div>
  </div>
)

}

export default Login