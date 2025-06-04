import React from "react";
import Navbar from "../components/Navbar";

const Request = () => {
  console.log("Request component is rendering!");

  return (
    <div style={{ backgroundColor: "red", padding: "20px", marginTop: "50px" }}>
      <Navbar />
      <h2 style={{ color: "white" }}>Request Page</h2>
      <p style={{ color: "white" }}>
        If you see this, the component is working!
      </p>
    </div>
  );
};

export default Request;
