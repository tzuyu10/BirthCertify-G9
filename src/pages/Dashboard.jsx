import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatsCards from "../components/DashboardStatCard";
import NotificationBox from "../components/Notifications";
import DownloadBox from "../components/DownloadBox";
import { supabase } from '../../supabase';
import "../styles/Dashboard.css";
import * as IoIcons from 'react-icons/io';
import TermsOverlay from "../components/TermsOverlay"

const Dashboard = () => {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  const [requestsData, setRequestsData] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [showTerms, setShowTerms] = useState(false);

  // Memoize calculated stats to prevent unnecessary recalculations
  const stats = useMemo(() => {
    const pending = requestsData.filter(req => 
      req.status_current === 'pending'
    ).length;
    
    const completed = requestsData.filter(req => 
      req.status_current === 'completed' || 
      req.status_current === 'approved'
    ).length;
    
    const rejected = requestsData.filter(req => 
      req.status_current === 'cancelled' ||
      req.status_current === 'rejected'
    ).length;

    return { pending, completed, rejected };
  }, [requestsData]);

  // Memoize notifications to prevent unnecessary recalculations
  const notifications = useMemo(() => {
    const recentRequests = requestsData
      .filter(req => !req.is_draft)
      .slice(0, 4)
      .map(req => `Request #${req.req_id} is ${req.status_current || 'pending'}`)
      .reverse();
    
    return recentRequests;
  }, [requestsData]);

  // Memoize download file
  const downloadFile = useMemo(() => {
    const completedRequest = requestsData.find(req => 
      req.status_current === 'completed' || 
      req.status_current === 'approved'
    );
    
    return completedRequest ? `Payment Voucher - Request #${completedRequest.req_id}` : "";
  }, [requestsData]);

  // Enhanced terms acceptance check
  const checkTermsAcceptance = useCallback(() => {
    if (!user) return false;
    const termsAccepted = localStorage.getItem(`termsAccepted_${user.id}`);
    return termsAccepted === 'true';
  }, [user]);

  // Handle terms acceptance
  const handleTermsAccept = useCallback(() => {
    if (user) {
      localStorage.setItem(`termsAccepted_${user.id}`, 'true');
      console.log('✅ Terms accepted for user:', user.id);
    }
    setShowTerms(false);
  }, [user]);

  // Handle terms decline
  const handleTermsDecline = useCallback(async () => {
    console.log('❌ Terms declined, redirecting to home');
    setIsNavigating(true);
    setShowTerms(false);
    
    if (user) {
      localStorage.removeItem(`termsAccepted_${user.id}`);
    }
      
    await supabase.auth.signOut();
    window.location.href = '/';
  }, [user]);

  // OPTIMIZED: Using the latest_request_status view to avoid relationship ambiguity
  const fetchDashboardData = useCallback(async () => {
    if (isNavigating) return;
    
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
        console.log('❌ No authenticated user, redirecting to login');
        if (!isNavigating) {
          navigate('/login');
        }
        return;
      }

      // Check if terms were declined
      const authSession = await supabase.auth.getSession();
      if (!authSession.data.session) {
        if (!isNavigating) {
          navigate('/');
        }
        return;
      }

      if (!isNavigating) {
        setUser(currentUser);
        console.log('👤 Current user:', currentUser.id);
      }

      // OPTIMIZED: Using the latest_request_status view to get requests with their latest status
      // This eliminates the relationship ambiguity error
      const { data: requestsWithStatus, error: requestsError } = await supabase
        .from('requester')
        .select(`
          *,
          latest_request_status!inner(
            status_current,
            status_update_date
          )
        `)
        .eq('user_id', currentUser.id)
        .order('req_date', { ascending: false });

      if (requestsError) {
        throw new Error(`Database error: ${requestsError.message}`);
      }

      console.log('📋 Fetched requests with status:', requestsWithStatus?.length || 0);

      if (isNavigating) return;

      // Simplified data processing since the view already gives us the latest status
      const processedData = (requestsWithStatus || []).map(req => ({
        ...req,
        status_current: req.latest_request_status?.status_current || 'pending'
      }));

      if (!isNavigating) {
        setRequestsData(processedData);
        setLastRefresh(new Date().toLocaleTimeString());
        console.log('✅ Dashboard data updated successfully');
      }

    } catch (err) {
      console.error('❌ Error fetching dashboard data:', err);
      if (!isNavigating) {
        setError(err.message);
      }
    } finally {
      if (!isNavigating) {
        setLoading(false);
      }
    }
  }, [isNavigating, navigate]);

  // Initial data fetch
  useEffect(() => {
    if (!isNavigating) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, isNavigating]);

  // Check and show terms overlay when user is loaded
  useEffect(() => {
    if (user && !loading && !isNavigating) {
      const hasAcceptedTerms = checkTermsAcceptance();
      console.log('📋 Terms acceptance status:', hasAcceptedTerms);
      
      if (!hasAcceptedTerms) {
        setShowTerms(true);
      }
    }
  }, [user, loading, isNavigating, checkTermsAcceptance]);

  // OPTIMIZED: Single subscription channel for all changes
  useEffect(() => {
    if (!user || isNavigating) return;

    console.log('🔔 Setting up real-time subscription for user:', user.id);

    // Use a single channel for all related changes
    const subscription = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'status' 
        },
        (payload) => {
          if (!isNavigating) {
            console.log('🔄 Status updated:', payload);
            // Debounce the refresh to avoid multiple calls
            setTimeout(() => {
              if (!isNavigating) {
                fetchDashboardData();
              }
            }, 500);
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'requester',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!isNavigating) {
            console.log('🔄 Request updated:', payload);
            // Debounce the refresh
            setTimeout(() => {
              if (!isNavigating) {
                fetchDashboardData();
              }
            }, 500);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from real-time updates');
      subscription.unsubscribe();
    };
  }, [user, isNavigating, fetchDashboardData]);

  // OPTIMIZED: Reduced auto-refresh frequency and added visibility check
  useEffect(() => {
    if (isNavigating) return;
    
    // Only auto-refresh if the page is visible
    const interval = setInterval(() => {
      if (!isNavigating && !document.hidden) {
        console.log('⏰ Auto-refresh triggered');
        fetchDashboardData();
      }
    }, 120000); // Every 2 minutes
    
    return () => clearInterval(interval);
  }, [isNavigating, fetchDashboardData]);

  const handleCreateNewRequest = useCallback(() => {
    if (!isNavigating) {
      navigate('/request');
    }
  }, [isNavigating, navigate]);

  const handleViewDrafts = useCallback(() => {
    if (!isNavigating) {
      navigate('/drafts');
    }
  }, [isNavigating, navigate]);

  const handleManualRefresh = useCallback(() => {
    if (!isNavigating) {
      console.log('🔄 Manual refresh triggered');
      fetchDashboardData();
    }
  }, [isNavigating, fetchDashboardData]);

  // Show loading state
  if (loading && !isNavigating) {
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
  if (error && !isNavigating) {
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

  // Don't render anything if navigating
  if (isNavigating) {
    return null;
  }

  return (
    <div className="main-div">
      <TermsOverlay
        isVisible={showTerms}
        onAccept={handleTermsAccept}
        onDecline={handleTermsDecline}
      />

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
            <DownloadBox fileName={downloadFile} />
          </div>
          <div className="right-column">
            <button className="btn-primary" onClick={handleCreateNewRequest}>
              <IoIcons.IoMdAdd /> Create New Request
            </button>
            <button className="btn-secondary" onClick={handleViewDrafts}>
              <IoIcons.IoMdCreate /> My Drafts
            </button>

            <NotificationBox notifications={notifications} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;