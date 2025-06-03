import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Unauthorized.css'; // You can create this CSS file

const Unauthorized = () => {
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-card">
        <h1 className="error-code">403</h1>
        <h2 className="error-title">Access Denied</h2>
        <p className="error-message">
          You don't have permission to access this resource.
        </p>
        <Link to="/dashboard" className="back-btn">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;