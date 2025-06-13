import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatsCards from "../components/DashboardStatCard";
import NotificationBox from "../components/Notifications";
import DownloadBox from "../components/DownloadBox";
import PastRequests from "../components/PastRequests";
import { supabase } from '../../supabase';
import "../styles/Dashboard.css";
import * as IoIcons from 'react-icons/io';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pending: 0, completed: 0, rejected: 0 });
  const [notifications, setNotifications] = useState([]);
  const [pastRequests, setPastRequests] = useState([]);
  const [downloadFile, setDownloadFile] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Enhanced data fetching with better error handling
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching dashboard data...');

      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`);
      }

      if (!currentUser) {
        navigate('/login');
        return;
      }

      setUser(currentUser);
      console.log('👤 Current user:', currentUser.id);

      // Get all requests for the user
      const { data: requests, error: requestsError } = await supabase
        .from('requester')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('req_date', { ascending: false });

      if (requestsError) {
        throw new Error(`Database error: ${requestsError.message}`);
      }

      console.log('📋 Fetched requests:', requests?.length || 0);

      // Get status for each request
      const requestsWithStatus = await Promise.all(
        (requests || []).map(async (req) => {
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
            status: statusData?.[0] || { status_current: 'pending' }
          };
        })
      );

      // Calculate stats
      const pending = requestsWithStatus.filter(req => 
        req.status?.status_current === 'pending'
      ).length;
      
      const completed = requestsWithStatus.filter(req => 
        req.status?.status_current === 'completed' || 
        req.status?.status_current === 'approved'
      ).length;
      
      const rejected = requestsWithStatus.filter(req => 
        req.status?.status_current === 'cancelled'
      ).length;

      console.log('📈 Stats calculated:', { pending, completed, rejected });
      setStats({ pending, completed, rejected });

      // Set past requests
      const recentRequests = requestsWithStatus
        .filter(req => !req.is_draft)
        .slice(0, 10)
        .map(req => ({
          id: req.req_id,
          status: req.status?.status_current || 'pending',
          date: req.req_date,
          purpose: req.req_purpose,
          name: `${req.req_fname || ''} ${req.req_lname || ''}`.trim()
        }));

      setPastRequests(recentRequests);

      // Generate notifications
      const recentNotifications = recentRequests
        .slice(0, 4)
        .map(req => `Request #${req.id} is ${req.status}`)
        .reverse();

      setNotifications(recentNotifications);

      // Set download file
      const completedRequest = requestsWithStatus.find(req => 
        req.status?.status_current === 'completed' || 
        req.status?.status_current === 'approved'
      );
      
      if (completedRequest) {
        setDownloadFile(`Payment Voucher - Request #${completedRequest.req_id}`);
      }

      setLastRefresh(new Date().toLocaleTimeString());
      console.log('✅ Dashboard data updated successfully');

    } catch (err) {
      console.error('❌ Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Enhanced real-time subscription with better debugging
  useEffect(() => {
    if (!user) return;

    console.log('🔔 Setting up real-time subscriptions for user:', user.id);

    // Subscribe to status table changes
    const statusSubscription = supabase
      .channel('status-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'status' 
        },
        (payload) => {
          console.log('🔄 Status table changed:', payload);
          fetchDashboardData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Status subscription status:', status);
      });

    // Subscribe to requester table changes (for new requests)
    const requesterSubscription = supabase
      .channel('requester-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'requester',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Requester table changed:', payload);
          fetchDashboardData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Requester subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from real-time updates');
      statusSubscription.unsubscribe();
      requesterSubscription.unsubscribe();
    };
  }, [user]);

  // Auto-refresh as backup (every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('⏰ Auto-refresh triggered');
      fetchDashboardData();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleCreateNewRequest = () => {
    navigate('/request');
  };

  const handleViewDrafts = () => {
    navigate('/drafts');
  };

  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    fetchDashboardData();
  };



  // Show loading state
  if (loading) {
    return (
      <div className="main-div">
        <Navbar />
        <div className="main-container">
          <div className="loading-container" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            fontSize: '18px'
          }}>
            Loading dashboard data...
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="main-div">
        <Navbar />
        <div className="main-container">
          <div className="error-container" style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            color: 'red'
          }}>
            <h3>Error loading dashboard</h3>
            <p>{error}</p>
            <button 
              onClick={fetchDashboardData}
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
      </div>
    );
  }

  return (
    <div className="main-div">
      <div className="air air1"></div>
      <div className="air air2"></div>
      <div className="air air3"></div>
      <div className="air air4"></div>

      <Navbar />
      <div className="main-container">
        <div className="header-container">
          <div className="greeting-section">
            <h1>Good day, {user?.user_metadata?.full_name?.split(" ")[0] || user?.user_metadata?.name?.split(" ")[0] || user?.email?.split("@")[0] || "User"}!</h1>
            <p>Welcome to your Dashboard.</p>
            {lastRefresh && (
              <small style={{ color: '#666', marginLeft: '10px' }}>
                Last updated: {lastRefresh}
              </small>
            )}
            <div style={{ marginLeft: '20px', display: 'inline-block' }}>
            <button 
              onClick={handleManualRefresh}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              disabled={loading}
            >
              <IoIcons.IoMdRefresh /> {loading ? 'Refreshing...' : 'Refresh'}
            </button>

            </div>
          </div>
        </div>

        <div className="dashboard-body">
          <div className="left-column">
            <StatsCards stats={stats} />
            <PastRequests requests={pastRequests} />
          </div>
          <div className="right-column">
            <button className="btn-primary" onClick={handleCreateNewRequest}>
              <IoIcons.IoMdAdd /> Create New Request
            </button>
            <button className="btn-secondary">
              <IoIcons.IoIosArchive /> My Past Requests
            </button>
            <button className="btn-secondary" onClick={handleViewDrafts}>
              <IoIcons.IoMdCreate /> My Drafts
            </button>

            <NotificationBox notifications={notifications} />
            <DownloadBox fileName={downloadFile} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;