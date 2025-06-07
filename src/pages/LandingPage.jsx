import React from "react";
import { Link } from "react-router-dom";
import "../styles/LandingPage.css";
import Footer from "../components/Footer";

const LandingPage = () => {
  return (
    <div className="landing-container">
      {/* Animated Background */}
      <div className="bg-animation">
        {/* Floating circles */}
        <div className="floating-circle"></div>
        <div className="floating-circle"></div>
        <div className="floating-circle"></div>
        <div className="floating-circle"></div>
        <div className="floating-circle"></div>
        <div className="floating-circle"></div>
        
        <div className="floating-circle shade-light"></div>
        <div className="floating-circle shade-medium"></div>
        <div className="floating-circle shade-soft"></div>
        <div className="floating-circle shade-pearl"></div>
        <div className="floating-circle shade-mist"></div>
        <div className="floating-circle shade-frost"></div>
        <div className="floating-circle shade-snow"></div>
        <div className="floating-circle shade-cream"></div>

        {/* Floating documents */}
        <div className="floating-doc"></div>
        <div className="floating-doc"></div>
        
        <div className="floating-doc shade-light"></div>
        <div className="floating-doc shade-medium"></div>
        <div className="floating-doc shade-soft"></div>
        <div className="floating-doc shade-pearl"></div>
        <div className="floating-doc shade-mist"></div>
        <div className="floating-doc shade-frost"></div>

        {/* Particles */}
       <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>

        <div className="particle shade-light"></div>
        <div className="particle shade-medium"></div>
        <div className="particle shade-soft"></div>
        <div className="particle shade-pearl"></div>
        <div className="particle shade-mist"></div>
        <div className="particle shade-frost"></div>
        <div className="particle shade-snow"></div>
        <div className="particle shade-cream"></div>
      </div>

      {/* Main Content */}
      <div className="lSection">
        <div className="main-content">
          <img src="./Asset 1.svg" alt="colored logo" className="lLogo" />
          <p className="lTagline">Revolutionizing Civil Requests —</p>
          <h1>
            <span className="lBold">One Click</span> at a{" "}
            <span className="lBold">Time</span>
          </h1>
          <div className="lButtons">
            <Link to="/login">
              <button className="btn Login">Login</button>
            </Link>
            <Link to="/signup">
              <button className="btn Signup">Sign up</button>
            </Link>
          </div>
        </div>
        
        {/* Footer positioned at bottom */}
        <div className="footer-wrapper">
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default LandingPage;