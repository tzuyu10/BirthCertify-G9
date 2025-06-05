import React from 'react'
import '../loginstyle.css'

function Loginpage() {
  return (
    <div className="wrapper">
      <div>
        <h1>Sign in</h1>
        <div className="input-box">
          <input type="text" placeholder="Username" required />
          <i className='bx bx-user'></i> 
        </div>
        <div className="input-box">
          <input type="password" placeholder="Password" required />
          <i className='bx bx-lock'></i> 
        </div>
        <div className="remember-forgot">
          <label><input type="checkbox" /> Remember Me</label>
          <a href="#">Forgot Password</a>
        </div>
        <button type="submit" className="btn">Login</button>
        <button type="button" className="google-btn">
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" />
          Continue with Google
        </button>
        <div className="register-link">
          <p>Don't have an account? <a href="#">Register</a></p>
        </div>
      </div>
    </div>
  )
}

export default Loginpage