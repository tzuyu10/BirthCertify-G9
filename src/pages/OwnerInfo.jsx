import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOwner } from '../contexts/OwnerContext';
import '../styles/OwnerInfo.css';

function OwnerPage() {
  const { formData, handleChange, handleOwnerSubmission, clearDraft, currentRequestId } = useOwner();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Get today's date for max date validation
  const today = new Date().toISOString().split('T')[0];
  // Minimum date (100 years ago)
  const minDate = new Date(new Date().getFullYear() - 100, 0, 1).toISOString().split('T')[0];

  useEffect(() => {
    // Check if we have a draft loaded
    if (currentRequestId) {
      setIsDraftLoaded(true);
    }
  }, [currentRequestId]);

  const handleSubmit = async (isDraft = false) => {
    if (loading) return;

    // Show confirmation overlay for final submission only
    if (!isDraft) {
      setShowConfirmation(true);
      return;
    }

    // Direct submission for drafts
    await processSubmission(isDraft);
  };

  const processSubmission = async (isDraft = false) => {
    try {
      setLoading(true);
      await handleOwnerSubmission(isDraft);
      
      if (isDraft) {
        alert('Information saved as draft successfully!');
        navigate('/drafts');
      } else {
        alert('Owner information submitted successfully!');
        // Clear the form after successful submission (not draft)
        clearDraft();
        navigate('/'); // Navigate to home page after successful submission
      }
    } catch (error) {
      console.error('Submission failed:', error);
      alert(`${isDraft ? 'Save as draft' : 'Submission'} failed. Please try again.`);
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const handleConfirm = () => {
    processSubmission(false);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  const handleNewForm = () => {
    if (window.confirm('Are you sure you want to start a new form? Any unsaved changes will be lost.')) {
      clearDraft();
      setIsDraftLoaded(false);
    }
  };
  
  //Required fields for saving as draft
  const isFormValid = () => {
    const requiredFields = [
      'owner_fname',
      'owner_mname', 
      'owner_lname',
      'owner_sex',
      'owner_dob',
      'place_of_birth',
      'owner_nationality'
    ];
    
    return requiredFields.every(field => formData[field] && formData[field].trim() !== '');
  };

  return (
    <div className="owner-page-container">
      {/* Confirmation Overlay */}
      {showConfirmation && (
        <div className="confirmation-overlay" style={{
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
          <div className="confirmation-dialog" style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            animation: 'fadeIn 0.3s ease-out',
            scrollbarWidth: 'none'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                margin: '0 0 12px 0', 
                color: '#333', 
                fontSize: '20px',
                fontWeight: '600'
              }}>
                Confirm Submission
              </h3>
              <p style={{ 
                margin: 0, 
                color: '#666', 
                lineHeight: '1.5',
                fontSize: '16px'
              }}>
                Please review all information before submitting. Once submitted, you will not be able to edit this information.
              </p>
            </div>
            
            <div className="confirmation-summary" style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '1px solid #e9ecef',
              scrollBarWidth: 'none'
            }}>
              <h4 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '16px', 
                color: '#495057',
                fontWeight: '600'
              }}>
                Complete Information Summary:
              </h4>
              
              {/* Owner Information */}
              <div style={{ marginBottom: '16px' }}>
                <h5 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '14px', 
                  color: '#007bff',
                  fontWeight: '600'
                }}>
                  Owner Information
                </h5>
                <div style={{ fontSize: '13px', color: '#6c757d', paddingLeft: '12px' }}>
                  <p style={{ margin: '3px 0' }}>
                    <strong>Name:</strong> {formData.owner_fname} {formData.owner_mname} {formData.owner_lname} {formData.owner_suffix}
                  </p>
                  <p style={{ margin: '3px 0' }}>
                    <strong>Sex:</strong> {formData.owner_sex === 'M' ? 'Male' : formData.owner_sex === 'F' ? 'Female' : 'Not specified'}
                  </p>
                  <p style={{ margin: '3px 0' }}>
                    <strong>Date of Birth:</strong> {formData.owner_dob || 'Not provided'}
                  </p>
                  <p style={{ margin: '3px 0' }}>
                    <strong>Place of Birth:</strong> {formData.place_of_birth || 'Not provided'}
                  </p>
                  <p style={{ margin: '3px 0' }}>
                    <strong>Nationality:</strong> {formData.owner_nationality || 'Not provided'}
                  </p>
                </div>
              </div>

              {/* Address Information */}
              {(formData.house_no || formData.street || formData.barangay || formData.city || formData.province || formData.country) && (
                <div style={{ marginBottom: '16px' }}>
                  <h5 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '14px', 
                    color: '#007bff',
                    fontWeight: '600'
                  }}>
                    Address Information
                  </h5>
                  <div style={{ fontSize: '13px', color: '#6c757d', paddingLeft: '12px' }}>
                    {formData.house_no && (
                      <p style={{ margin: '3px 0' }}>
                        <strong>House Number:</strong> {formData.house_no}
                      </p>
                    )}
                    {formData.street && (
                      <p style={{ margin: '3px 0' }}>
                        <strong>Street:</strong> {formData.street}
                      </p>
                    )}
                    {formData.barangay && (
                      <p style={{ margin: '3px 0' }}>
                        <strong>Barangay:</strong> {formData.barangay}
                      </p>
                    )}
                    {formData.city && (
                      <p style={{ margin: '3px 0' }}>
                        <strong>City:</strong> {formData.city}
                      </p>
                    )}
                    {formData.province && (
                      <p style={{ margin: '3px 0' }}>
                        <strong>Province:</strong> {formData.province}
                      </p>
                    )}
                    {formData.country && (
                      <p style={{ margin: '3px 0' }}>
                        <strong>Country:</strong> {formData.country}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Father's Information */}
              {(formData.f_fname || formData.f_mname || formData.f_lname) && (
                <div style={{ marginBottom: '16px' }}>
                  <h5 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '14px', 
                    color: '#007bff',
                    fontWeight: '600'
                  }}>
                    Father's Information
                  </h5>
                  <div style={{ fontSize: '13px', color: '#6c757d', paddingLeft: '12px' }}>
                    <p style={{ margin: '3px 0' }}>
                      <strong>Name:</strong> {[formData.f_fname, formData.f_mname, formData.f_lname].filter(name => name).join(' ') || 'Not provided'}
                    </p>
                  </div>
                </div>
              )}

              {/* Mother's Information */}
              {(formData.m_fname || formData.m_mname || formData.m_lname) && (
                <div style={{ marginBottom: '8px' }}>
                  <h5 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '14px', 
                    color: '#007bff',
                    fontWeight: '600'
                  }}>
                    Mother's Maiden Information
                  </h5>
                  <div style={{ fontSize: '13px', color: '#6c757d', paddingLeft: '12px' }}>
                    <p style={{ margin: '3px 0' }}>
                      <strong>Name:</strong> {[formData.m_fname, formData.m_mname, formData.m_lname].filter(name => name).join(' ') || 'Not provided'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={handleCancel}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  color: '#666',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: loading ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  backgroundColor: '#007bff',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="owner-header">
        <h1 className="owner-title">Owner Information Form</h1>
        <p className="owner-subtitle">
          Please provide accurate information for certificate registration. All required fields must be completed to proceed.
        </p>
        
        {isDraftLoaded && (
          <div className="draft-notice" style={{
            backgroundColor: '#e3f2fd',
            border: '1px solid #2196f3',
            borderRadius: '4px',
            padding: '12px',
            margin: '16px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: '#1976d2', fontWeight: '500' }}>
              📝 Draft loaded - You can continue editing your saved information
            </span>
            <button 
              type="button"
              onClick={handleNewForm}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #1976d2',
                color: '#1976d2',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Start New Form
            </button>
          </div>
        )}
      </div>

      <div className="owner-section">
        <h2 className="owner-section-title">Owner Information</h2>
        <div className="owner-form-grid">
          <div className="owner-input-box">
            <label>First Name *</label>
            <input 
              type="text" 
              id="owner_fname" 
              value={formData.owner_fname} 
              onChange={handleChange} 
              placeholder="Enter first name" 
              pattern="[A-Za-z\s]+"
              title="Only letters and spaces are allowed"
              maxLength={50}
              required 
            />
          </div>
          <div className="owner-input-box">
            <label>Middle Name *</label>
            <input 
              type="text" 
              id="owner_mname" 
              value={formData.owner_mname} 
              onChange={handleChange} 
              placeholder="Enter middle name" 
              pattern="[A-Za-z\s]+"
              title="Only letters and spaces are allowed"
              maxLength={50}
              required 
            />
          </div>
          <div className="owner-input-box">
            <label>Last Name *</label>
            <input 
              type="text" 
              id="owner_lname" 
              value={formData.owner_lname} 
              onChange={handleChange} 
              placeholder="Enter last name" 
              pattern="[A-Za-z\s]+"
              title="Only letters and spaces are allowed"
              maxLength={50}
              required 
            />
          </div>
          <div className="owner-input-box">
            <label>Suffix</label>
            <input 
              type="text" 
              id="owner_suffix" 
              value={formData.owner_suffix} 
              onChange={handleChange} 
              placeholder="Jr., Sr., III, etc."
              pattern="[A-Za-z\s.,]+"
              title="Only letters, spaces, commas, and periods are allowed"
              maxLength={10}
            />
          </div>
          <div className="owner-input-box-sex">
            <label>Sex *</label>
            <select id="owner_sex" value={formData.owner_sex} onChange={handleChange} required>
              <option value="">Select</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div className="owner-input-box-date">
            <label>Date of Birth *</label>
            <input 
              type="date" 
              id="owner_dob" 
              value={formData.owner_dob} 
              onChange={handleChange} 
              min={minDate}
              max={today}
              title="Date must be between 100 years ago and today"
              required 
            />
          </div>
          <div className="owner-input-box owner-full">
            <label>Place of Birth *</label>
            <input 
              type="text" 
              id="place_of_birth" 
              value={formData.place_of_birth} 
              onChange={handleChange} 
              placeholder="City, Province, Country" 
              pattern="[A-Za-z\s,.\\-]+"
              title="Only letters, spaces, commas, periods, and hyphens are allowed"
              maxLength={100}
              required 
            />
          </div>
          <div className="owner-input-box">
            <label>Nationality *</label>
            <input 
              type="text" 
              id="owner_nationality" 
              value={formData.owner_nationality} 
              onChange={handleChange} 
              pattern="[A-Za-z\s]+"
              title="Only letters and spaces are allowed"
              maxLength={30}
              required 
            />
          </div>
        </div>

        <h2 className="owner-section-title">Address Information</h2>
        <div className="owner-form-grid">
          <div className="owner-input-box">
            <label>House Number</label>
            <input 
              type="text" 
              id="house_no" 
              value={formData.house_no} 
              onChange={handleChange} 
              placeholder="911"
              pattern="[0-9A-Za-z\\s#\\-]+"
              title="Only numbers, letters, spaces, # and - are allowed"
              maxLength={20}
            />
          </div>
          <div className="owner-input-box">
            <label>Street</label>
            <input 
              type="text" 
              id="street" 
              value={formData.street} 
              onChange={handleChange} 
              placeholder="Main Street"
              pattern="[A-Za-z0-9\\s.,#\\-]+"
              title="Only letters, numbers, spaces, and common punctuation are allowed"
              maxLength={100}
            />
          </div>
          <div className="owner-input-box">
            <label>Barangay</label>
            <input 
              type="text" 
              id="barangay" 
              value={formData.barangay} 
              onChange={handleChange} 
              placeholder="Barangay name"
              pattern="[A-Za-z0-9\\s.,#\\-]+"
              title="Only letters, numbers, spaces, and common punctuation are allowed"
              maxLength={50}
            />
          </div>
          <div className="owner-input-box">
            <label>City</label>
            <input 
              type="text" 
              id="city" 
              value={formData.city} 
              onChange={handleChange} 
              placeholder="City name"
              pattern="[A-Za-z\\s.\\-]+"
              title="Only letters, spaces, periods, and hyphens are allowed"
              maxLength={50}
            />
          </div>
          <div className="owner-input-box">
            <label>Province</label>
            <input 
              type="text" 
              id="province" 
              value={formData.province} 
              onChange={handleChange} 
              placeholder="Province name"
              pattern="[A-Za-z\\s.\\-]+"
              title="Only letters, spaces, periods, and hyphens are allowed"
              maxLength={50}
            />
          </div>
          <div className="owner-input-box">
            <label>Country</label>
            <input 
              type="text" 
              id="country" 
              value={formData.country} 
              onChange={handleChange} 
              placeholder="Country name"
              pattern="[A-Za-z\\s.\\-]+"
              title="Only letters, spaces, periods, and hyphens are allowed"
              maxLength={50}
            />
          </div>
        </div>

        <h2 className="owner-section-title">Father's Information</h2>
        <div className="owner-form-grid">
          <div className="owner-input-box">
            <label>First Name</label>
            <input 
              type="text" 
              id="f_fname" 
              value={formData.f_fname} 
              onChange={handleChange}
              placeholder="Father's first name" 
              pattern="[A-Za-z\s]+"
              title="Only letters and spaces are allowed"
              maxLength={50}
            />
          </div>
          <div className="owner-input-box">
            <label>Middle Name</label>
            <input 
              type="text" 
              id="f_mname" 
              value={formData.f_mname} 
              onChange={handleChange} 
              placeholder="Father's middle name"
              pattern="[A-Za-z\s]+"
              title="Only letters and spaces are allowed"
              maxLength={50}
            />
          </div>
          <div className="owner-input-box">
            <label>Last Name</label>
            <input 
              type="text" 
              id="f_lname" 
              value={formData.f_lname} 
              onChange={handleChange} 
              placeholder="Father's last name"
              pattern="[A-Za-z\s]+"
              title="Only letters and spaces are allowed"
              maxLength={50}
            />
          </div>
        </div>

        <h2 className="owner-section-title">Mother's Maiden Information</h2>
        <div className="owner-form-grid">
          <div className="owner-input-box">
            <label>First Name</label>
            <input 
              type="text" 
              id="m_fname" 
              value={formData.m_fname} 
              onChange={handleChange} 
              placeholder="Mother's first name"
              pattern="[A-Za-z\s]+"
              title="Only letters and spaces are allowed"
              maxLength={50}
            />
          </div>
          <div className="owner-input-box">
            <label>Middle Name</label>
            <input 
              type="text" 
              id="m_mname" 
              value={formData.m_mname} 
              onChange={handleChange} 
              placeholder="Mother's middle name"
              pattern="[A-Za-z\s]+"
              title="Only letters and spaces are allowed"
              maxLength={50}
            />
          </div>
          <div className="owner-input-box">
            <label>Last Name</label>
            <input 
              type="text" 
              id="m_lname" 
              value={formData.m_lname} 
              onChange={handleChange} 
              placeholder="Mother's last name"
              pattern="[A-Za-z\s]+"
              title="Only letters and spaces are allowed"
              maxLength={50}
            />
          </div>
        </div>

        <div className="owner-button-container">
          <button 
            className="owner-submit-btn" 
            onClick={() => handleSubmit(true)}  
            type="button"
            disabled={loading}
            style={{
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Saving...' : 'Save as Draft'}
          </button>
          <button 
            className="owner-submit-btn" 
            onClick={() => handleSubmit(false)}  
            type="button"
            disabled={loading || !isFormValid()}
            style={{
              opacity: (loading || !isFormValid()) ? 0.6 : 1,
              cursor: (loading || !isFormValid()) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Submitting...' : 'Submit Information'}
          </button>
        </div>
      </div>

      {/* Add CSS for fade-in animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default OwnerPage;