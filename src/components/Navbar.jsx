import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as IoIcons from 'react-icons/io5';
import { SidebarData } from './Sidebardata';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebar, setSidebar] = useState(false);
  const initials = user?.user_metadata?.full_name?.split("")[0] || 'U';

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error.message);
    }
  };

  return (
    <>
      <div className="navbar-container">
        <Link to="#" className="menubars" onClick={() => setSidebar(true)}>
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
            <Link to="#" onClick={() => setSidebar(false)}>
              <IoIcons.IoCloseOutline className="closeIcon" />
            </Link>
          </li>

          <div className="profile-section">
            <div className="profile-circle">{initials}</div>
            <h3>{user?.user_metadata?.full_name || 'User Name'}</h3>
            <p className="email">{user?.email || 'email@example.com'}</p>
            <p className="user-id">User ID: {user?.id || 'USER-12345'}</p>
          </div>

          {SidebarData.map((item, index) => (
            <li key={index} className={item.cName}>
              <Link to={item.path} onClick={() => setSidebar(false)}>
                {item.icon}
                <span>{item.title}</span>
              </Link>
            </li>
          ))}

          <li className="logout">
            <button onClick={handleSignOut}>
              <IoIcons.IoLogOutOutline />
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </div>
    </>
  );
};

export default Navbar;