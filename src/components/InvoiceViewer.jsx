import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../supabase";
import "../styles/Invoice.css";

// ==== CONSTANTS ====
const SCRIPT_URLS = {
  HTML2CANVAS:
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  JSPDF: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
};

const PDF_CONFIG = {
  orientation: "portrait",
  unit: "px",
  format: [595, 842], // A4 size in px (or use 'a4' if using 'mm' unit)
  imgWidth: 595,
  pageHeight: 842,
};

// Valid status values that allow PDF generation
const APPROVED_STATUSES = ["approved", "completed"];

// ==== UTILITY FUNCTIONS ====
const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// ==== DATABASE SERVICE ====
class BirthCertificateService {
  static async getUserData(authUserId) {
    console.log("Fetching user data for auth ID:", authUserId);

    const { data, error } = await supabase
      .from("user")
      .select("*")
      .eq("user_id", authUserId)
      .single();

    if (error) {
      console.error("User query error:", error);

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

        if (allData.length > 1) {
          console.warn(
            `Multiple users found for auth_user_id: ${authUserId}. Using the first one.`
          );
        }

        return allData[0];
      }

      throw new Error(`Failed to fetch user data: ${error.message}`);
    }

    if (!data) {
      throw new Error("User not found in database");
    }

    return data;
  }

  static async getSpecificRequestData(authUserId, requestId) {
    console.log("Fetching specific request data for request ID:", requestId);

    try {
      // First, get user data to verify ownership
      const userData = await this.getUserData(authUserId);

      // Get the specific requester data
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
        .eq("req_id", requestId)
        .eq("user_id", userData.user_id) // Ensure the request belongs to this user
        .single();

      if (requesterError) {
        console.error("Specific requester query error:", requesterError);
        throw new Error(
          `Failed to fetch specific request: ${requesterError.message}`
        );
      }

      if (!requesterData) {
        throw new Error("Request not found or access denied");
      }

      // Get status data
      let statusData = null;
      if (requesterData.status_id) {
        const { data: status, error: statusError } = await supabase
          .from("status")
          .select("*")
          .eq("status_id", requesterData.status_id)
          .single();

        if (!statusError && status) {
          statusData = status;
        }
      }

      // Check if request is approved/completed
      const statusCurrent = statusData?.status_current?.toLowerCase();
      if (!statusCurrent || !APPROVED_STATUSES.includes(statusCurrent)) {
        console.log("Request status not approved/completed:", statusCurrent);
        throw new Error("This request is not approved or completed yet");
      }

      // Get birth certificate data
      let birthCertData = null;
      if (requesterData.bc_number) {
        const { data: bcData } = await supabase
          .from("birthcertificate")
          .select("bc_number, bc_issue_date, req_id")
          .eq("bc_number", requesterData.bc_number)
          .single();

        if (bcData) {
          birthCertData = bcData;
        }
      }

      if (!birthCertData && requesterData.req_id) {
        const { data: bcData } = await supabase
          .from("birthcertificate")
          .select("bc_number, bc_issue_date, req_id")
          .eq("req_id", requesterData.req_id)
          .single();

        if (bcData) {
          birthCertData = bcData;
        }
      }

      // Build the complete request object
      const completeRequest = {
        ...requesterData,
        status: statusData,
        birthcertificate: birthCertData,
      };

      return this.buildFormData(userData, completeRequest);
    } catch (error) {
      console.error("Error in getSpecificRequestData:", error);
      throw error;
    }
  }

  static async getLatestApprovedRequesterData(userId) {
    console.log(
      "Fetching latest approved/completed requester data for user ID:",
      userId
    );

    try {
      // First, get all requester data for the user
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
        console.error("Requester query error:", requesterError);
        throw new Error(
          `Failed to fetch requester data: ${requesterError.message}`
        );
      }

      if (!requesterData || requesterData.length === 0) {
        console.log("No requester data found for user:", userId);
        return null;
      }

      // Now get status data separately for each requester
      const requestersWithStatus = await Promise.all(
        requesterData.map(async (req) => {
          if (!req.status_id) {
            console.log(`No status_id for request ${req.req_id}`);
            return { ...req, status: null };
          }

          const { data: statusData, error: statusError } = await supabase
            .from("status")
            .select("*")
            .eq("status_id", req.status_id)
            .single();

          if (statusError) {
            console.error(
              `Error fetching status for request ${req.req_id}:`,
              statusError
            );
            return { ...req, status: null };
          }

          return { ...req, status: statusData };
        })
      );

      console.log(
        "Requesters with status:",
        requestersWithStatus.map((req) => ({
          req_id: req.req_id,
          status_id: req.status_id,
          status_current: req.status?.status_current,
        }))
      );

      // Filter for approved/completed requests
      const approvedRequests = requestersWithStatus.filter((req) => {
        const statusCurrent = req.status?.status_current?.toLowerCase();
        return statusCurrent && APPROVED_STATUSES.includes(statusCurrent);
      });

      if (approvedRequests.length === 0) {
        console.log(
          "No approved/completed requester data found for user:",
          userId
        );
        console.log(
          "Available statuses:",
          requestersWithStatus
            .map((req) => req.status?.status_current)
            .filter(Boolean)
        );
        return null;
      }

      // Get the latest approved/completed request
      const requester = approvedRequests[0];

      // Continue with birth certificate fetching...
      let birthCertData = null;

      if (requester.bc_number) {
        const { data: bcData, error: bcError } = await supabase
          .from("birthcertificate")
          .select("bc_number, bc_issue_date, req_id")
          .eq("bc_number", requester.bc_number)
          .single();

        if (!bcError && bcData) {
          birthCertData = bcData;
        }
      }

      if (!birthCertData && requester.req_id) {
        const { data: bcData, error: bcError } = await supabase
          .from("birthcertificate")
          .select("bc_number, bc_issue_date, req_id")
          .eq("req_id", requester.req_id)
          .single();

        if (!bcError && bcData) {
          birthCertData = bcData;
          if (!requester.bc_number) {
            requester.bc_number = bcData.bc_number;
          }
        }
      }

      if (birthCertData) {
        requester.birthcertificate = birthCertData;
      }

      return requester;
    } catch (error) {
      console.error("Error in getLatestApprovedRequesterData:", error);
      throw error;
    }
  }

  static async getFormData(authUserId, requestId = null) {
    try {
      if (requestId) {
        // Get specific request
        console.log("Getting specific request data for ID:", requestId);
        return await this.getSpecificRequestData(authUserId, requestId);
      } else {
        // Get latest approved request (existing logic)
        console.log("Getting latest approved request data");
        const userData = await this.getUserData(authUserId);
        const requesterData = await this.getLatestApprovedRequesterData(
          userData.user_id
        );

        if (!requesterData) {
          return null;
        }

        return this.buildFormData(userData, requesterData);
      }
    } catch (error) {
      console.error("Error in getFormData:", error);
      throw error;
    }
  }

  static buildFormData(userData, requesterData) {
    const { owner } = requesterData;
    const parent = owner?.parent; // Parent is nested under owner

    // Birth certificate data could be in different places depending on the join method used
    let birthCertData = null;

    // Check different possible locations for birth certificate data
    if (requesterData.birthcertificate) {
      // Direct join from requester
      birthCertData = requesterData.birthcertificate;
    } else if (owner?.birthcertificate) {
      // Nested under owner
      birthCertData = owner.birthcertificate;
    } else if (Array.isArray(owner?.birthcertificate)) {
      // If it's an array, take the first one
      birthCertData = owner.birthcertificate[0];
    }

    return {
      // Birth certificate info
      bcNumber: birthCertData?.bc_number || requesterData.bc_number || "",
      bcIssueDate: birthCertData?.bc_issue_date || null,

      // Request status and info (now using status.status_current)
      requestStatus: requesterData.status?.status_current || "unknown",
      requestDate: requesterData.req_date,
      requestId: requesterData.req_id, // Add request ID for reference

      // Owner information
      ownerLastName: owner?.owner_lname || "",
      ownerFirstName: owner?.owner_fname || "",
      ownerMiddleName: owner?.owner_mname || "",
      ownerDateOfBirth: owner?.owner_dob ? formatDate(owner.owner_dob) : "",
      placeOfBirth: owner?.place_of_birth || "",

      // Parent information (accessed through owner.parent)
      fatherLastName: parent?.owner_f_lname || "",
      fatherFirstName: parent?.owner_f_fname || "",
      fatherMiddleName: parent?.owner_f_mname || "",
      motherLastName: parent?.owner_m_lname || "",
      motherFirstName: parent?.owner_m_fname || "",
      motherMiddleName: parent?.owner_m_mname || "",

      // Requester information
      requesterFirstName: requesterData.req_fname || userData.fname || "",
      requesterLastName: requesterData.req_lname || userData.lname || "",
      requesterContact: requesterData.req_contact || userData.contact || "",
      requestPurpose: requesterData.req_purpose || "",
    };
  }
}

