import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LabelList,
} from "recharts";
import StatCard from "../components/StatCard";
import { supabase } from "../../supabase"; // Direct supabase import like AdminDashboard
import "../styles/StatCard.css";

// Custom label component for pie chart with smart visibility
const CustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
  name,
  percent,
  data,
}) => {
  if (value === 0 || percent < 0.05) {
    return null;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const slicePercentage = (value / total) * 100;

  if (slicePercentage < 8) {
    return null;
  }

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const labelRadius = outerRadius + 30;
  const labelX = cx + labelRadius * Math.cos(-midAngle * RADIAN);
  const labelY = cy + labelRadius * Math.sin(-midAngle * RADIAN);

  const extendedX = labelX + (labelX > cx ? 20 : -20);

  return (
    <g>
      <path
        d={`M${x},${y}L${labelX},${labelY}L${extendedX},${labelY}`}
        stroke="#666"
        strokeWidth={1}
        fill="none"
      />
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

const DashboardOverview = ({ 
  stats, 
  currentUserId, 
  allRequestsData = null, 
  isAdminView = false,
  onRefresh 
}) => {
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Helper function to determine if request is new (within last 24 hours)
  const isNewRequest = (request) => {
    try {
      if (!request.req_date) {
        console.warn('Request has no req_date:', request.req_id);
        return false;
      }

      const requestDate = new Date(request.req_date);
      
      // Check if date is valid
      if (isNaN(requestDate.getTime())) {
        console.warn('Invalid date for request:', request.req_id, request.req_date);
        return false;
      }

      const now = new Date();
      const hoursDiff = (now - requestDate) / (1000 * 60 * 60);
      
      console.log(`Request ${request.req_id}: ${request.req_date} -> ${hoursDiff} hours ago`);
      
      return hoursDiff <= 24 && hoursDiff >= 0; // Within last 24 hours and not in future
    } catch (error) {
      console.error('Error checking if request is new:', error, request);
      return false;
    }
  };

  // Helper function to determine if request is rejected
  const isRejectedRequest = (request) => {
    return request.status_current === 'cancelled' || request.status_current === 'rejected';
  };

  // Initial data fetch or use passed data
  useEffect(() => {
    if (allRequestsData && isAdminView) {
      // Use passed admin data
      setRecentRequests(allRequestsData);
      setLoading(false);
      setError(null);
      setLastRefresh(new Date().toLocaleTimeString());
    } else {
      // Fetch user data
      fetchUserDashboardData();
    }
  }, [currentUserId, allRequestsData, isAdminView]);

  // Enhanced real-time subscription (only for regular users, admin handles it in AdminDashboard)
  useEffect(() => {
    if (isAdminView || !currentUser && !currentUserId) return;

    const userId = currentUserId || currentUser?.id;
    if (!userId) return;

    console.log('🔔 Setting up user real-time subscriptions for user:', userId);

    // Subscribe to status changes for user's requests
    const statusSubscription = supabase
      .channel(`user-status-changes-${userId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'status' 
        },
        (payload) => {
          console.log('🔄 User: Status table changed:', payload);
          fetchUserDashboardData();
        }
      )
      .subscribe((status) => {
        console.log('📡 User status subscription status:', status);
      });

    // Subscribe to requester table changes for this user
    const requesterSubscription = supabase
      .channel(`user-requester-changes-${userId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'requester',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔄 User: Requester table changed:', payload);
          fetchUserDashboardData();
        }
      )
      .subscribe((status) => {
        console.log('📡 User requester subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from user real-time updates');
      statusSubscription.unsubscribe();
      requesterSubscription.unsubscribe();
    };
  }, [currentUser, currentUserId, isAdminView]);

  // Auto-refresh as backup (only for regular users)
  useEffect(() => {
    if (isAdminView) return; // Admin handles auto-refresh
    
    const interval = setInterval(() => {
      console.log('⏰ User auto-refresh triggered');
      fetchUserDashboardData();
    }, 180000); // 3 minutes
    
    return () => clearInterval(interval);
  }, [isAdminView]);

  // Manual refresh handler
  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    if (onRefresh && isAdminView) {
      // For admin view, trigger parent refresh
      onRefresh();
    } else {
      // For user view, refresh locally
      await fetchUserDashboardData();
    }
  };

  // Filter requests based on selected filter and search term
  const filteredRequests = recentRequests.filter(request => {
    const matchesFilter = selectedFilter === 'all' || 
      (selectedFilter === 'pending' && request.status_current === 'pending') ||
      (selectedFilter === 'new' && isNewRequest(request)) ||
      (selectedFilter === 'rejected' && isRejectedRequest(request)) ||
      (selectedFilter === 'completed' && (request.status_current === 'completed' || request.status_current === 'approved'));

    const matchesSearch = searchTerm === '' ||
      request.req_fname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.req_lname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.req_purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.req_id?.toString().includes(searchTerm);

    return matchesFilter && matchesSearch;
  });

  // Get counts for filter tabs
  const getFilterCounts = () => {
    const counts = {
      all: recentRequests.length,
      new: 0,
      pending: 0,
      completed: 0,
      rejected: 0
    };

    recentRequests.forEach(request => {
      if (isNewRequest(request)) counts.new++;
      if (request.status_current === 'pending') counts.pending++;
      if (request.status_current === 'completed' || request.status_current === 'approved') counts.completed++;
      if (isRejectedRequest(request)) counts.rejected++;
    });

    console.log('Filter counts:', counts);
    return counts;
  };

  // Get status badge style
  const getStatusBadge = (status, isDraft) => {
    if (isDraft) {
      return { className: 'status-badge draft', text: 'DRAFT' };
    }
    
    switch (status?.toLowerCase()) {
      case 'pending':
        return { className: 'status-badge pending', text: 'PENDING' };
      case 'completed':
      case 'approved':
        return { className: 'status-badge completed', text: 'COMPLETED' };
      case 'cancelled':
      case 'rejected':
        return { className: 'status-badge rejected', text: 'REJECTED' };
      default:
        return { className: 'status-badge pending', text: 'PENDING' };
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        return 'Just now';
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)} hours ago`;
      } else if (diffInHours < 168) {
        return `${Math.floor(diffInHours / 24)} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid date';
    }
  };

  // Handle request click (you can customize this action)
  const handleRequestClick = (request) => {
    console.log('Request clicked:', request);
    // You could implement navigation to a detailed view here
    // Example: navigate(`/requests/${request.req_id}`);
  };

  // Filter out zero values and create pie data
  const pieData = [
    { name: "Completed", value: stats.approvedRequests, color: "#28a745" },
    { name: "Pending", value: stats.pendingRequests, color: "#ffc107" },
    { name: "Rejected", value: stats.rejectedRequests, color: "#dc3545" },
  ].filter((item) => item.value > 0);

  const renderCustomLabel = (props) => {
    return <CustomLabel {...props} data={pieData} />;
  };

  const filterCounts = getFilterCounts();

  return (
    <>
      <div className="dashboard-header">
        <h1 style={{ color: "#000", fontSize: "28px" }}>
          {isAdminView ? 'ADMIN DASHBOARD' : 'DASHBOARD'}
        </h1>
        {lastRefresh && (
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
            Last updated: {lastRefresh}
          </div>
        )}
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
              {pieData.length > 0 ? (
                <>
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
                        label={renderCustomLabel}
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
                    {stats.approvedRequests > 0 && (
                      <div className="legend-item">
                        <span className="legend-color completed"></span>
                        <span>
                          Completed Request ({stats.approvedRequests})
                        </span>
                      </div>
                    )}
                    {stats.pendingRequests > 0 && (
                      <div className="legend-item">
                        <span className="legend-color pending"></span>
                        <span>Pending Request ({stats.pendingRequests})</span>
                      </div>
                    )}
                    {stats.rejectedRequests > 0 && (
                      <div className="legend-item">
                        <span className="legend-color rejected"></span>
                        <span>Rejected Request ({stats.rejectedRequests})</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "350px",
                    color: "#666",
                    fontSize: "16px",
                  }}
                >
                  No data available to display
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Activity Section */}
          <div className="activity-section">
            <div className="activity-container">
              <div className="activity-header">
                <h3>{isAdminView ? 'All Requests' : 'Recent Requests'}</h3>
                <div className="activity-controls">
                  <button 
                    onClick={handleRefresh}
                    className="refresh-btn"
                    disabled={loading}
                  >
                    {loading ? '⟳' : '↻'} Refresh
                  </button>
                </div>
              </div>

              {/* Filters and Search */}
              <div className="activity-filters">
                <div className="filter-tabs">
                  <button 
                    className={`filter-tab ${selectedFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedFilter('all')}
                  >
                    All ({filterCounts.all})
                  </button>
                  <button 
                    className={`filter-tab ${selectedFilter === 'new' ? 'active' : ''}`}
                    onClick={() => setSelectedFilter('new')}
                  >
                    New ({filterCounts.new})
                  </button>
                  <button 
                    className={`filter-tab ${selectedFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setSelectedFilter('pending')}
                  >
                    Pending ({filterCounts.pending})
                  </button>
                  <button 
                    className={`filter-tab ${selectedFilter === 'completed' ? 'active' : ''}`}
                    onClick={() => setSelectedFilter('completed')}
                  >
                    Completed ({filterCounts.completed})
                  </button>
                  <button 
                    className={`filter-tab ${selectedFilter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setSelectedFilter('rejected')}
                  >
                    Rejected ({filterCounts.rejected})
                  </button>
                </div>
                
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search by name, purpose, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              {/* Activity List */}
              <div className="activity-list">
                {loading ? (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <span>Loading requests...</span>
                  </div>
                ) : error ? (
                  <div className="error-state">
                    <span className="error-icon">⚠</span>
                    <span>Error: {error}</span>
                    <button onClick={handleRefresh} className="retry-btn">
                      Try Again
                    </button>
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">📋</span>
                    <span>
                      {searchTerm || selectedFilter !== 'all' 
                        ? 'No requests match your filters' 
                        : 'No recent requests found'
                      }
                    </span>
                    {selectedFilter === 'new' && (
                      <div style={{ marginTop: '10px', fontSize: '14px', color: '#999' }}>
                        New requests are those created within the last 24 hours
                      </div>
                    )}
                    {selectedFilter === 'rejected' && (
                      <div style={{ marginTop: '10px', fontSize: '14px', color: '#999' }}>
                        Rejected requests are those that have been cancelled or rejected
                      </div>
                    )}
                  </div>
                ) : (
                  filteredRequests.map((request) => {
                    const statusBadge = getStatusBadge(request.status_current, request.is_draft);
                    const isNew = isNewRequest(request);
                    
                    return (
                      <div 
                        key={request.req_id} 
                        className={`activity-item ${isNew ? 'new-item' : ''}`}
                        onClick={() => handleRequestClick(request)}
                      >
                        <div className="activity-main">
                          <div className="activity-info">
                            <div className="activity-title">
                              <span className="request-id">#{request.req_id}</span>
                              <span className="requester-name">
                                {request.req_fname} {request.req_lname}
                              </span>
                              {isNew && <span className="new-badge">NEW</span>}
                            </div>
                            <div className="activity-purpose">
                              Purpose: {request.req_purpose || 'Not specified'}
                            </div>
                            <div className="activity-date">
                              Created: {formatDate(request.req_date)}
                            </div>
                          </div>
                          
                          <div className="activity-meta">
                            <span className={statusBadge.className}>
                              {statusBadge.text}
                            </span>
                            <div className="activity-time">
                              {formatDate(request.req_date)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Show More Button */}
              {filteredRequests.length >= 50 && (
                <div className="load-more">
                  <button 
                    className="load-more-btn"
                    onClick={handleRefresh}
                  >
                    Load More Requests
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSS Styles moved to separate style block */}
      <style>{`
        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .activity-controls {
          display: flex;
          gap: 10px;
        }

        .refresh-btn {
          padding: 8px 16px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #1976D2;
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .activity-filters {
          margin-bottom: 20px;
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 15px;
        }

        .filter-tabs {
          display: flex;
          gap: 5px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .filter-tab {
          padding: 8px 16px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 20px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
          color: black;
        }

        .filter-tab.active {
          background: #2196F3;
          color: white;
          border-color: #2196F3;
        }

        .filter-tab:hover:not(.active) {
          background: #e0e0e0;
          color: black;
        }

        .search-box {
          margin-top: 10px;
        }

        .search-input {
          width: 100%;
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #2196F3;
          box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
        }

        .activity-item {
          padding: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 10px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .activity-item:hover {
          border-color: #2196F3;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .activity-item.new-item {
          border-left: 4px solid #4CAF50;
        }

        .activity-main {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .activity-info {
          flex: 1;
        }

        .activity-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 5px;
          flex-wrap: wrap;
        }

        .request-id {
          font-weight: bold;
          color: #2196F3;
          font-size: 14px;
        }

        .requester-name {
          font-weight: 600;
          color: #333;
        }

        .new-badge {
          background: #4CAF50;
          color: white;
          padding: 2px 8px;
          margin-right: 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
        }

        .activity-purpose {
          color: #666;
          font-size: 13px;
          margin-bottom: 5px;
        }

        .activity-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .status-badge.pending {
          background: #FFF3CD;
          color: #856404;
        }

        .status-badge.completed {
          background: #D4EDDA;
          color: #155724;
        }

        .status-badge.rejected {
          background: #F8D7DA;
          color: #721C24;
        }

        .status-badge.draft {
          background: #E2E3E5;
          color: #383D41;
        }

        .activity-time {
          font-size: 12px;
          color: #999;
        }

        .loading-state, .error-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px;
          color: #666;
          text-align: center;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #2196F3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 10px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-icon, .empty-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }

        .retry-btn, .load-more-btn {
          margin-top: 10px;
          padding: 8px 16px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .retry-btn:hover, .load-more-btn:hover {
          background: #1976D2;
        }

        .load-more {
          text-align: center;
          margin-top: 20px;
        }

        @media (max-width: 768px) {
          .activity-main {
            flex-direction: column;
            gap: 10px;
          }

          .activity-meta {
            align-items: flex-start;
            flex-direction: row;
            justify-content: space-between;
            width: 100%;
          }

          .filter-tabs {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </>
  );
};

export default DashboardOverview;