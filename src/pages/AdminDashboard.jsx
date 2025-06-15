import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../supabase";
import DashboardOverview from "../components/DashboardOverview";
import ManageRequests from "../pages/ManageRequests";
import StatCard from "../components/StatCard";
import "../styles/AdminDashboard.css";

function AdminDashboard() {
  const { signOut, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState({
    totalRequests: 18,
    approvedRequests: 10,
    pendingRequests: 5,
    rejectedRequests: 3,
  });

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: profile, error: profileError } = await supabase
        .from("user")
        .select("role")
        .eq("user_id", currentUser?.id)
        .single();

      if (profileError) throw new Error(profileError.message);
      if (profile?.role !== "admin") throw new Error("Access denied");

      setCurrentUserRole(profile.role);

      const { data: usersData, error: usersError } = await supabase
        .from("user")
        .select("*")
        .order("creationdate", { ascending: false });

      if (usersError) throw new Error(usersError.message);
      setUsers(usersData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="admin-dashboard">
      <aside className="sidebar">
        <div className="profile">
          <div className="profile-icon">👤</div>
          <div className="email">
            {currentUser?.email || "procamail@gmail.com"}
          </div>
          <div className="role">Admin</div>
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
            <li className="nav-item signout-link" onClick={signOut}>
              <span className="nav-item-icon">🚪</span>
              Sign out
            </li>
          </ul>
        </nav>
      </aside>

      <main className="dashboard-main">
        {activeTab === "dashboard" && <DashboardOverview stats={stats} />}

        {activeTab === "requests" && (
          <ManageRequests users={users} stats={stats} />
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
