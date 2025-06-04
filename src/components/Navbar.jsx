import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';
import { useAuth } from '../contexts/AuthContext'

const Navbar = () => {
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
    <header className="headerNav">
      <Link to="/" className="logoNav">
        <img src="/Asset 1.svg" alt="logo" className="logoImg" />
        BirthCertify
      </Link>
      <nav className="navLinks">
        <Link to="/">Home</Link>
        <Link to="/request">Request</Link>
        <Link to="/about">About</Link>
        <button className = "sign-out-btn" onClick={handleSignOut}>
          Sign Out
        </button>
      </nav>
    </header>
  );
};

export default Navbar;