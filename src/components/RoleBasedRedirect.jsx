import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '../hooks/useUserRole';

const RoleBasedRedirect = () => {
  const { user, userRole, loading, isAdmin } = useUserRole();
  const navigate = useNavigate();

  const redirectUser = () => {
    if (!user) {
      console.log('No user, redirect to login');
      navigate('/login', { replace: true });
      return;
    }

    if (!userRole) {
      console.log('User role missing, waiting...');
      // We don't navigate here, just wait for role
      return;
    }

    console.log('User role:', userRole);
    console.log('Is admin:', isAdmin());

    if (isAdmin()) {
      console.log('Redirecting to admin dashboard');
      navigate('/admin/dashboard', { replace: true });
    } else {
      console.log('Redirecting to user dashboard');
      navigate('/dashboard', { replace: true });
    }
  };

  useEffect(() => {
    if (!loading) {
      redirectUser();
    }
  }, [loading, user, userRole]); // Removed isAdmin from dependencies to prevent recreation

  if (loading || !userRole) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading user role...</div>
      </div>
    );
  }

  return null;
};

export default RoleBasedRedirect;