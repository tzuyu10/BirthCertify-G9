import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LabelList,
} from "recharts";
import StatCard from "../components/StatCard";

// Mock data for activities
const mockActivities = [
  {
    id: 1,
    text: "New certificate application submitted",
    time: "2 hours ago",
    type: "new",
  },
  {
    id: 2,
    text: "Certificate Request 1304 approved (security clearance)",
    time: "3 hours ago",
    type: "approved",
  },
  {
    id: 3,
    text: "Missing documents uploaded for Request 1303",
    time: "5 hours ago",
    type: "update",
  },
  {
    id: 4,
    text: "Certificate Request 1302 rejected (invalid information)",
    time: "1 day ago",
    type: "rejected",
  },
  {
    id: 5,
    text: "New certificate application submitted for Request 1301",
    time: "1 day ago",
    type: "new",
  },
  {
    id: 6,
    text: "Certificate Request 1300 approved (security clearance)",
    time: "2 days ago",
    type: "approved",
  },
  {
    id: 7,
    text: "Ready for Review - Request 1299",
    time: "2 days ago",
    type: "review",
  },
  {
    id: 8,
    text: "Request 1298 completed and sent to printing",
    time: "3 days ago",
    type: "completed",
  },
];

const mockRequests = [
  { id: 1, text: "Admin Long approved Request 1239" },
  { id: 2, text: "New birth certificate application submitted for John" },
  { id: 3, text: "Request 1240 pending clearance" },
  { id: 4, text: "Client profile for Anna Smith" },
  { id: 5, text: "Request 1241 cleared by Special Unit" },
  { id: 6, text: "Client understanding and requirements" },
  { id: 7, text: "Request 1242 for Request for viewing address" },
  { id: 8, text: "Client certificate Request 1243 in Registry" },
];

// Custom label component for pie chart
const CustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
  name,
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Calculate position for the label line end
  const labelRadius = outerRadius + 30;
  const labelX = cx + labelRadius * Math.cos(-midAngle * RADIAN);
  const labelY = cy + labelRadius * Math.sin(-midAngle * RADIAN);

  // Calculate the extended line position
  const extendedX = labelX + (labelX > cx ? 20 : -20);

  return (
    <g>
      {/* Line from pie slice to label */}
      <path
        d={`M${x},${y}L${labelX},${labelY}L${extendedX},${labelY}`}
        stroke="#666"
        strokeWidth={1}
        fill="none"
      />
      {/* Label text */}
      <text
        x={extendedX + (extendedX > labelX ? 5 : -5)}
        y={labelY}
        textAnchor={extendedX > labelX ? "start" : "end"}
        dominantBaseline="middle"
        fontSize="12"
        fontWeight="500"
        fill="#333"
      >
        {`${name}: ${value}`}
      </text>
    </g>
  );
};

const DashboardOverview = ({ stats }) => {
  const pieData = [
    { name: "Completed", value: stats.approvedRequests, color: "#28a745" },
    { name: "Pending", value: stats.pendingRequests, color: "#ffc107" },
    { name: "Rejected", value: stats.rejectedRequests, color: "#dc3545" },
  ];

  return (
    <>
      <div className="dashboard-header">
        <h1 style={{ color: "#000", fontSize: "28px" }}>DASHBOARD</h1>
      </div>

      <div className="dashboard-overview">
        {/* Stats Cards */}
        <div className="stats-grid">
          <StatCard
            title="TOTAL REQUESTS"
            value={stats.totalRequests}
            color="blue"
          />
          <StatCard
            title="COMPLETED REQUESTS"
            value={stats.approvedRequests}
            color="green"
          />
          <StatCard
            title="PENDING REQUESTS"
            value={stats.pendingRequests}
            color="orange"
          />
          <StatCard
            title="REJECTED REQUESTS"
            value={stats.rejectedRequests}
            color="red"
          />
        </div>

        {/* Chart and Activity Section */}
        <div className="dashboard-content">
          {/* Pie Chart Section */}
          <div
            className="chart-section"
            style={{
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
              border: "1px solid #e8eaed",
            }}
          >
            <div
              className="chart-header"
              style={{
                background: "linear-gradient(135deg, #2196F3, #1976D2)",
                padding: "15px 20px",
                borderRadius: "12px 12px 0 0",
                marginBottom: "0",
                position: "relative",
              }}
            >
              <h2
                className="chart-title"
                style={{
                  margin: "0",
                  color: "white",
                  fontSize: "18px",
                  fontWeight: "600",
                  textAlign: "center",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Current Active Request
              </h2>
              <div
                style={{
                  content: '""',
                  position: "absolute",
                  bottom: "0",
                  left: "0",
                  right: "0",
                  height: "2px",
                  background:
                    "linear-gradient(90deg, #1976d2, #2196f3, #1976d2)",
                }}
              ></div>
            </div>
            <div
              className="chart-container"
              style={{
                padding: "20px",
                background: "white",
              }}
            >
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={CustomLabel}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    labelFormatter={() => ""}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color completed"></span>
                  <span>Completed Request</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color pending"></span>
                  <span>Pending Request</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color rejected"></span>
                  <span>Rejected Request</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Section */}
          <div className="activity-section">
            <div className="activity-container">
              <h3>New & Pending Requests</h3>
              <div className="activity-list">
                {mockActivities.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div
                      className={`activity-indicator ${activity.type}`}
                    ></div>
                    <div className="activity-content">
                      <div className="activity-text">{activity.text}</div>
                      <div className="activity-time">{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="see-all-btn">See All</button>
            </div>
          </div>
        </div>

        {/* Recent Requests Section */}
        <div className="recent-requests">
          <h3>Recent Requests</h3>
          <div className="requests-list">
            {mockRequests.map((request) => (
              <div key={request.id} className="request-item">
                <div className="request-icon">📄</div>
                <div className="request-text">{request.text}</div>
              </div>
            ))}
          </div>
          <button className="see-all-btn">See All</button>
        </div>
      </div>
    </>
  );
};

export default DashboardOverview;
