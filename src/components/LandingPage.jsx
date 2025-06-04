import React from 'react'
import '../styles/LandingPage.css'

const LandingPage = () => {
  return (
<div className="lSection">
      <img src='./colored-logo.png' alt="colored logo" className="lLogo" />
      <p className="lTagline">Revolutionizing Civil Requests —</p>
      <h1>
        <span className="lBold">One Click</span> at a <span className="lBold">Time</span>
      </h1>
      <div className="lButtons">
        <button className="btn Login">Login</button>
        <button className="btn Signup">Sign up</button>
        </div>
      </div>
 
  );
}

export default LandingPage