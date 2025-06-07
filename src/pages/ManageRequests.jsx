import React, { useState } from "react";

import "../styles/ManageRequests.css";
function ManageRequests({ users }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 7;

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

  const handlePrev = () =>
    currentPage > 1 && setCurrentPage((prev) => prev - 1);
  const handleNext = () =>
    currentPage < totalPages && setCurrentPage((prev) => prev + 1);

  return (
    <div className="manage-request-container">
      <h1 className="page-title">MANAGE REQUEST</h1>

      <div className="search-container">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="table-container">
        <table className="request-table">
          <thead>
            <tr>
              <th>UserID</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>creation_date</th>
              <th>time_updated</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.map((user, index) => (
              <tr key={user.user_id}>
                <td>{user.user_id || startIndex + index + 1}</td>
                <td>{user.fname}</td>
                <td>{user.lname}</td>
                <td>{user.email}</td>
                <td>{user.creation_date || "2024-01-01"}</td>
                <td>{user.time_updated || "2024-01-01"}</td>
                <td>
                  <span
                    className={`status-badge ${
                      index % 3 === 0
                        ? "completed"
                        : index % 3 === 1
                        ? "pending"
                        : "canceled"
                    }`}
                  >
                    {index % 3 === 0
                      ? "Completed"
                      : index % 3 === 1
                      ? "Pending"
                      : "Canceled"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination-container">
          <button
            className="pagination-btn prev-btn"
            onClick={handlePrev}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn next-btn"
            onClick={handleNext}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManageRequests;
