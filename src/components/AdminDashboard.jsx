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

  const StatCard = ({ title, value, icon, color = 'blue' }) => (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
    </div>
  )

  // Show error state
  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <div className="header-content">
            <h1 className="dashboard-title">Admin Dashboard</h1>
            <p className="dashboard-subtitle">Error occurred</p>
          </div>
          <div className="header-actions">
            <button onClick={handleSignOut} className="btn btn-secondary">
              Sign Out
            </button>
          </div>
        </div>
        
        <div className="dashboard-content">
          <div className="error-container">
            <div className="error-card">
              <div className="error-icon">⚠️</div>
              <h2 className="error-title">Error Loading Dashboard</h2>
              <p className="error-message">{error}</p>
              <div className="error-actions">
                <button onClick={fetchUsers} className="btn btn-primary">
                  Retry
                </button>
                <button onClick={debugInfo} className="btn btn-warning">
                  Debug Info
                </button>
                <button onClick={handleSignOut} className="btn btn-secondary">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome back, {currentUser?.email} ({currentUserRole})
          </p>
        </div>
        <div className="header-actions">
          <button onClick={debugInfo} className="btn btn-warning">
            Debug
          </button>
          <button onClick={handleSignOut} className="btn btn-danger">
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="dashboard-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading dashboard data...</p>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="stats-container">
              <div className="stats-grid">
                <StatCard 
                  title="Total Users" 
                  value={stats.totalUsers}
                  icon="👥"
                  color="blue"
                />
                <StatCard 
                  title="Administrators" 
                  value={stats.adminsCount}
                  icon="👑"
                  color="purple"
                />
                <StatCard 
                  title="Regular Users" 
                  value={stats.regularUsersCount}
                  icon="👤"
                  color="green"
                />
                <StatCard 
                  title="New This Week" 
                  value={stats.newUsersThisWeek}
                  icon="📈"
                  color="orange"
                />
                <StatCard 
                  title="New This Month" 
                  value={stats.newUsersThisMonth}
                  icon="📊"
                  color="red"
                />
              </div>
            </div>

            {/* User Management Table */}
            <div className="table-section">
              <div className="table-wrapper">
                <h2 className="table-title">
                  User Management ({users.length} users)
                </h2>
                
                <div className="table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Created</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, index) => {
                        const isAdmin = user.role === 'admin'
                        const isCurrentUser = user.user_id === currentUser?.id
                        
                        return (
                          <tr key={user.user_id} className={`user-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                            <td className="user-email">
                              {user.email || 'No email'}
                              {isCurrentUser && (
                                <span className="current-user-badge">You</span>
                              )}
                            </td>
                            <td className="user-name">
                              {user.fname && user.lname ? `${user.fname} ${user.lname}` : 'No name'}
                            </td>
                            <td className="user-created">
                              {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : 'Unknown'}
                            </td>
                            <td className="user-status">
                              <span className={`status-badge ${isAdmin ? 'admin' : 'user'}`}>
                                {isAdmin ? '👑 Admin' : '👤 User'}
                              </span>
                            </td>
                            <td className="user-actions">
                              <button
                                onClick={() => toggleAdminStatus(user.user_id, user.role)}
                                disabled={isCurrentUser}
                                className={`action-button ${isCurrentUser ? 'disabled' : (isAdmin ? 'remove' : 'make')}`}
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
                  <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <h3 className="empty-title">No users found</h3>
                    <p className="empty-message">This usually means RLS policies are blocking access or no users exist.</p>
                    <button onClick={debugInfo} className="btn btn-warning">
                      Run Debug
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard