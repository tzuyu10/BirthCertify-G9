import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../supabase";
import * as IoIcons from "react-icons/io";

// Valid status values that allow PDF generation
const APPROVED_STATUSES = ['approved', 'completed'];

// Service to get all approved/completed requests
class MultipleRequestsService {
  static async getUserData(authUserId) {
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('user_id', authUserId)
      .single();
  
    if (error) {
      if (error.code === 'PGRST116') {
        const { data: allData, error: fallbackError } = await supabase
          .from('user')
          .select('*')
          .eq('user_id', authUserId);
        
        if (fallbackError) {
          throw new Error(`Failed to fetch user data: ${fallbackError.message}`);
        }
        
        if (!allData || allData.length === 0) {
          throw new Error('User not found in database');
        }
        
        return allData[0];
      }
      
      throw new Error(`Failed to fetch user data: ${error.message}`);
    }
  
    return data;
  }

  static async getAllApprovedRequests(userId) {
    try {
      // Get all requester data for the user
      const { data: requesterData, error: requesterError } = await supabase
        .from('requester')
        .select(`
          *,
          owner!requester_owner_id_fkey(
            *,
            parent(*),
            address(*)
          )
        `)
        .eq('user_id', userId)
        .order('req_date', { ascending: false });

      if (requesterError) {
        throw new Error(`Failed to fetch requester data: ${requesterError.message}`);
      }

      if (!requesterData || requesterData.length === 0) {
        return [];
      }

      // Get status data for each requester
      const requestersWithStatus = await Promise.all(
        requesterData.map(async (req) => {
          if (!req.status_id) {
            return { ...req, status: null };
          }

          const { data: statusData, error: statusError } = await supabase
            .from('status')
            .select('*')
            .eq('status_id', req.status_id)
            .single();

          if (statusError) {
            return { ...req, status: null };
          }

          return { ...req, status: statusData };
        })
      );

      // Filter for approved/completed requests
      const approvedRequests = requestersWithStatus.filter(req => {
        const statusCurrent = req.status?.status_current?.toLowerCase();
        return statusCurrent && APPROVED_STATUSES.includes(statusCurrent);
      });

      // Get birth certificate data for each approved request
      const requestsWithBirthCerts = await Promise.all(
        approvedRequests.map(async (req) => {
          let birthCertData = null;

          if (req.bc_number) {
            const { data: bcData } = await supabase
              .from('birthcertificate')
              .select('bc_number, bc_issue_date, req_id')
              .eq('bc_number', req.bc_number)
              .single();

            if (bcData) {
              birthCertData = bcData;
            }
          }

          if (!birthCertData && req.req_id) {
            const { data: bcData } = await supabase
              .from('birthcertificate')
              .select('bc_number, bc_issue_date, req_id')
              .eq('req_id', req.req_id)
              .single();

            if (bcData) {
              birthCertData = bcData;
            }
          }

          return {
            ...req,
            birthcertificate: birthCertData
          };
        })
      );

      return requestsWithBirthCerts;
    } catch (error) {
      console.error('Error in getAllApprovedRequests:', error);
      throw error;
    }
  }

  static async getAllApprovedRequestsForUser(authUserId) {
    try {
      const userData = await this.getUserData(authUserId);
      const approvedRequests = await this.getAllApprovedRequests(userData.user_id);
      return approvedRequests;
    } catch (error) {
      console.error('Error in getAllApprovedRequestsForUser:', error);
      throw error;
    }
  }
}

// Individual download box component
const SingleDownloadBox = ({ request, onDownloadClick }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const ownerName = `${request.owner?.owner_fname || ''} ${request.owner?.owner_lname || ''}`.trim();
  const bcNumber = request.birthcertificate?.bc_number || request.bc_number || 'N/A';
  const requestDate = formatDate(request.req_date);
  const status = request.status?.status_current || 'Unknown';

  return (
    <div
      className="download-box"
      onClick={() => onDownloadClick(request.req_id)}
      style={{
        cursor: "pointer",
        border: "2px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px",
        margin: "10px",
        backgroundColor: "#f9fafb",
        textAlign: "left",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = "#f3f4f6";
        e.target.style.borderColor = "#d1d5db";
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = "#f9fafb";
        e.target.style.borderColor = "#e5e7eb";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
        <IoIcons.IoIosDownload size={24} style={{ marginRight: "8px", color: "#2563eb" }} />
        <h4 style={{ margin: 0, color: "#1f2937" }}>Birth Certificate</h4>
      </div>
      
      <div style={{ marginBottom: "8px" }}>
        <strong>Owner:</strong> {ownerName || 'N/A'}
      </div>
      
      <div style={{ marginBottom: "8px" }}>
        <strong>BC Number:</strong> {bcNumber}
      </div>
      
      <div style={{ marginBottom: "8px" }}>
        <strong>Request Date:</strong> {requestDate}
      </div>
      
      <div style={{ marginBottom: "12px" }}>
        <span 
          style={{
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: "bold",
            backgroundColor: status.toLowerCase() === 'completed' ? '#dcfce7' : '#dbeafe',
            color: status.toLowerCase() === 'completed' ? '#166534' : '#1d4ed8'
          }}
        >
          {status.toUpperCase()}
        </span>
      </div>

      <div
        style={{
          color: "#2563eb",
          textDecoration: "underline",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "500"
        }}
      >
        Download Certificate →
      </div>
    </div>
  );
};

// Main component
const MultipleDownloadBox = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const approvedRequests = await MultipleRequestsService.getAllApprovedRequestsForUser(currentUser.id);
        setRequests(approvedRequests);
      } catch (err) {
        console.error('Error fetching requests:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [currentUser?.id]);

  const handleDownloadClick = (requestId) => {
    // Navigate to PDF generator with specific request ID
    navigate(`/pdf-generator?reqId=${requestId}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <div>Loading your approved requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "red" }}>
        <div>Error loading requests: {error}</div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <div>No approved or completed requests found.</div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginBottom: "20px", color: "#1f2937" }}>
        Your Approved Birth Certificate Requests ({requests.length})
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "10px" }}>
        {requests.map((request) => (
          <SingleDownloadBox
            key={request.req_id}
            request={request}
            onDownloadClick={handleDownloadClick}
          />
        ))}
      </div>
    </div>
  );
};

export default MultipleDownloadBox;