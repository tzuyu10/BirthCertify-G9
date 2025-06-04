import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useUserRole } from "../hooks/useUserRole";
import "../styles/Dashboard.css";
import Navbar from "./Navbar";

const Dashboard = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Error signing out:", error.message);
    }
  };

  return (
    <div className="main-div">
      <Navbar />
      <h2>Welcome to your Dashboard!</h2>
      <p>Email: {user?.email}</p>
      <p>User ID: {user?.id}</p>
    </div>
  );
};

export default Dashboard;
