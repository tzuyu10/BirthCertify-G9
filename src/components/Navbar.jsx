import React, { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as IoIcons from 'react-icons/io5';
import { SidebarData } from './Sidebardata';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebar, setSidebar] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Memoize user data to prevent unnecessary re-renders
  const userData = useMemo(() => ({
    initials: user?.user_metadata?.full_name?.split("")[0] || user?.fname?.[0] || user?.email?.[0]?.toUpperCase() || 'U',
    fullName: user?.user_metadata?.full_name || `${user?.fname || ''} ${user?.lname || ''}`.trim() || 'User Name',
    email: user?.email || 'email@example.com',
    userId: user?.id || 'USER-12345'
  }), [user]);

  // Optimized sign out with immediate UI feedback
  const handleSignOut = useCallback(async () => {
    if (isLoggingOut) return; // Prevent double clicks
    
    setIsLoggingOut(true);
    
    // Immediate UI feedback - close sidebar and navigate
    setSidebar(false);
    
    try {
      // Start navigation immediately for better UX
      navigate('/', { replace: true });
      
      // Sign out in background
      const { error } = await signOut();
      if (error) {
        console.error('Logout error:', error.message);
        // Could show a toast notification here if needed
      }
    } catch (error) {
      console.error('Logout failed:', error.message);
      // Could show error notification here
    } finally {
      setIsLoggingOut(false);
    }
  }, [signOut, navigate, isLoggingOut]);

  // Optimized sidebar toggle
  const toggleSidebar = useCallback((isOpen) => {
    setSidebar(isOpen);
  }, []);

  // Memoize sidebar close handler
  const closeSidebar = useCallback(() => {
    setSidebar(false);
  }, []);

  return (
    <>
      <div className="navbar-container">
        <Link to="#" className="menubars" onClick={() => toggleSidebar(true)}>
          <IoIcons.IoMenuOutline className="menuIcon" />
        </Link>
        <Link to="/about" className="logoNav">
          <img src="/Asset 1.svg" alt="logo" className="logoImg" />
          <h1 className="logoMark">BirthCertify</h1>
        </Link>
      </div>

      <div className={sidebar ? 'nav-menu active' : 'nav-menu'}>
        <ul className="navmenu-items">
          <li className="navbar-toggle">
            <Link to="#" onClick={closeSidebar}>
              <IoIcons.IoCloseOutline className="closeIcon" />
            </Link>
          </li>

          <div className="profile-section">
            <div className="profile-circle">{userData.initials}</div>
            <h3>{userData.fullName}</h3>
            <p className="email">{userData.email}</p>
            <p className="user-id">User ID: {userData.userId}</p>
          </div>

          {SidebarData.map((item, index) => (
            <li key={index} className={item.cName}>
              <Link to={item.path} onClick={closeSidebar}>
                {item.icon}
                <span>{item.title}</span>
              </Link>
            </li>
          ))}

          <li className="logout">
            <button 
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className={isLoggingOut ? 'logging-out' : ''}
            >
              {isLoggingOut ? (
                <IoIcons.IoRefreshOutline className="spinning" />
              ) : (
                <IoIcons.IoLogOutOutline />
              )}
              <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          </li>
        </ul>
      </div>
    </>
  );
};

export default Navbar;