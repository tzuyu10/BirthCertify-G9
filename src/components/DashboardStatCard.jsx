const StatsCards = ({ stats }) => {
  return (
    <div className="stats-row">
      {["pending", "completed", "rejected"].map((type) => (
        <div key={type} className="stat-card">
          <span className="stat-title-user">
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
          <div className="stat-value-user">{stats[type]}</div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