// ==== CUSTOM HOOKS ====
const useScriptLoader = () => {
  const [scriptsLoaded, setScriptsLoaded] = useState({
    html2canvas: false,
    jsPDF: false,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScripts = async () => {
      try {
        await Promise.all([
          loadScript(SCRIPT_URLS.HTML2CANVAS),
          loadScript(SCRIPT_URLS.JSPDF),
        ]);

        setScriptsLoaded({
          html2canvas: true,
          jsPDF: true,
        });
      } catch (error) {
        console.error("Error loading scripts:", error);
      } finally {
        setLoading(false);
      }
    };

    loadScripts();

    // Cleanup function
    return () => {
      const scripts = document.querySelectorAll(
        `script[src="${SCRIPT_URLS.HTML2CANVAS}"], script[src="${SCRIPT_URLS.JSPDF}"]`
      );
      scripts.forEach((script) => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      });
    };
  }, []);

  return { scriptsLoaded, loading };
};

const useFormData = (authUserId) => {
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const location = useLocation();

  const fetchData = useCallback(async () => {
    if (!authUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get request ID from URL parameters
      const urlParams = new URLSearchParams(location.search);
      const requestId = urlParams.get("reqId");

      console.log("URL Request ID:", requestId);

      // Pass request ID to service (if null, it will get the latest request)
      const data = await BirthCertificateService.getFormData(
        authUserId,
        requestId
      );

      if (data) {
        setFormData(data);
        setHasAccess(true);
      } else {
        setFormData(null);
        setHasAccess(false);
      }
    } catch (err) {
      console.error("Error fetching form data:", err);
      setError(err.message);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }, [authUserId, location.search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { formData, loading, error, hasAccess, refetch: fetchData };
};

// ==== PDF GENERATION HOOKS ====

const usePDFGenerator = (scriptsLoaded) => {
  const generatePDF = useCallback(async () => {
    if (!scriptsLoaded.html2canvas || !scriptsLoaded.jsPDF) {
      throw new Error("PDF libraries not loaded");
    }

    const element = document.querySelector(".form-content");
    if (!element) {
      throw new Error("Form content not found");
    }

    // Generate canvas
    const canvas = await window.html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: element.scrollWidth,
      height: element.scrollHeight,
    });

    // Create PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF(PDF_CONFIG);

    // Option 1: Single page - scale content to fit
    const imgWidth = PDF_CONFIG.imgWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // If you want everything on ONE page, scale it down to fit
    const maxHeight = PDF_CONFIG.pageHeight || 280; // Default A4 height minus margins

    if (imgHeight <= maxHeight) {
      // Content fits in one page
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        imgWidth,
        imgHeight
      );
    } else {
      // Scale down to fit one page
      const scaledHeight = maxHeight;
      const scaledWidth = (canvas.width * scaledHeight) / canvas.height;

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        scaledWidth,
        scaledHeight
      );
    }

    pdf.save("birth-certificate-form.pdf");
  }, [scriptsLoaded]);

  const generateImage = useCallback(async () => {
    if (!scriptsLoaded.html2canvas) {
      throw new Error("HTML2Canvas not loaded");
    }

    const element = document.querySelector(".form-content");
    if (!element) {
      throw new Error("Form content not found");
    }

    const canvas = await window.html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: element.scrollWidth,
      height: element.scrollHeight,
    });

    const link = document.createElement("a");
    link.download = "birth-certificate-form.png";
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [scriptsLoaded]);

  return { generatePDF, generateImage };
};

