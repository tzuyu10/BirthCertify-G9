import React from "react";
import Navbar from "../components/Navbar";
import "../styles/Navbar.css";

const About = () => {
  return (
    <div style={{ backgroundColor: "red", padding: "20px", marginTop: "50px" }}>
      <Navbar />
      <h2 style={{ color: "white" }}>About Page</h2>
      <p style={{ color: "white" }}>
        If you see this, the component is working!
      </p>
    </div>
  );
};

export default About;
