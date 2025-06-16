import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../supabase";
import * as IoIcons from "react-icons/io";

// Valid status values that allow PDF generation
const APPROVED_STATUSES = ["approved", "completed"];

// Service to get all approved/completed requests
class MultipleRequestsService {
  static async getUserData(authUserId) {
    const { data, error } = await supabase
      .from("user")
      .select("*")
      .eq("user_id", authUserId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        const { data: allData, error: fallbackError } = await supabase
          .from("user")
          .select("*")
          .eq("user_id", authUserId);

        if (fallbackError) {
          throw new Error(
            `Failed to fetch user data: ${fallbackError.message}`
          );
        }

        if (!allData || allData.length === 0) {
          throw new Error("User not found in database");
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
        .from("requester")
        .select(
          `
          *,
          owner!requester_owner_id_fkey(
            *,
            parent(*),
            address(*)
          )
        `
        )
        .eq("user_id", userId)
        .order("req_date", { ascending: false });

      if (requesterError) {
        throw new Error(
          `Failed to fetch requester data: ${requesterError.message}`
        );
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
            .from("status")
            .select("*")
            .eq("status_id", req.status_id)
            .single();

          if (statusError) {
            return { ...req, status: null };
          }

          return { ...req, status: statusData };
        })
      );

      // Filter for approved/completed requests
      const approvedRequests = requestersWithStatus.filter((req) => {
        const statusCurrent = req.status?.status_current?.toLowerCase();
        return statusCurrent && APPROVED_STATUSES.includes(statusCurrent);
      });

      // Get birth certificate data for each approved request
      const requestsWithBirthCerts = await Promise.all(
        approvedRequests.map(async (req) => {
          let birthCertData = null;

          if (req.bc_number) {
            const { data: bcData } = await supabase
              .from("birthcertificate")
              .select("bc_number, bc_issue_date, req_id")
              .eq("bc_number", req.bc_number)
              .single();

            if (bcData) {
              birthCertData = bcData;
            }
          }

          if (!birthCertData && req.req_id) {
            const { data: bcData } = await supabase
              .from("birthcertificate")
              .select("bc_number, bc_issue_date, req_id")
              .eq("req_id", req.req_id)
              .single();

            if (bcData) {
              birthCertData = bcData;
            }
          }

          return {
            ...req,
            birthcertificate: birthCertData,
          };
        })
      );

      return requestsWithBirthCerts;
    } catch (error) {
      console.error("Error in getAllApprovedRequests:", error);
      throw error;
    }
  }

  static async getAllApprovedRequestsForUser(authUserId) {
    try {
      const userData = await this.getUserData(authUserId);
      const approvedRequests = await this.getAllApprovedRequests(
        userData.user_id
      );
      return approvedRequests;
    } catch (error) {
      console.error("Error in getAllApprovedRequestsForUser:", error);
      throw error;
    }
  }
}

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
        const approvedRequests =
          await MultipleRequestsService.getAllApprovedRequestsForUser(
            currentUser.id
          );
        setRequests(approvedRequests);
      } catch (err) {
        console.error("Error fetching requests:", err);
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

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || "";
    const isCompleted = statusLower === "completed";

    return (
      <span
        style={{
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: "bold",
          backgroundColor: isCompleted ? "#dcfce7" : "#dbeafe",
          color: isCompleted ? "#166534" : "#1d4ed8",
        }}
      >
        {status?.toUpperCase() || "UNKNOWN"}
      </span>
    );
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
    <div style={{ padding: "20px" }}>
      <h3 style={{ marginBottom: "20px", color: "#1f2937" }}>
        Birth Certificate Request History ({requests.length})
      </h3>

      {/* Scrollable Table Container */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          backgroundColor: "#ffffff",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          maxHeight: "500px",
          overflow: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead
            style={{
              backgroundColor: "#f9fafb",
              position: "sticky",
              top: "0",
              zIndex: "10",
            }}
          >
            <tr>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontWeight: "600",
                  color: "#374151",
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#f9fafb",
                }}
              >
                Owner Name
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontWeight: "600",
                  color: "#374151",
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#f9fafb",
                }}
              >
                BC Number
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontWeight: "600",
                  color: "#374151",
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#f9fafb",
                }}
              >
                Request Date
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontWeight: "600",
                  color: "#374151",
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#f9fafb",
                }}
              >
                Issue Date
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontWeight: "600",
                  color: "#374151",
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#f9fafb",
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "center",
                  fontWeight: "600",
                  color: "#374151",
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#f9fafb",
                }}
              >
                Action
              </th>
            </tr>
          </thead>

          <tbody style={{ display: "table-row-group" }}>
            {requests.map((request, index) => {
              const ownerName = `${request.owner?.owner_fname || ""} ${
                request.owner?.owner_lname || ""
              }`.trim();
              const bcNumber =
                request.birthcertificate?.bc_number ||
                request.bc_number ||
                "N/A";
              const requestDate = formatDate(request.req_date);
              const issueDate = formatDate(
                request.birthcertificate?.bc_issue_date
              );
              const status = request.status?.status_current || "Unknown";

              return (
                <tr
                  key={request.req_id}
                  style={{
                    transition: "background-color 0.2s ease",
                    borderBottom:
                      index < requests.length - 1
                        ? "1px solid #f3f4f6"
                        : "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "#374151",
                      fontWeight: "500",
                    }}
                  >
                    {ownerName || "N/A"}
                  </td>

                  <td
                    style={{
                      padding: "12px 16px",
                      color: "#374151",
                      fontFamily: "monospace",
                      fontSize: "13px",
                    }}
                  >
                    {bcNumber}
                  </td>

                  <td
                    style={{
                      padding: "12px 16px",
                      color: "#374151",
                    }}
                  >
                    {requestDate}
                  </td>

                  <td
                    style={{
                      padding: "12px 16px",
                      color: "#374151",
                    }}
                  >
                    {issueDate}
                  </td>

                  <td
                    style={{
                      padding: "12px 16px",
                      color: "#374151",
                    }}
                  >
                    {getStatusBadge(status)}
                  </td>

                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                    }}
                  >
                    <button
                      onClick={() => handleDownloadClick(request.req_id)}
                      style={{
                        backgroundColor: "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: "500",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        transition: "background-color 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#1d4ed8";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "#2563eb";
                      }}
                    >
                      <IoIcons.IoIosDownload size={14} />
                      Download
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div
        style={{
          marginTop: "16px",
          padding: "12px 16px",
          backgroundColor: "#f9fafb",
          borderRadius: "4px",
          fontSize: "14px",
          color: "#6b7280",
        }}
      >
        Showing {requests.length} approved/completed request
        {requests.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
};

export default MultipleDownloadBox;
