import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import StatsCards from "../components/DashboardStatCard";
import NotificationBox from "../components/Notifications";
import DownloadBox from "../components/DownloadBox";
import PastRequests from "../components/PastRequests";
import "../styles/Dashboard.css";
import * as IoIcons from 'react-icons/io';

const Dashboard = () => {
  const [stats, setStats] = useState({ pending: 0, completed: 1, rejected: 0 });
  const [notifications, setNotifications] = useState([]);
  const [pastRequests, setPastRequests] = useState([]);
  const [downloadFile, setDownloadFile] = useState("");

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  useEffect(() => {
    // Replace your backend data fetching
    setStats({ pending: 0, completed: 1, rejected: 0 });
    setNotifications([
      "Request ID #0001 completed",
      "Request ID #0001 is now pending",
      "Request ID #0001 is submitted",
      "Incomplete draft saved",
    ]);
    setPastRequests([{ id: "0001", status: "Completed" }]);
    setDownloadFile("Payment Voucher - Request #0001");
  }, []);

  const user = { name: "Test" }; // Temporary mock user

  return (
    
    <div className="main-div">
      <Navbar />
      <div className="main-container">
        <div className="header-container">
          <div className="greeting-section">
            <h1>Good day, {user?.name?.split(' ')[0] || "User"}!</h1>
            <p>Welcome to your Dashboard.</p>
          </div>
        </div>

        <StatsCards stats={stats} />

        <div className="dashboard-body">
          <div className="left-column">
            <PastRequests requests={pastRequests} />
          </div>
          <div className="right-column">
            <button className="btn-primary"><IoIcons.IoMdAdd/> Create New Request</button>
            <button className="btn-secondary"><IoIcons.IoIosArchive/> My Past Requests</button>
            <button className="btn-secondary"><IoIcons.IoMdCreate/> My Drafts</button>

            <NotificationBox notifications={notifications} />
            <DownloadBox fileName={downloadFile} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;



