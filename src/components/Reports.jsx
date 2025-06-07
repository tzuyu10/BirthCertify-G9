import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import StatCard from "../components/StatCard";
import "../styles/Reports.css";

const Reports = ({ stats }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Mock data for reports - replace with actual data from your database
  const mockReports = [
    {
      id: "USR001",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@email.com",
      reportType: "Certificate Request",
      description: "Birth certificate application for legal purposes",
      reportDate: "2024-06-01",
      reportId: "RPT-2024-001",
      reason: "Document verification required",
      status: "COMPLETED",
    },
    {
      id: "USR002",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@email.com",
      reportType: "Security Clearance",
      description: "Background check for employment clearance",
      reportDate: "2024-06-02",
      reportId: "RPT-2024-002",
      reason: "Employment verification",
      status: "PENDING",
    },
    {
      id: "USR003",
      firstName: "Mike",
      lastName: "Johnson",
      email: "mike.johnson@email.com",
      reportType: "Identity Verification",
      description: "Identity verification for banking services",
      reportDate: "2024-06-03",
      reportId: "RPT-2024-003",
      reason: "Financial services requirement",
      status: "CANCELLED",
    },
    {
      id: "USR004",
      firstName: "Sarah",
      lastName: "Williams",
      email: "sarah.williams@email.com",
      reportType: "Document Request",
      description: "Marriage certificate for visa application",
      reportDate: "2024-06-04",
      reportId: "RPT-2024-004",
      reason: "Immigration documentation",
      status: "COMPLETED",
    },
    {
      id: "USR005",
      firstName: "David",
      lastName: "Brown",
      email: "david.brown@email.com",
      reportType: "Certificate Request",
      description: "Death certificate for insurance claim",
      reportDate: "2024-06-05",
      reportId: "RPT-2024-005",
      reason: "Insurance processing",
      status: "PENDING",
    },
  ];

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // For now, using mock data. Replace with actual Supabase query
      // const { data, error } = await supabase
      //   .from("reports")
      //   .select("*")
      //   .order("reportDate", { ascending: false });

      // if (error) throw error;
      // setReports(data || []);

      // Using mock data for demonstration
      setTimeout(() => {
        setReports(mockReports);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Filter reports based on search term
  const filteredReports = reports.filter(
    (report) =>
      report.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reportType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReports = filteredReports.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const getStatusBadge = (status) => {
    const statusClasses = {
      COMPLETED: "status-completed",
      PENDING: "status-pending",
      CANCELLED: "status-cancelled",
    };
    return (
      <span className={`status-badge ${statusClasses[status]}`}>{status}</span>
    );
  };

  if (loading) return <div className="loading">Loading reports...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>REPORTS</h1>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-box">
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

      {/* First Reports Table */}
      <div className="reports-table-container">
        <div className="table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>☑</th>
                <th>UserID</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Reports</th>
                <th>Description</th>
                <th>⋯</th>
              </tr>
            </thead>
            <tbody>
              {currentReports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <input type="checkbox" className="row-checkbox" />
                  </td>
                  <td>{report.id}</td>
                  <td>{report.firstName}</td>
                  <td>{report.lastName}</td>
                  <td>{report.email}</td>
                  <td>{report.reportType}</td>
                  <td>{report.description}</td>
                  <td>
                    <button className="options-btn">⋯</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <button
            className="pagination-btn prev-btn"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn next-btn"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {/* Second Search Bar */}
      <div className="search-container">
        <div className="search-box">
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

      {/* Second Reports Table */}
      <div className="reports-table-container">
        <div className="table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>☑</th>
                <th>UserID</th>
                <th>Description</th>
                <th>report_date</th>
                <th>report_id</th>
                <th>Reason</th>
                <th>⋯</th>
              </tr>
            </thead>
            <tbody>
              {currentReports.map((report) => (
                <tr key={`second-${report.id}`}>
                  <td>
                    <input type="checkbox" className="row-checkbox" />
                  </td>
                  <td>{report.id}</td>
                  <td>{report.description}</td>
                  <td>{report.reportDate}</td>
                  <td>{report.reportId}</td>
                  <td>{report.reason}</td>
                  <td>
                    <button className="options-btn">⋯</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <button
            className="pagination-btn prev-btn"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn next-btn"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;
