import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../supabase";
import "../styles/AdminDashboard.css";

function AdminDashboard() {
  const { signOut, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalRequests: 18,
    approvedRequests: 10,
    pendingRequests: 5,
    canceledRequests: 3,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 6;

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: currentUserProfile, error: profileError } = await supabase
        .from("user")
        .select("role, fname, lname, contact")
        .eq("user_id", currentUser?.id)
        .single();

      if (profileError) throw new Error(profileError.message);
      setCurrentUserRole(currentUserProfile?.role);
      if (currentUserProfile?.role !== "admin")
        throw new Error("Access denied");

      const { data: usersData, error: usersError } = await supabase
        .from("user")
        .select("*")
        .order("creationdate", { ascending: false });

      if (usersError) throw new Error(usersError.message);
      setUsers(usersData || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value }) => (
    <div className="stat-box">
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
    </div>
  );

  const filteredUsers = users.filter(
    (user) =>
      user.fname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const currentUsers = filteredUsers.slice(
    startIndex,
    startIndex + usersPerPage
  );

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  return (
    <div className="admin-dashboard">
      <aside className="sidebar">
        <div className="profile">
          <div className="profile-icon">👤</div>
          <div className="email">pracemail@gmail.com</div>
          <div className="role">Admin</div>
        </div>
        <nav>
          <ul>
            <ul className="sidebar-nav">
              <li className="nav-item dashboard-link">📊 Dashboard</li>
              <li className="nav-item manage-users-link">👥 Manage Users</li>
              <li className="nav-item reports-link">📄 Reports</li>
              <li className="nav-item signout-link" onClick={signOut}>
                🚪 Sign out
              </li>
            </ul>
          </ul>
        </nav>
      </aside>

      <main className="dashboard-main">
        <h1>DASHBOARD</h1>

        <div className="dashboard-center-content">
          <div className="stats-row">
            <StatCard title="Total Request" value={stats.totalRequests} />
            <StatCard title="Approved Request" value={stats.approvedRequests} />
            <StatCard title="Pending Request" value={stats.pendingRequests} />
            <StatCard title="Canceled Request" value={stats.canceledRequests} />
          </div>

          <div className="search-bar">
            <input
              type="text"
              placeholder="Search for Transactions"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button className="search-button">🔍</button>
          </div>

          <div className="table-wrapper">
            <table className="dashboard-table compact">
              <thead>
                <tr>
                  <th>UserID</th>
                  <th>FirstName</th>
                  <th>LastName</th>
                  <th>Email</th>
                  <th>Request</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user, index) => (
                  <tr key={user.user_id}>
                    <td>{startIndex + index + 1}</td>
                    <td>{user.fname}</td>
                    <td>{user.lname}</td>
                    <td style={{ maxWidth: "160px", wordBreak: "break-word" }}>
                      {user.email}
                    </td>
                    <td>Birth Certificate</td>
                    <td>
                      <span
                        className={`status-badge ${
                          (index + startIndex) % 3 === 0
                            ? "completed"
                            : (index + startIndex) % 3 === 1
                            ? "pending"
                            : "canceled"
                        }`}
                      >
                        {(index + startIndex) % 3 === 0
                          ? "Completed"
                          : (index + startIndex) % 3 === 1
                          ? "Pending"
                          : "Canceled"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination inside-table">
              <button onClick={handlePrev} disabled={currentPage === 1}>
                Prev
              </button>
              <span>
                Page {String(currentPage).padStart(2, "0")} of{" "}
                {String(totalPages).padStart(2, "0")}
              </span>
              <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
