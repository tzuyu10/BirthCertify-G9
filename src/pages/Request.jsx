import React, { useState } from 'react'
import '../styles/Request.css'
import Navbar from '../components/Navbar'
import { Link } from "react-router-dom";

function RequestPage() {
  const [formData, setFormData] = useState({
    Fname: '',
    Lname: '',
    contact: '',
    purpose: '',
    specify: ''
  });

  const [showOtherPurpose, setShowOtherPurpose] = useState(false);

  // Function to check if all required fields are filled
  const isFormValid = () => {
    const { Fname, Lname, contact, purpose, specify } = formData;
    
    // Check basic required fields
    const basicFieldsFilled = Fname.trim() !== '' && 
                             Lname.trim() !== '' && 
                             contact.trim() !== '' && 
                             purpose !== '';
    
    // If "Other" is selected, also check if specify field is filled
    if (showOtherPurpose) {
      return basicFieldsFilled && specify.trim() !== '';
    }
    
    return basicFieldsFilled;
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handlePurposeChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      purpose: value,
      specify: value !== 'Other' ? '' : prev.specify
    }));
    
    setShowOtherPurpose(value === 'Other');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isFormValid()) {
      console.log('Form submitted:', formData);
      // Add your form submission logic here
    }
  };

  return (
    <div className="request-main-div">
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
                    required={showOtherPurpose}
                  />
                </div>
              )}
            </div>
            
            <Link to="/owner">
              <button 
                type="submit" 
                className="request-btn"
                disabled={!isFormValid()}
                style={{
                  opacity: isFormValid() ? 1 : 0.5,
                  cursor: isFormValid() ? 'pointer' : 'not-allowed'
                }}
              >
                Submit Request
              </button>
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RequestPage