import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../supabase";
import DashboardOverview from "../components/DashboardOverview";
import ManageRequests from "../pages/ManageRequests";
import "../styles/AdminDashboard.css";
import { 
  IoBarChartSharp, 
  IoPeopleSharp, 
  IoRefreshCircleSharp, 
  IoExitSharp
} from 'react-icons/io5';

function AdminDashboard() {
  const { signOut, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [allRequestsData, setAllRequestsData] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Memoize user initials to prevent unnecessary recalculations
  const initials = useMemo(() => {
    return currentUser?.user_metadata?.full_name?.split(" ")
      .map(name => name[0])
      .join("") || currentUser?.email?.[0]?.toUpperCase() || 'A';
  }, [currentUser?.user_metadata?.full_name, currentUser?.email]);

  // Memoize stats calculation to prevent unnecessary recalculations
  const stats = useMemo(() => {
    const totalRequests = allRequestsData.length;
    
    const pendingRequests = allRequestsData.filter(req => 
      req.status_current === 'pending'
    ).length;
    
    const approvedRequests = allRequestsData.filter(req => 
      req.status_current === 'completed' || req.status_current === 'approved'
    ).length;
    
    const rejectedRequests = allRequestsData.filter(req => 
      req.status_current === 'cancelled' || req.status_current === 'rejected'
    ).length;

    return {
      totalRequests,
      approvedRequests,
      pendingRequests,
      rejectedRequests
    };
  }, [allRequestsData]);

  // Optimized data fetching with single query using JOIN
  const fetchAdminDashboardData = useCallback(async (showRefreshing = false) => {
    if (!currentUser?.id) return;
    
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Single query to get user role
      const { data: profile, error: profileError } = await supabase
        .from("user")
        .select("role")
        .eq("user_id", currentUser.id)
        .single();

      if (profileError) throw new Error(profileError.message);
      if (profile?.role !== "admin") throw new Error("Access denied");

      setCurrentUserRole(profile.role);

      // Parallel queries for better performance
      const [usersResult, requestsResult] = await Promise.all([
        // Get users (only if needed for other components)
        supabase
          .from("user")
          .select("*")
          .order("creationdate", { ascending: false }),
        
        // Get requests first, then we'll fetch status separately for better compatibility
        supabase
          .from('requester')
          .select('*')
          .eq('is_draft', false)
          .order('req_date', { ascending: false })
      ]);

      if (usersResult.error) throw new Error(usersResult.error.message);
      if (requestsResult.error) throw new Error(requestsResult.error.message);

      setUsers(usersResult.data || []);

      // Get all unique request IDs for batch status fetching
      const requestIds = (requestsResult.data || []).map(req => req.req_id);
      
      if (requestIds.length === 0) {
        setAllRequestsData([]);
        setLastRefresh(new Date().toLocaleTimeString());
        return;
      }

      // Batch fetch latest status for all requests
      const { data: statusData, error: statusError } = await supabase
        .from('status')
        .select('req_id, status_current, status_update_date')
        .in('req_id', requestIds)
        .order('status_update_date', { ascending: false });

      if (statusError) {
        console.warn('⚠️ Error fetching status data:', statusError);
      }

      // Create a map of latest status for each request
      const statusMap = new Map();
      (statusData || []).forEach(status => {
        if (!statusMap.has(status.req_id)) {
          statusMap.set(status.req_id, status);
        }
      });

      // Combine requests with their latest status
      const processedRequests = (requestsResult.data || []).map(req => {
        const latestStatus = statusMap.get(req.req_id) || { status_current: 'pending' };
        
        return {
          ...req,
          status: latestStatus,
          status_current: latestStatus.status_current || 'pending'
        };
      });

      setAllRequestsData(processedRequests);
      setLastRefresh(new Date().toLocaleTimeString());

    } catch (err) {
      console.error('❌ Error fetching admin dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUser?.id]);

  // Debounced refresh function to prevent rapid successive calls
  const debouncedRefresh = useCallback(
    debounce(() => fetchAdminDashboardData(true), 1000),
    [fetchAdminDashboardData]
  );

  // Initial data fetch
  useEffect(() => {
    if (currentUser?.id) {
      fetchAdminDashboardData();
    }
  }, [currentUser?.id, fetchAdminDashboardData]);

  // Optimized real-time subscription with debouncing
  useEffect(() => {
    if (!currentUser?.id || currentUserRole !== 'admin') return;

    let refreshTimeout;

    // Single subscription for both tables with debounced refresh
    const subscription = supabase
      .channel('admin-realtime-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'status' 
        },
        () => {
          clearTimeout(refreshTimeout);
          refreshTimeout = setTimeout(() => debouncedRefresh(), 500);
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'requester'
        },
        () => {
          clearTimeout(refreshTimeout);
          refreshTimeout = setTimeout(() => debouncedRefresh(), 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(refreshTimeout);
      subscription.unsubscribe();
    };
  }, [currentUser?.id, currentUserRole, debouncedRefresh]);

  // Reduced auto-refresh frequency and only when tab is active
  useEffect(() => {
    if (currentUserRole !== 'admin') return;
    
    const interval = setInterval(() => {
      // Only refresh if the page is visible
      if (!document.hidden) {
        fetchAdminDashboardData(true);
      }
    }, 300000); // 5 minutes instead of 2
    
    return () => clearInterval(interval);
  }, [currentUserRole, fetchAdminDashboardData]);

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    fetchAdminDashboardData(true);
  }, [fetchAdminDashboardData]);

  // Memoized tab change handler
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // Show loading state
  if (loading && !isRefreshing) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          width: '100%',
          fontSize: '18px'
        }}>
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="error-container" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          width: '100%',
          color: 'red'
        }}>
          <h3>Error loading admin dashboard</h3>
          <p>{error}</p>
          <button 
            onClick={() => fetchAdminDashboardData()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <aside className="sidebar">
        <div className="profile">
          <div className="profile-icon">{initials}</div>
          <div className="email">
            {currentUser?.email || "procamail@gmail.com"}
          </div>
          <div className="role">Admin</div>
          {lastRefresh && (
            <div style={{ fontSize: '12px', color: 'white', marginTop: '5px' }}>
              Last updated: {lastRefresh}
            </div>
          )}
        </div>
        <nav>
          <ul className="sidebar-nav">
            <li
              className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => handleTabChange("dashboard")}
            >
              <span className="nav-item-icon"><IoBarChartSharp /></span>
              Dashboard
            </li>
            <li
              className={`nav-item ${activeTab === "requests" ? "active" : ""}`}
              onClick={() => handleTabChange("requests")}
            >
              <span className="nav-item-icon"><IoPeopleSharp /></span>
              Manage Request
            </li>
            <li 
              className="nav-item"
              onClick={handleManualRefresh}
              style={{ cursor: 'pointer', opacity: isRefreshing ? 0.6 : 1 }}
              disabled={isRefreshing}
            >
              <span className="nav-item-icon"><IoRefreshCircleSharp /></span>
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </li>
            <li className="nav-item signout-link" onClick={signOut}>
              <span className="nav-item-icon"><IoExitSharp /></span>
              Sign out
            </li>
          </ul>
        </nav>
      </aside>

      <main className="dashboard-main">
        {activeTab === "dashboard" && (
          <DashboardOverview 
            stats={stats} 
            allRequestsData={allRequestsData}
            isAdminView={true}
            onRefresh={handleManualRefresh}
          />
        )}

        {activeTab === "requests" && (
          <ManageRequests />
        )}  
      </main>
    </div>
  );
}

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default React.memo(AdminDashboard);