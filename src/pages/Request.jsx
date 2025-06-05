import React from "react";
import Navbar from "../components/Navbar";
import "../styles/Request.css"; // Import the CSS file

const Request = () => {
  console.log("Request component is rendering!");

  return (
    <div>
      <Navbar />
      <div className="request-container">
        <h2 className="request-title">Request Page</h2>
        <p className="request-text">
          If you see this, the component is working!
        </p>
      </div>
    </div>
  );
};

export default Request;
