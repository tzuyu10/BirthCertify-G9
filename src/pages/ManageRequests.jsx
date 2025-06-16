import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import "../styles/ManageRequests.css";

function ManageRequests() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDetails, setRequestDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const requestsPerPage = 7;

  // Fetch all requests with user data and current status
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching all requests for admin...');

      // Get all non-draft requests with user information
      const { data: requestsData, error: requestsError } = await supabase
        .from('requester')
        .select(`
          *,
          user:user_id (
            fname,
            lname,
            email,
            contact
          )
        `)
        .eq('is_draft', false)
        .order('req_date', { ascending: false });

      if (requestsError) {
        throw new Error(`Failed to fetch requests: ${requestsError.message}`);
      }

      // Get the current status for each request
      const requestsWithStatus = await Promise.all(
        (requestsData || []).map(async (request) => {
          const { data: statusData, error: statusError } = await supabase
            .from('status')
            .select('*')
            .eq('req_id', request.req_id)
            .order('status_update_date', { ascending: false })
            .limit(1);

          if (statusError) {
            console.warn(`⚠️ Error getting status for request ${request.req_id}:`, statusError);
          }

          return {
            ...request,
            currentStatus: statusData?.[0]?.status_current || 'pending',
            statusId: statusData?.[0]?.status_id || null,
            statusUpdateDate: statusData?.[0]?.status_update_date || null
          };
        })
      );

      console.log('📋 Fetched requests with status:', requestsWithStatus);
      setRequests(requestsWithStatus);

    } catch (err) {
      console.error('❌ Error fetching requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update request status
  const updateRequestStatus = async (reqId, newStatus) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [reqId]: true }));
      console.log(`🔄 Updating request ${reqId} status to ${newStatus}`);

      // Find the current request to get its status ID
      const currentRequest = requests.find(req => req.req_id === reqId);
      
      if (currentRequest?.statusId) {
        // Update existing status record
        const { error: updateError } = await supabase
          .from('status')
          .update({
            status_current: newStatus,
            status_update_date: new Date().toISOString()
          })
          .eq('status_id', currentRequest.statusId);

        if (updateError) {
          throw new Error(`Failed to update status: ${updateError.message}`);
        }
      } else {
        // Create new status record only if none exists
        const { error: insertError } = await supabase
          .from('status')
          .insert({
            req_id: reqId,
            status_current: newStatus,
            status_update_date: new Date().toISOString()
          });

        if (insertError) {
          throw new Error(`Failed to create status: ${insertError.message}`);
        }
      }

      // Update local state immediately for better UX
      setRequests(prev => 
        prev.map(request => 
          request.req_id === reqId 
            ? { 
                ...request, 
                currentStatus: newStatus,
                statusUpdateDate: new Date().toISOString()
              }
            : request
        )
      );

      console.log(`✅ Successfully updated request ${reqId} status to ${newStatus}`);

    } catch (err) {
      console.error('❌ Error updating status:', err);
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [reqId]: false }));
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchRequests();
  }, []);

  // Real-time subscription for status changes
  useEffect(() => {
    console.log('🔔 Setting up real-time subscription for request status changes');

    const statusSubscription = supabase
      .channel('admin-request-status-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'status' 
        },
        (payload) => {
          console.log('🔄 Status table changed:', payload);
          fetchRequests(); // Refresh data when status changes
        }
      )
      .subscribe((status) => {
        console.log('📡 Admin status subscription status:', status);
      });

    const requesterSubscription = supabase
      .channel('admin-request-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'requester'
        },
        (payload) => {
          console.log('🔄 Requester table changed:', payload);
          fetchRequests(); // Refresh data when new requests are added
        }
      )
      .subscribe((status) => {
        console.log('📡 Admin requester subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from real-time updates');
      statusSubscription.unsubscribe();
      requesterSubscription.unsubscribe();
    };
  }, []);

  // Filter requests based on search term
  const filteredRequests = requests.filter(
    (request) =>
      request.user?.fname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user?.lname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.req_id?.toString().includes(searchTerm) ||
      request.req_fname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.req_lname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);
  const startIndex = (currentPage - 1) * requestsPerPage;
  const currentRequests = filteredRequests.slice(
    startIndex,
    startIndex + requestsPerPage
  );

  const handlePrev = () =>
    currentPage > 1 && setCurrentPage((prev) => prev - 1);
  
  // Fetch detailed request information including all related tables
  const fetchRequestDetails = async (reqId) => {
    try {
      setDetailsLoading(true);
      console.log(`🔍 Fetching detailed info for request ${reqId}`);

      // Get main request data with user info
      const { data: requestData, error: requestError } = await supabase
        .from('requester')
        .select(`
          *,
          user:user_id (*)
        `)
        .eq('req_id', reqId)
        .single();

      if (requestError) {
        throw new Error(`Failed to fetch request details: ${requestError.message}`);
      }

      // Get current status
      const { data: statusData, error: statusError } = await supabase
        .from('status')
        .select('*')
        .eq('req_id', reqId)
        .order('status_update_date', { ascending: false })
        .limit(1);

      if (statusError) {
        console.warn(`⚠️ Error getting status: ${statusError}`);
      }

      // Get owner information
      const { data: ownerData, error: ownerError } = await supabase
        .from('owner')
        .select('*')
        .eq('owner_id', requestData.owner_id);

      if (ownerError) {
        console.warn(`⚠️ Error getting owner data: ${ownerError}`);
      }

      // Get address information
      const { data: addressData, error: addressError } = await supabase
        .from('address')
        .select('*')
        .eq('address_id', ownerData?.[0]?.address_id);

      if (addressError) {
        console.warn(`⚠️ Error getting address data: ${addressError}`);
      }

      // Get parent information
      const { data: parentData, error: parentError } = await supabase
        .from('parent')
        .select('*')
        .eq('parent_id', ownerData?.[0]?.parent_id);

      if (parentError) {
        console.warn(`⚠️ Error getting parent data: ${parentError}`);
      }

      // Get birth certificate information
      const { data: bcData, error: bcError } = await supabase
        .from('birthcertificate')
        .select('*')
        .eq('bc_number', requestData.bc_number);

      if (bcError) {
        console.warn(`⚠️ Error getting birth certificate data: ${bcError}`);
      }

      const details = {
        request: requestData,
        status: statusData?.[0] || null,
        owners: ownerData || [],
        addresses: addressData || [],
        parents: parentData || [],
        birthCertificate: bcData?.[0] || null
      };

      console.log('📋 Fetched request details:', details);
      setRequestDetails(details);
      setSelectedRequest(reqId);
      setShowModal(true);

    } catch (err) {
      console.error('❌ Error fetching request details:', err);
      alert(`Failed to fetch request details: ${err.message}`);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleNext = () =>
    currentPage < totalPages && setCurrentPage((prev) => prev + 1);

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setRequestDetails(null);
  };

  // Status badge styling
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'approved':
        return 'completed';
      case 'pending':
        return 'pending';
      case 'cancelled':
      case 'rejected':
        return 'canceled';
      default:
        return 'pending';
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Format datetime for display
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="manage-request-container">
        <div className="loading-container" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '400px',
          fontSize: '18px'
        }}>
          Loading requests...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="manage-request-container">
        <div className="error-container" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '400px',
          color: 'red'
        }}>
          <h3>Error loading requests</h3>
          <p>{error}</p>
          <button 
            onClick={fetchRequests}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-request-container">
      <h1 className="page-title">MANAGE REQUESTS</h1>

      <div className="search-container">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name, email, request ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="stats-summary" style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          Showing {currentRequests.length} of {filteredRequests.length} requests
        </div>
      </div>

      <div className="table-container">
        <table className="request-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Requester Name</th>
              <th>Email</th>
              <th>Contact</th>
              <th>Purpose</th>
              <th>Request Date</th>
              <th>Last Updated</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRequests.map((request) => (
              <tr key={request.req_id}>
                <td>
                  <button
                    onClick={() => fetchRequestDetails(request.req_id)}
                    disabled={detailsLoading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#007bff',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {request.req_id}
                  </button>
                </td>
                <td>
                  {`${request.req_fname || ''} ${request.req_lname || ''}`.trim() || 'N/A'}
                </td>
                <td>{request.user?.email || 'N/A'}</td>
                <td>{request.req_contact || request.user?.contact || 'N/A'}</td>
                <td 
                  title={request.req_purpose}
                  style={{ 
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '200px' // adjust as needed
                  }}
                >
                  {request.req_purpose ? 
                    (request.req_purpose.length > 30 ? 
                      request.req_purpose.substring(0, 30) + '...' : 
                      request.req_purpose) : 'N/A'}
                </td>
                <td>{formatDate(request.req_date)}</td>
                <td>{formatDateTime(request.statusUpdateDate)}</td>
                <td>
                  <span
                    className={`status-badge ${getStatusBadgeClass(request.currentStatus)}`}
                  >
                    {request.currentStatus || 'pending'}
                  </span>
                </td>
                <td>
                  <select
                    value={request.currentStatus || 'pending'}
                    onChange={(e) => updateRequestStatus(request.req_id, e.target.value)}
                    disabled={updatingStatus[request.req_id]}
                    className="status-select"
                    style={{
                      padding: '5px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      fontSize: '12px',
                      background: '#007bff',
                      cursor: updatingStatus[request.req_id] ? 'not-allowed' : 'pointer',
                      opacity: updatingStatus[request.req_id] ? 0.6 : 1
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {updatingStatus[request.req_id] && (
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                      Updating...
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {currentRequests.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#666',
            fontSize: '16px'
          }}>
            {searchTerm ? 'No requests found matching your search.' : 'No requests found.'}
          </div>
        )}

        <div className="pagination-container">
          <button
            className="pagination-btn prev-btn"
            onClick={handlePrev}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            className="pagination-btn next-btn"
            onClick={handleNext}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </button>
        </div>
      </div>

      {/* Request Details Modal */}
      {showModal && requestDetails && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            scrollbarWidth: 'none', 
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <div className="modal-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #f0f0f0',
              paddingBottom: '15px'
            }}>
              <h2>Request Details - ID: {selectedRequest}</h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#007bff',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {detailsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div>Loading request details...</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                  
                  {/* Request Information */}
                  <section>
                    <h3 style={{ color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
                      📋 Request Information
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '15px' }}>
                      <div><strong>Request ID:</strong> {requestDetails.request.req_id}</div>
                      <div><strong>Requester Name:</strong> {`${requestDetails.request.req_fname || ''} ${requestDetails.request.req_lname || ''}`.trim() || 'N/A'}</div>
                      <div><strong>Contact:</strong> {requestDetails.request.req_contact || 'N/A'}</div>
                      <div><strong>Purpose:</strong> {requestDetails.request.req_purpose || 'N/A'}</div>
                      <div><strong>Date:</strong> {formatDate(requestDetails.request.req_date)}</div>
                      <div><strong>Is Draft:</strong> {requestDetails.request.is_draft ? 'Yes' : 'No'}</div>
                      <div><strong>Birth Certificate Number:</strong> {requestDetails.request.bc_number || 'N/A'}</div>
                      <div><strong>Status:</strong> 
                        <span className={`status-badge ${getStatusBadgeClass(requestDetails.status?.status_current)} `} style={{ marginLeft: '8px' }}>
                          {requestDetails.status?.status_current || 'pending'}
                        </span>
                      </div>
                      {requestDetails.status?.status_update_date && (
                        <div><strong>Status Updated:</strong> {formatDateTime(requestDetails.status.status_update_date)}</div>
                      )}
                    </div>
                  </section>

                  {/* User Information */}
                  <section>
                    <h3 style={{ color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
                      👤 User Account Information
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '15px' }}>
                      <div><strong>User ID:</strong> {requestDetails.request.user?.user_id}</div>
                      <div><strong>First Name:</strong> {requestDetails.request.user?.fname || 'N/A'}</div>
                      <div><strong>Last Name:</strong> {requestDetails.request.user?.lname || 'N/A'}</div>
                      <div><strong>Email:</strong> {requestDetails.request.user?.email || 'N/A'}</div>
                      <div><strong>Contact:</strong> {requestDetails.request.user?.contact || 'N/A'}</div>
                      <div><strong>Role:</strong> {requestDetails.request.user?.role || 'N/A'}</div>
                      <div><strong>Account Created:</strong> {formatDateTime(requestDetails.request.user?.creationdate)}</div>
                    </div>
                  </section>

                  {/* Birth Certificate Information */}
                  {requestDetails.birthCertificate && (
                    <section>
                      <h3 style={{ color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
                        📜 Birth Certificate Information
                      </h3>
                      <div style={{ 
                        backgroundColor: '#f8f9fa', 
                        padding: '15px', 
                        borderRadius: '6px', 
                        marginTop: '10px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                          <div><strong>BC Number:</strong> {requestDetails.birthCertificate.bc_number}</div>
                          <div><strong>Issue Date:</strong> {formatDate(requestDetails.birthCertificate.bc_issue_date)}</div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Owner Information */}
                  <section>
                    <h3 style={{ color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
                      🏠 Owner Information
                    </h3>
                    {requestDetails.owners.length > 0 ? (
                      requestDetails.owners.map((owner, index) => (
                        <div key={owner.owner_id} style={{ 
                          backgroundColor: '#f8f9fa', 
                          padding: '15px', 
                          borderRadius: '6px', 
                          marginTop: '10px',
                          border: '1px solid #e9ecef'
                        }}>
                          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Owner #{index + 1}</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                            <div><strong>Owner ID:</strong> {owner.owner_id}</div>
                            <div><strong>First Name:</strong> {owner.owner_fname || 'N/A'}</div>
                            <div><strong>Last Name:</strong> {owner.owner_lname || 'N/A'}</div>
                            <div><strong>Middle Name:</strong> {owner.owner_mname || 'N/A'}</div>
                            <div><strong>Suffix:</strong> {owner.owner_suffix || 'N/A'}</div>
                            <div><strong>Sex:</strong> {owner.owner_sex || 'N/A'}</div>
                            <div><strong>Nationality:</strong> {owner.owner_nationality || 'N/A'}</div>
                            <div><strong>Date of Birth:</strong> {formatDate(owner.owner_dob)}</div>
                            <div><strong>Place of Birth:</strong> {owner.place_of_birth || 'N/A'}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#666', fontStyle: 'italic', marginTop: '10px' }}>No owner information available</div>
                    )}
                  </section>

                  {/* Address Information */}
                  <section>
                    <h3 style={{ color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
                      📍 Address Information
                    </h3>
                    {requestDetails.addresses.length > 0 ? (
                      requestDetails.addresses.map((address, index) => (
                        <div key={address.address_id} style={{ 
                          backgroundColor: '#f8f9fa', 
                          padding: '15px', 
                          borderRadius: '6px', 
                          marginTop: '10px',
                          border: '1px solid #e9ecef'
                        }}>
                          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Address #{index + 1}</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                            <div><strong>Address ID:</strong> {address.address_id}</div>
                            <div><strong>House Number:</strong> {address.owner_house_no || 'N/A'}</div>
                            <div><strong>Street:</strong> {address.owner_street || 'N/A'}</div>
                            <div><strong>City:</strong> {address.owner_city || 'N/A'}</div>
                            <div><strong>Barangay:</strong> {address.owner_barangay || 'N/A'}</div>
                            <div><strong>Province:</strong> {address.owner_province || 'N/A'}</div>
                            <div><strong>Country:</strong> {address.owner_country || 'N/A'}</div>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <strong>Complete Address:</strong> 
                              <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
                                {[
                                  address.owner_house_no,
                                  address.owner_street,
                                  address.owner_barangay,
                                  address.owner_city,
                                  address.owner_province,
                                  address.owner_country
                                ].filter(Boolean).join(', ') || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#666', fontStyle: 'italic', marginTop: '10px' }}>No address information available</div>
                    )}
                  </section>

                  {/* Parent Information */}
                  <section>
                    <h3 style={{ color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
                      👨‍👩‍👧‍👦 Parent Information
                    </h3>
                    {requestDetails.parents.length > 0 ? (
                      requestDetails.parents.map((parent, index) => (
                        <div key={parent.parent_id} style={{ 
                          backgroundColor: '#f8f9fa', 
                          padding: '15px', 
                          borderRadius: '6px', 
                          marginTop: '10px',
                          border: '1px solid #e9ecef'
                        }}>
                          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Parent #{index + 1}</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                            <div><strong>Parent ID:</strong> {parent.parent_id}</div>
                            <div><strong>Father's First Name:</strong> {parent.owner_f_fname || 'N/A'}</div>
                            <div><strong>Father's Last Name:</strong> {parent.owner_f_lname || 'N/A'}</div>
                            <div><strong>Father's Middle Name:</strong> {parent.owner_f_mname || 'N/A'}</div>
                            <div><strong>Mother's First Name:</strong> {parent.owner_m_fname || 'N/A'}</div>
                            <div><strong>Mother's Last Name:</strong> {parent.owner_m_lname || 'N/A'}</div>
                            <div><strong>Mother's Middle Name:</strong> {parent.owner_m_mname || 'N/A'}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#666', fontStyle: 'italic', marginTop: '10px' }}>No parent information available</div>
                    )}
                  </section>

                </div>
              )}
            </div>

            <div className="modal-footer" style={{
              marginTop: '30px',
              paddingTop: '20px',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ color: '#666', fontSize: '14px' }}>
                Request ID: {selectedRequest} | Last Updated: {requestDetails?.status?.status_update_date ? formatDateTime(requestDetails.status.status_update_date) : 'N/A'}
              </div>
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginLeft: '20px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageRequests;