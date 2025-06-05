import React from "react";
import Navbar from "../components/Navbar";
import "../styles/Navbar.css";
import "../styles/About.css"; // Import the new CSS file

const About = () => {
  return (
    <div className="about-container">
      <Navbar />
      <h2 className="about-title">About Page</h2>
      <p className="about-text">If you see this, the component is working!</p>
    </div>
  );
};

export default About;
