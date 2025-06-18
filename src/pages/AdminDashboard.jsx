import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../supabase";
import DashboardOverview from "../components/DashboardOverview";
import ManageRequests from "../pages/ManageRequests";
import "../styles/AdminDashboard.css";

function AdminDashboard() {
  const { signOut, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState({
    totalRequests: 0,
    approvedRequests: 0,
    pendingRequests: 0,
    rejectedRequests: 0,
  });
  const [lastRefresh, setLastRefresh] = useState(null);
  const [allRequestsData, setAllRequestsData] = useState([]); // Store all requests data

  // Enhanced data fetching with better error handling for admin
  const fetchAdminDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching admin dashboard data...');

      // Verify admin access
      const { data: profile, error: profileError } = await supabase
        .from("user")
        .select("role")
        .eq("user_id", currentUser?.id)
        .single();

      if (profileError) throw new Error(profileError.message);
      if (profile?.role !== "admin") throw new Error("Access denied");

      setCurrentUserRole(profile.role);

      // Get all users
      const { data: usersData, error: usersError } = await supabase
        .from("user")
        .select("*")
        .order("creationdate", { ascending: false });

      if (usersError) throw new Error(usersError.message);
      setUsers(usersData || []);

      // Get ALL requests in the system (not filtered by user_id)
      const { data: allRequests, error: requestsError } = await supabase
        .from('requester')
        .select('*')
        .eq('is_draft', false) // Only count submitted requests, not drafts
        .order('req_date', { ascending: false });

      if (requestsError) {
        throw new Error(`Database error: ${requestsError.message}`);
      }

      console.log('📋 Fetched all requests:', allRequests?.length || 0);

      // Get status for each request
      const requestsWithStatus = await Promise.all(
        (allRequests || []).map(async (req) => {
          const { data: statusData, error: statusError } = await supabase
            .from('status')
            .select('*')
            .eq('req_id', req.req_id)
            .order('status_update_date', { ascending: false })
            .limit(1);
          
          if (statusError) {
            console.warn(`⚠️ Error getting status for request ${req.req_id}:`, statusError);
          }

          const currentStatus = statusData?.[0]?.status_current || 'pending';
          console.log(`📊 Request ${req.req_id} status: ${currentStatus}`);
          
          return {
            ...req,
            status: statusData?.[0] || { status_current: 'pending' },
            status_current: currentStatus // Add this for easier access
          };
        })
      );

      // Store all requests data for DashboardOverview
      setAllRequestsData(requestsWithStatus);

      // Calculate admin stats for all requests
      const totalRequests = requestsWithStatus.length;
      
      const pendingRequests = requestsWithStatus.filter(req => 
        req.status?.status_current === 'pending'
      ).length;
      
      const approvedRequests = requestsWithStatus.filter(req => 
        req.status?.status_current === 'completed' || 
        req.status?.status_current === 'approved'
      ).length;
      
      const rejectedRequests = requestsWithStatus.filter(req => 
        req.status?.status_current === 'cancelled' ||
        req.status?.status_current === 'rejected'
      ).length;

      const newStats = {
        totalRequests,
        approvedRequests,
        pendingRequests,
        rejectedRequests
      };

      console.log('📈 Admin stats calculated:', newStats);
      setStats(newStats);

      setLastRefresh(new Date().toLocaleTimeString());
      console.log('✅ Admin dashboard data updated successfully');

    } catch (err) {
      console.error('❌ Error fetching admin dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (currentUser) {
      fetchAdminDashboardData();
    }
  }, [currentUser]);

  // Enhanced real-time subscription for admin
  useEffect(() => {
    if (!currentUser || currentUserRole !== 'admin') return;

    console.log('🔔 Setting up admin real-time subscriptions');

    // Subscribe to status table changes (all status changes)
    const statusSubscription = supabase
      .channel('admin-status-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'status' 
        },
        (payload) => {
          console.log('🔄 Admin: Status table changed:', payload);
          fetchAdminDashboardData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Admin status subscription status:', status);
      });

    // Subscribe to requester table changes (all new requests)
    const requesterSubscription = supabase
      .channel('admin-requester-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'requester'
        },
        (payload) => {
          console.log('🔄 Admin: Requester table changed:', payload);
          fetchAdminDashboardData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Admin requester subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from admin real-time updates');
      statusSubscription.unsubscribe();
      requesterSubscription.unsubscribe();
    };
  }, [currentUser, currentUserRole]);

  // Auto-refresh as backup (every 2 minutes for admin)
  useEffect(() => {
    if (currentUserRole !== 'admin') return;
    
    const interval = setInterval(() => {
      console.log('⏰ Admin auto-refresh triggered');
      fetchAdminDashboardData();
    }, 120000); // 2 minutes
    
    return () => clearInterval(interval);
  }, [currentUserRole]);

  const handleManualRefresh = () => {
    console.log('🔄 Admin manual refresh triggered');
    fetchAdminDashboardData();
  };

  // Show loading state
  if (loading) {
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
            onClick={fetchAdminDashboardData}
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
          <div className="profile-icon">👤</div>
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
              className={`nav-item ${
                activeTab === "dashboard" ? "active" : ""
              }`}
              onClick={() => setActiveTab("dashboard")}
            >
              <span className="nav-item-icon">📊</span>
              Dashboard
            </li>
            <li
              className={`nav-item ${activeTab === "requests" ? "active" : ""}`}
              onClick={() => setActiveTab("requests")}
            >
              <span className="nav-item-icon">👥</span>
              Manage Request
            </li>
            <li 
              className="nav-item"
              onClick={handleManualRefresh}
              style={{ cursor: 'pointer' }}
            >
              <span className="nav-item-icon">🔄</span>
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </li>
            <li className="nav-item signout-link" onClick={signOut}>
              <span className="nav-item-icon">🚪</span>
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

export default AdminDashboard;