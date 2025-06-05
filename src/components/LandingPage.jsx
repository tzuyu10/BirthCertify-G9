import React from "react";
import { Link } from "react-router-dom";
import "../styles/LandingPage.css";

const LandingPage = () => {
  return (
    <div className="lSection">
      <img src="./colored-logo.png" alt="colored logo" className="lLogo" />
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
  );
};

export default LandingPage;
