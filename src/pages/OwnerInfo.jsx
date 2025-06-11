import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOwner } from '../contexts/OwnerContext';
import '../styles/OwnerInfo.css';

function OwnerPage() {
  const { formData, handleChange, handleOwnerSubmission } = useOwner();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      await handleOwnerSubmission();
      alert('Owner information submitted successfully!');
      navigate('/'); // Navigate to home page after successful submission
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Submission failed. Please try again.');
    }
  };

  return (
    <div className="owner-page-container">
      <div className="owner-header">
        <h1 className="owner-title">Certificate Holder Information</h1>
      </div>

      <div className="owner-section">
        <h2>Owner Information</h2>
        <div className="owner-form-grid">
          <div className="owner-input-box">
            <label>First Name</label>
            <input type="text" id="owner_fname" value={formData.owner_fname} onChange={handleChange} required />
          </div>
          <div className="owner-input-box">
            <label>Middle Name</label>
            <input type="text" id="owner_mname" value={formData.owner_mname} onChange={handleChange} required />
          </div>
          <div className="owner-input-box">
            <label>Last Name</label>
            <input type="text" id="owner_lname" value={formData.owner_lname} onChange={handleChange} required />
          </div>
          <div className="owner-input-box">
            <label>Suffix</label>
            <input type="text" id="owner_suffix" value={formData.owner_suffix} onChange={handleChange} />
          </div>
          <div className="owner-input-box-sex">
            <label>Sex</label>
            <select id="owner_sex" value={formData.owner_sex} onChange={handleChange} required>
              <option value="">Select</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div className="owner-input-box-date">
            <label>Date of Birth</label>
            <input type="date" id="owner_dob" value={formData.owner_dob} onChange={handleChange} required />
          </div>
          <div className="owner-input-box owner-full">
            <label>Place of Birth</label>
            <input type="text" id="place_of_birth" value={formData.place_of_birth} onChange={handleChange} required />
          </div>
          <div className="owner-input-box">
            <label>Nationality</label>
            <input type="text" id="owner_nationality" value={formData.owner_nationality} onChange={handleChange} required />
          </div>
        </div>

        <h2 className="owner-section-title">Address Information</h2>
        <div className="owner-form-grid">
          <div className="owner-input-box">
            <label>House Number</label>
            <input type="text" id="house_no" value={formData.house_no} onChange={handleChange} />
          </div>
          <div className="owner-input-box">
            <label>Street</label>
            <input type="text" id="street" value={formData.street} onChange={handleChange} />
          </div>
          <div className="owner-input-box">
            <label>Barangay</label>
            <input type="text" id="barangay" value={formData.barangay} onChange={handleChange} />
          </div>
          <div className="owner-input-box">
            <label>City</label>
            <input type="text" id="city" value={formData.city} onChange={handleChange} />
          </div>
          <div className="owner-input-box">
            <label>Province</label>
            <input type="text" id="province" value={formData.province} onChange={handleChange} />
          </div>
          <div className="owner-input-box">
            <label>Country</label>
            <input type="text" id="country" value={formData.country} onChange={handleChange} />
          </div>
        </div>

        <h2 className="owner-section-title">Father's Information</h2>
        <div className="owner-form-grid">
          <div className="owner-input-box">
            <label>First Name</label>
            <input type="text" id="f_fname" value={formData.f_fname} onChange={handleChange} />
          </div>
          <div className="owner-input-box">
            <label>Middle Name</label>
            <input type="text" id="f_mname" value={formData.f_mname} onChange={handleChange} />
          </div>
          <div className="owner-input-box">
            <label>Last Name</label>
            <input type="text" id="f_lname" value={formData.f_lname} onChange={handleChange} />
          </div>
        </div>

        <h2 className="owner-section-title">Mother's Information</h2>
        <div className="owner-form-grid">
          <div className="owner-input-box">
            <label>First Name</label>
            <input type="text" id="m_fname" value={formData.m_fname} onChange={handleChange} />
          </div>
          <div className="owner-input-box">
            <label>Middle Name</label>
            <input type="text" id="m_mname" value={formData.m_mname} onChange={handleChange} />
          </div>
          <div className="owner-input-box">
            <label>Last Name</label>
            <input type="text" id="m_lname" value={formData.m_lname} onChange={handleChange} />
          </div>
        </div>

        <div className="owner-button-container">
          <button className="owner-submit-btn" onClick={handleSubmit} type="button">
            Submit Information
          </button>
        </div>
      </div>
    </div>
  );
}

export default OwnerPage;