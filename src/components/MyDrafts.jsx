import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequest } from "../contexts/RequestContext";
import { useOwner } from "../contexts/OwnerContext";
import { useAuth } from "../contexts/AuthContext";
import "../styles/Drafts.css";

const MyDrafts = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const {
    fetchFilteredRequests,
    deleteRequest,
    deleteDraftWithCascade,
    loading,
    error,
    getRequestWithOwnerDetails,
    setCurrentRequest,
  } = useRequest();
  const { setCurrentRequestId, clearDraft, loadExistingDraft } = useOwner();

  const [drafts, setDrafts] = useState([]);
  const [loadingAction, setLoadingAction] = useState(null);

  useEffect(() => {
    const fetchUserDrafts = async () => {
      if (!currentUser?.id) return;

      try {
        const draftRequests = await fetchFilteredRequests({
          userId: currentUser.id,
          isDraft: "true",
        });
        setDrafts(draftRequests || []);
      } catch (error) {
        console.error("Error fetching drafts:", error);
      }
    };

    fetchUserDrafts();
  }, [currentUser?.id, fetchFilteredRequests]);

  const handleBack = () => {
    navigate("/dashboard");
  };

  const handleContinueDraft = async (draftId) => {
    try {
      setLoadingAction(draftId);

      console.log("Loading draft with ID:", draftId);

      // Set the current request ID first - this will save to sessionStorage
      setCurrentRequestId(draftId);

      // Get the full draft details with owner info
      const draftDetails = await getRequestWithOwnerDetails(draftId);

      // Set the current request in RequestContext
      setCurrentRequest(draftDetails);

      // Load existing data into the form
      await loadExistingDraft(draftId);

      console.log("Draft loaded successfully, navigating to owner-info");

      // Navigate to owner info page to continue editing
      navigate("/owner");
    } catch (error) {
      console.error("Error loading draft:", error);
      alert("Failed to load draft. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteDraft = async (draftId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this draft? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setLoadingAction(draftId);

      // Use cascading delete if available, otherwise fall back to regular delete
      if (deleteDraftWithCascade) {
        await deleteDraftWithCascade(draftId);
      } else {
        await deleteRequest(draftId);
      }

      // Remove from local state
      setDrafts((prev) => prev.filter((draft) => draft.req_id !== draftId));

      // Clear session storage if this was the current draft
      const currentReqId = sessionStorage.getItem("currentRequestId");
      if (currentReqId === draftId.toString()) {
        sessionStorage.removeItem("currentRequestId");
      }

      alert("Draft and all associated data deleted successfully.");
    } catch (error) {
      console.error("Error deleting draft:", error);
      alert("Failed to delete draft. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStartNewRequest = () => {
    // Clear any existing draft data and session storage
    clearDraft();
    sessionStorage.removeItem("currentRequestId");

    // Navigate to new request page or owner info page
    navigate("/request");
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCompletionStatus = (draft) => {
    let progress = 10; // Base progress for having a draft
    let status = "Just started";
    let color = "#f44336";

    // Check if basic request info is complete
    if (
      draft.req_fname &&
      draft.req_lname &&
      draft.req_contact &&
      draft.req_purpose
    ) {
      progress += 30;
      status = "Basic info complete";
      color = "#ff9800";
    }

    // Check if owner info exists
    if (draft.owner_id) {
      progress += 40;
      status = "Owner info added";
      color = "#2196f3";
    }

    // Check if ready to submit (all required fields)
    if (
      draft.owner_id &&
      draft.req_fname &&
      draft.req_lname &&
      draft.req_contact &&
      draft.req_purpose
    ) {
      progress = 90;
      status = "Ready to submit";
      color = "#4caf50";
    }

    return { status, progress, color };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading your drafts...</div>
      </div>
    );
  }

  return (
    <div className="drafts-container">
      <div className="main-container">
        <div className="drafts-header">
          <div>
            <h1>My Drafts</h1>
            <p>Continue working on your saved certificate requests</p>
          </div>
          <div className="header-buttons">
            <button onClick={handleStartNewRequest} className="btn-new-request">
              + New Request
            </button>
            <button onClick={handleBack} className="btn-back">
              ← Back
            </button>
          </div>
        </div>

        {error && <div className="error-message">Error: {error}</div>}

        {drafts.length === 0 ? (
          <div className="no-drafts">
            <div className="no-drafts-icon">📝</div>
            <h3>No drafts available</h3>
            <p>You haven't started any certificate requests yet.</p>
            <button onClick={handleStartNewRequest} className="btn-start-first">
              Start Your First Request
            </button>
          </div>
        ) : (
          <div className="drafts-grid">
            {drafts.map((draft) => {
              const completion = getCompletionStatus(draft);
              const isLoading = loadingAction === draft.req_id;

              return (
                <div
                  key={draft.req_id}
                  className={`draft-card ${isLoading ? "loading" : ""}`}
                >
                  <div className="draft-info">
                    <h3 className="draft-title">
                      {draft.req_purpose || "Birth Certificate Request"}
                    </h3>
                    <p className="draft-subtitle">
                      For: {draft.req_fname} {draft.req_lname}
                    </p>
                  </div>

                  <div className="completion-section">
                    <div className="completion-header">
                      <span
                        className="completion-status"
                        style={{ color: completion.color }}
                      >
                        {completion.status}
                      </span>
                      <span className="completion-percentage">
                        {completion.progress}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${completion.progress}%`,
                          backgroundColor: completion.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="draft-buttons">
                    <button
                      onClick={() => handleContinueDraft(draft.req_id)}
                      disabled={isLoading}
                      className="btn-continue"
                    >
                      {isLoading ? "Loading..." : "Continue"}
                    </button>
                    <button
                      onClick={() => handleDeleteDraft(draft.req_id)}
                      disabled={isLoading}
                      className="btn-delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDrafts;