// ==== FORM FIELD COMPONENT ====
// Replace the existing FormField component with this:
const FormField = React.memo(({ label, value, style }) => (
  <div className="form-field">
    <label style={style}>{label}:</label>
    <div
      className="form-display-underline"
      style={{
        ...style,
        borderBottom: "2px solid #000", // Black underline
        padding: "8px 4px 4px 4px", // Reduced bottom padding
        backgroundColor: "transparent", // Remove background
        minHeight: "20px",
        border: "none", // Remove all other borders
        borderRadius: "0", // Remove border radius
      }}
    >
      {value || ""}
    </div>
  </div>
));

// ==== LOADING COMPONENT ====
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div
    className="form-container"
    style={{ padding: "2rem", textAlign: "center" }}
  >
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
      }}
    >
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  </div>
);

// ==== ERROR COMPONENT ====
const ErrorDisplay = ({ error, onRetry, onGoBack }) => (
  <div
    className="form-container"
    style={{ padding: "2rem", textAlign: "center" }}
  >
    <div style={{ color: "red", marginBottom: "1rem" }}>
      <h3>Error occurred</h3>
      <p>{error}</p>
    </div>
    <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
      <button
        onClick={onRetry}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#3498db",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Retry
      </button>
      <button
        onClick={onGoBack}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#6b7280",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Go Back
      </button>
    </div>
  </div>
);

