import React, { useState, useEffect, useCallback, useMemo } from 'react';
import '../styles/Request.css';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { useRequest } from '../contexts/RequestContext';
import { useNavigate } from 'react-router-dom';

function RequestPage() {
  const [formData, setFormData] = useState({
    Fname: '',
    Lname: '',
    contact: '',
    purpose: '',
    specify: ''
  });

  const [showOtherPurpose, setShowOtherPurpose] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [backgroundError, setBackgroundError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createRequest } = useRequest();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Preload background image with optimization
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setBackgroundLoaded(true);
      setBackgroundError(false);
    };
    img.onerror = () => {
      setBackgroundLoaded(false);
      setBackgroundError(true);
    };
    
    // Prioritize most likely paths first
    const imagePaths = [
      '/assets/requestBG.png',
      '/images/requestBG.png',
      '/requestBG.png',
      './requestBG.png',
    ];
    
    const tryLoadImage = (index = 0) => {
      if (index >= imagePaths.length) {
        setBackgroundError(true);
        return;
      }
      
      img.src = imagePaths[index];
      img.onerror = () => tryLoadImage(index + 1);
    };
    
    tryLoadImage();
  }, []);

  // Memoize form validation to prevent unnecessary recalculations
  const isFormValid = useMemo(() => {
    const { Fname, Lname, contact, purpose, specify } = formData;
    const basicFieldsFilled = Fname.trim() && Lname.trim() && contact.trim() && purpose;
    return showOtherPurpose ? basicFieldsFilled && specify.trim() : basicFieldsFilled;
  }, [formData, showOtherPurpose]);

  // Optimize input change handler with useCallback
  const handleInputChange = useCallback((e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  }, []);

  // Optimize purpose change handler
  const handlePurposeChange = useCallback((e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      purpose: value,
      specify: value !== 'Other' ? '' : prev.specify
    }));
    setShowOtherPurpose(value === 'Other');
  }, []);

  // Memoize the request payload to avoid recreating on every render
  const requestPayload = useMemo(() => {
    if (!currentUser?.id) return null;
    
    return {
      userId: currentUser.id,
      ownerId: null,
      bcNumber: null,
      statusId: null,
      firstName: formData.Fname.trim(),
      lastName: formData.Lname.trim(),
      contactNumber: formData.contact.trim(),
      purpose: formData.purpose === 'Other' ? formData.specify.trim() : formData.purpose
    };
  }, [currentUser?.id, formData]);

  // Optimized submit handler
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (!isFormValid || isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      // Use the memoized payload
      await createRequest(requestPayload);
      
      // Reset form state
      setFormData({ Fname: '', Lname: '', contact: '', purpose: '', specify: '' });
      setShowOtherPurpose(false);
      
      // Navigate immediately after successful submission
      navigate('/owner');
      
      // Show success message after navigation
      setTimeout(() => {
        alert('Request submitted successfully!');
      }, 100);
      
    } catch (error) {
      console.error('Request submission error:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isFormValid, isSubmitting, createRequest, requestPayload, navigate]);

  // Early return if user is not available
  if (!currentUser?.id) {
    return (
      <div className="request-main-div">
        <Navbar />
        <div className="request-page">
          <div className="request-wrapper">
            <div className="loading-message">Loading user information...</div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`request-main-div ${backgroundLoaded ? 'background-loaded' : ''} ${backgroundError ? 'background-error' : ''}`}>
      <Navbar />
      <div className="request-page">
        <div className="request-wrapper">
          <form onSubmit={handleSubmit} className="request-form">
            <h1 className="request-title">Request Certificate</h1>

            <div className="request-name-container">
              <div className="request-input-box">
                <label htmlFor="Fname" className="request-label">First Name:</label>
                <input
                  type="text"
                  id="Fname"
                  className="request-input"
                  placeholder="Juan"
                  value={formData.Fname}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="request-input-box">
                <label htmlFor="Lname" className="request-label">Last Name:</label>
                <input
                  type="text"
                  id="Lname"
                  className="request-input"
                  placeholder="Dela Cruz"
                  value={formData.Lname}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="request-input-box">
              <label htmlFor="contact" className="request-label">Contact No:</label>
              <input
                type="tel"
                id="contact"
                className="request-input"
                placeholder="+63 **********"
                maxLength="13"
                value={formData.contact}
                onChange={handleInputChange}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="request-select-container">
              <label htmlFor="purpose" className="request-label">Choose a Purpose:</label>
              <select
                id="purpose"
                name="purpose"
                className="request-select"
                value={formData.purpose}
                onChange={handlePurposeChange}
                disabled={isSubmitting}
                required
              >
                <option value="">Select a purpose</option>
                <option value="School">School</option>
                <option value="Travel">Travel</option>
                <option value="Employment">Employment</option>
                <option value="Loan">Loan</option>
                <option value="Other">Other</option>
              </select>

              {showOtherPurpose && (
                <div className="request-other-purpose">
                  <label htmlFor="specify" className="request-label">Please specify:</label>
                  <input
                    type="text"
                    id="specify"
                    className="request-input"
                    placeholder="Enter purpose here..."
                    value={formData.specify}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required={showOtherPurpose}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="request-btn"
              disabled={!isFormValid || isSubmitting}
              style={{
                opacity: (isFormValid && !isSubmitting) ? 1 : 0.5,
                cursor: (isFormValid && !isSubmitting) ? 'pointer' : 'not-allowed'
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RequestPage;