import React from "react";

const StatCard = ({ title, value, color }) => {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
    </div>
  );
};

export default StatCard;