// ==== NO ACCESS COMPONENT ====
const NoAccessDisplay = ({ onGoBack }) => (
  <div
    className="form-container"
    style={{ padding: "2rem", textAlign: "center" }}
  >
    <div
      style={{
        backgroundColor: "#fef2f2",
        border: "1px solid #fca5a5",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px",
        color: "#991b1b",
      }}
    >
      <h3 style={{ marginTop: 0, color: "#991b1b" }}>⚠️ Access Restricted</h3>
      <p style={{ marginBottom: 0 }}>
        You don't have any approved or completed birth certificate requests that
        allow access to this form. Your request must be approved or completed
        before you can view and download the certificate form.
      </p>
    </div>
    <button
      onClick={onGoBack}
      style={{
        padding: "0.75rem 1.5rem",
        backgroundColor: "#6b7280",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "16px",
      }}
    >
      Go Back
    </button>
  </div>
);

// ==== MAIN COMPONENT ====
const InvoiceViewer = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get request ID from URL
  const urlParams = new URLSearchParams(location.search);
  const requestId = urlParams.get("reqId");

  // Custom hooks
  const { scriptsLoaded } = useScriptLoader();
  const {
    formData,
    loading: formLoading,
    error: formError,
    hasAccess,
    refetch,
  } = useFormData(currentUser?.id);
  const { generatePDF, generateImage } = usePDFGenerator(scriptsLoaded);

  // Check if PDF generation is allowed - now always true if user has access
  const isPDFGenerationAllowed = useMemo(() => {
    return hasAccess && formData;
  }, [hasAccess, formData]);

  // Redirect if no user
  useEffect(() => {
    if (!currentUser?.id) {
      console.log("No authenticated user found, redirecting...");
      navigate("/login");
    }
  }, [currentUser, navigate]);

  // Event handlers
  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleDownloadPDF = useCallback(async () => {
    try {
      await generatePDF();
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try using the Print option instead.");
    }
  }, [generatePDF]);

  const handleDownloadImage = useCallback(async () => {
    try {
      await generateImage();
    } catch (error) {
      console.error("Error generating image:", error);
      alert(
        "Error generating image. Please try using the Print option and save as PDF instead."
      );
    }
  }, [generateImage]);

  // Memoized styles
  const blackTextStyle = useMemo(() => ({ color: "#000000" }), []);

  const allScriptsLoaded = scriptsLoaded.html2canvas && scriptsLoaded.jsPDF;

  // Early returns for various states
  if (!currentUser?.id) {
    return (
      <div
        className="form-container"
        style={{ padding: "2rem", textAlign: "center" }}
      >
        <p>Please log in to view this form.</p>
      </div>
    );
  }

  if (formLoading) {
    return <LoadingSpinner message="Loading form data..." />;
  }

  if (formError) {
    return (
      <ErrorDisplay
        error={formError}
        onRetry={refetch}
        onGoBack={handleGoBack}
      />
    );
  }

  if (!hasAccess) {
    return <NoAccessDisplay onGoBack={handleGoBack} />;
  }

  if (!formData) {
    return (
      <div
        className="form-container"
        style={{ padding: "2rem", textAlign: "center" }}
      >
        <p>No form data available.</p>
        <button
          onClick={handleGoBack}
          style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <>
      {/* CSS Styles */}
      <style>
        {`
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <div className="form-container">
        {/* Action Buttons */}
        <div className="no-print">
          <div
            className="back-button-container"
            style={{ marginBottom: "15px" }}
          >
            <button
              onClick={handleGoBack}
              className="back-button"
              style={{
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background-color 0.3s ease",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#4b5563")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#6b7280")}
            >
              ← Back to Previous
            </button>
          </div>

          {/* Request Status Display */}
          <div
            style={{
              backgroundColor: "#d1fae5",
              border: "1px solid #10b981",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "15px",
              color: "#065f46",
            }}
          >
            <strong>✅ Status:</strong> Your request has been{" "}
            {formData.requestStatus}. You can now download the certificate form.
          </div>

          <div className="button-group">
            <button
              onClick={handleDownloadPDF}
              className="action-button pdf-btn"
              disabled={!allScriptsLoaded}
              style={{
                opacity: !allScriptsLoaded ? 0.5 : 1,
                cursor: !allScriptsLoaded ? "not-allowed" : "pointer",
              }}
              title={
                !allScriptsLoaded
                  ? "Loading PDF generator..."
                  : "Download PDF file directly"
              }
            >
              📄 Download PDF {!allScriptsLoaded && "(Loading...)"}
            </button>
            <button
              onClick={handleDownloadImage}
              className="action-button image-btn"
              disabled={!scriptsLoaded.html2canvas}
              style={{
                opacity: !scriptsLoaded.html2canvas ? 0.5 : 1,
                cursor: !scriptsLoaded.html2canvas ? "not-allowed" : "pointer",
              }}
              title={
                !scriptsLoaded.html2canvas
                  ? "Loading image library..."
                  : "Download as PNG image"
              }
            >
              🖼️ Download Image {!scriptsLoaded.html2canvas && "(Loading...)"}
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="form-content" style={blackTextStyle}>
          {/* Header */}
          <div className="header">
            <div className="logo-left">
              <img
                src="/download.jpg"
                alt="PSA Logo"
                className="header-logo"
                style={{ width: "80px", height: "80px", objectFit: "contain" }}
              />
            </div>

            <div className="header-center">
              <h1 className="main-title" style={blackTextStyle}>
                Philippine Statistics Authority
              </h1>
              <h2 className="sub-title" style={blackTextStyle}>
                Birth Certify
              </h2>
              <h3 className="form-title" style={blackTextStyle}>
                Birth Certificate Payment Stub
              </h3>
            </div>

            <div className="logo-right">
              <img
                src="/colored-logo.png"
                alt="Right Logo"
                className="header-logo"
                style={{ width: "80px", height: "80px", objectFit: "contain" }}
              />
            </div>
          </div>

          {/* Important Notice */}
          <div className="important-notice">
            <div className="notice-header" style={blackTextStyle}>
              IMPORTANT: PLEASE READ BEFORE CLAIMING THE REQUESTED DOCUMENT
            </div>
            <div className="notice-content" style={blackTextStyle}>
              <p>1. A valid ID is required from the owner of the document.</p>
              <p>
                2. An authorization letter and ID of the document owner with the
                ID of the requester are required.
              </p>
              <p>
                3. Prepare Php 300.00 for the claiming of the owner's birth
                certificate.
              </p>
            </div>
          </div>

          {/* Birth Certificate Number */}
          <div className="form-section">
            <FormField
              label="Birth Certificate Number"
              value={formData.bcNumber}
              style={blackTextStyle}
            />
          </div>

          {/* Main Form Section */}
          <div className="main-form-section">
            {/* Owner's Personal Information */}
            <div className="form-group">
              <h3 className="section-title" style={blackTextStyle}>
                Owner's Personal Information
              </h3>
              <FormField
                label="Last name"
                value={formData.ownerLastName}
                style={blackTextStyle}
              />
              <FormField
                label="First name"
                value={formData.ownerFirstName}
                style={blackTextStyle}
              />
              <FormField
                label="Middle name"
                value={formData.ownerMiddleName}
                style={blackTextStyle}
              />
              <FormField
                label="Date of Birth"
                value={formData.ownerDateOfBirth}
                style={blackTextStyle}
              />
              <FormField
                label="Place of Birth"
                value={formData.placeOfBirth}
                style={blackTextStyle}
              />
            </div>

            {/* Parents Information */}
            <div className="parents-section">
              <div className="parent-group">
                <h4 className="parent-title" style={blackTextStyle}>
                  Name of Father
                </h4>
                <FormField
                  label="Last name"
                  value={formData.fatherLastName}
                  style={blackTextStyle}
                />
                <FormField
                  label="First name"
                  value={formData.fatherFirstName}
                  style={blackTextStyle}
                />
                <FormField
                  label="Middle name"
                  value={formData.fatherMiddleName}
                  style={blackTextStyle}
                />
              </div>

              <div className="parent-group">
                <h4 className="parent-title" style={blackTextStyle}>
                  Name of Mother
                </h4>
                <FormField
                  label="Last name"
                  value={formData.motherLastName}
                  style={blackTextStyle}
                />
                <FormField
                  label="First name"
                  value={formData.motherFirstName}
                  style={blackTextStyle}
                />
                <FormField
                  label="Middle name"
                  value={formData.motherMiddleName}
                  style={blackTextStyle}
                />
              </div>
            </div>

            {/* Requester's Information */}
            <div className="form-group">
              <h3 className="section-title" style={blackTextStyle}>
                Requester's Information
              </h3>
              <FormField
                label="First name"
                value={formData.requesterFirstName}
                style={blackTextStyle}
              />
              <FormField
                label="Last name"
                value={formData.requesterLastName}
                style={blackTextStyle}
              />
              <FormField
                label="Contact Number"
                value={formData.requesterContact}
                style={blackTextStyle}
              />
              <FormField
                label="Request Purpose"
                value={formData.requestPurpose}
                style={blackTextStyle}
              />
            </div>
          </div>

          {/* Bottom Notice */}
          <div className="bottom-notice">
            <div className="notice-title" style={blackTextStyle}>
              NOTICE
            </div>
            <div className="notice-text" style={blackTextStyle}>
              <p>
                The PSA and BirthCertify supports the policy of the State to
                protect the fundamental right of privacy. In view of the changes
                of Republic Act No. 10173 or the "Data Privacy Act of 2012",
                this office cannot issue documents from which the identity of an
                individual is apparent or can be reasonably and directly
                ascertained without the consent of the individual whose personal
                information is processed. Such consent must be evidenced by
                written, electronic or recorded means.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceViewer;
