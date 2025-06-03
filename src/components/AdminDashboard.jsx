import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUserRole } from '../hooks/useUserRole'
import '../styles/AdminDashboard.css'
import { supabase } from '../../supabase'

function AdminDashboard() {
  const { signOut, user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUserRole, setCurrentUserRole] = useState(null)
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminsCount: 0,
    regularUsersCount: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0
  })

  useEffect(() => {
    if (currentUser) {
      fetchUsers()
    }
  }, [currentUser])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Current authenticated user:', currentUser)
      
      // First, get current user's profile to check their role
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('user') // Changed from 'users' to 'user' to match your useUserRole hook
        .select('role, fname, lname, contact')
        .eq('user_id', currentUser?.id) // Changed from 'id' to 'user_id' to match your schema
        .single()

      console.log('Current user profile:', currentUserProfile)
      console.log('Profile error:', profileError)
      
      if (profileError) {
        throw new Error(`Failed to get user profile: ${profileError.message}`)
      }
      
      setCurrentUserRole(currentUserProfile?.role)
      
      // Check if user is admin
      if (currentUserProfile?.role !== 'admin') {
        throw new Error('Access denied: Admin privileges required')
      }

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('user') // Changed from 'users' to 'user'
        .select('*')
        .order('creationdate', { ascending: false })

      console.log('Users data:', usersData)
      console.log('Users error:', usersError)

      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`)
      }

      setUsers(usersData || [])
      calculateStats(usersData || [])

    } catch (error) {
      console.error('Error fetching users:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (userData) => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const admins = userData.filter(user => user.role === 'admin')
    const newThisWeek = userData.filter(user => 
      new Date(user.created_at) >= oneWeekAgo
    )
    const newThisMonth = userData.filter(user => 
      new Date(user.created_at) >= oneMonthAgo
    )

    setStats({
      totalUsers: userData.length,
      adminsCount: admins.length,
      regularUsersCount: userData.length - admins.length,
      newUsersThisWeek: newThisWeek.length,
      newUsersThisMonth: newThisMonth.length
    })
  }

  const toggleAdminStatus = async (userId, currentStatus) => {
    try {
      const newRole = currentStatus === 'admin' ? 'user' : 'admin'
      
      // Update public.user role (using your table name)
      const { error: publicError } = await supabase
        .from('user')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId) // Changed from 'id' to 'user_id'

      if (publicError) throw publicError

      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.user_id === userId 
            ? { ...user, role: newRole }
            : user
        )
      )
      
      // Recalculate stats
      const updatedUsers = users.map(user => 
        user.user_id === userId 
          ? { ...user, role: newRole }
          : user
      )
      calculateStats(updatedUsers)
      
    } catch (error) {
      console.error('Error updating user admin status:', error)
      setError(`Failed to update user status: ${error.message}`)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const debugInfo = async () => {
    console.log('=== DEBUG INFO ===')
    console.log('Current user from context:', currentUser)
    console.log('Current user role:', currentUserRole)
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
    console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)
    
    // Test direct query
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .limit(5)
    
    console.log('Direct query result:', data)
    console.log('Direct query error:', error)
  }

  const StatCard = ({ title, value, icon, color = '#3498db' }) => (
    <div className="stat-card" style={{
      background: 'white',
      borderRadius: '8px',
      padding: '1.5rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: `3px solid ${color}`,
      textAlign: 'center',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color, marginBottom: '0.5rem' }}>
        {value}
      </div>
      <div style={{ color: '#666', fontSize: '0.9rem' }}>{title}</div>
    </div>
  )

  // Show error state
  if (error) {
    return (
      <div className="admin-dashboard" style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        margin: 0
      }}>
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '500px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>Error Loading Dashboard</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>{error}</p>
          <button
            onClick={fetchUsers}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              marginRight: '1rem'
            }}
          >
            Retry
          </button>
          <button
            onClick={debugInfo}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f39c12',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              marginRight: '1rem'
            }}
          >
            Debug Info
          </button>
          <button
            onClick={handleSignOut}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard" style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      width: '100%',
      margin: 0
    }}>
      <style jsx>{`
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .user-row:hover {
          background-color: #f1f3f4 !important;
        }
        
        .action-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
          }
          
          .table-container {
            font-size: 0.85rem;
          }
        }
      `}</style>

      {/* Header */}
      <div className="dashboard-header center-content" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto 2rem auto'
      }}>
        <div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '2.5rem' }}>
            Admin Dashboard
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.5rem 0 0 0' }}>
            Welcome back, {currentUser?.email} ({currentUserRole})
          </p>
        </div>
        <div>
          <button
            onClick={debugInfo}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f39c12',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              marginRight: '1rem'
            }}
          >
            Debug
          </button>
          <button
            onClick={handleSignOut}
            className="action-button"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container center-content" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '300px',
          color: 'white',
          flexDirection: 'column',
          gap: '1rem',
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div style={{
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Loading dashboard data...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="stats-container">
            <div className="stats-grid full-width" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
              width: '100%',
              maxWidth: '1400px',
              margin: '0 auto 2rem auto'
            }}>
              <StatCard 
                title="Total Users" 
                value={stats.totalUsers}
                icon="👥"
                color="#3498db"
              />
              <StatCard 
                title="Administrators" 
                value={stats.adminsCount}
                icon="👑"
                color="#9b59b6"
              />
              <StatCard 
                title="Regular Users" 
                value={stats.regularUsersCount}
                icon="👤"
                color="#2ecc71"
              />
              <StatCard 
                title="New This Week" 
                value={stats.newUsersThisWeek}
                icon="📈"
                color="#f39c12"
              />
              <StatCard 
                title="New This Month" 
                value={stats.newUsersThisMonth}
                icon="📊"
                color="#e67e22"
              />
            </div>
          </div>

          {/* User Management Table */}
          <div className="table-section center-content">
            <div className="table-wrapper" style={{
              background: 'white',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              width: '100%',
              maxWidth: '1400px',
              margin: '0 auto'
            }}>
              <h2 style={{ marginTop: 0, color: '#2c3e50', marginBottom: '1.5rem' }}>
                User Management ({users.length} users)
              </h2>
              
              <div className="table-container full-width" style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ 
                      background: '#f8f9fa',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left',
                        fontWeight: 'bold',
                        color: '#495057'
                      }}>Email</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left',
                        fontWeight: 'bold',
                        color: '#495057'
                      }}>Name</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left',
                        fontWeight: 'bold',
                        color: '#495057'
                      }}>Created</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left',
                        fontWeight: 'bold',
                        color: '#495057'
                      }}>Status</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left',
                        fontWeight: 'bold',
                        color: '#495057'
                      }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => {
                      const isAdmin = user.role === 'admin'
                      const isCurrentUser = user.user_id === currentUser?.id
                      
                      return (
                        <tr key={user.user_id} className="user-row" style={{ 
                          borderBottom: '1px solid #dee2e6',
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                          transition: 'background-color 0.2s ease'
                        }}>
                          <td style={{ padding: '1rem', fontWeight: '500' }}>
                            {user.email || 'No email'}
                            {isCurrentUser && (
                              <span style={{ 
                                marginLeft: '0.5rem',
                                padding: '0.25rem 0.5rem',
                                background: '#17a2b8',
                                color: 'white',
                                borderRadius: '12px',
                                fontSize: '0.75rem'
                              }}>
                                You
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', color: '#6c757d' }}>
                            {user.fname && user.lname ? `${user.fname} ${user.lname}` : 'No name'}
                          </td>
                          <td style={{ padding: '1rem', color: '#6c757d' }}>
                            {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'Unknown'}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '20px',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              background: isAdmin ? '#d4edda' : '#f8d7da',
                              color: isAdmin ? '#155724' : '#721c24',
                              border: `1px solid ${isAdmin ? '#c3e6cb' : '#f5c6cb'}`
                            }}>
                              {isAdmin ? '👑 Admin' : '👤 User'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <button
                              onClick={() => toggleAdminStatus(user.user_id, user.role)}
                              disabled={isCurrentUser}
                              className="action-button"
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: isCurrentUser 
                                  ? '#6c757d' 
                                  : (isAdmin ? '#dc3545' : '#28a745'),
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isCurrentUser ? 'not-allowed' : 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                opacity: isCurrentUser ? 0.6 : 1,
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {isCurrentUser 
                                ? 'Cannot modify self'
                                : (isAdmin ? 'Remove Admin' : 'Make Admin')
                              }
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              {users.length === 0 && !loading && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem',
                  color: '#6c757d'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                  <h3>No users found</h3>
                  <p>This usually means RLS policies are blocking access or no users exist.</p>
                  <button
                    onClick={debugInfo}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#f39c12',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      marginTop: '1rem'
                    }}
                  >
                    Run Debug
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminDashboard