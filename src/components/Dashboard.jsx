import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import '../styles/Dashboard.css'

const Dashboard = () => {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error.message)
    }
  }

  return (
    <div className = "main-div">
      <h2>Welcome to your Dashboard!</h2>
      <p>Email: {user?.email}</p>
      <p>User ID: {user?.id}</p>
      <button className = "sign-out-btn" onClick={handleSignOut}>
        Sign Out
      </button>
    </div>
  )
}

export default Dashboard