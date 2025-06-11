// OwnerPage.jsx
import React from 'react'
import '../styles/OwnerInfo.css'

function OwnerPage() {
  const handleSubmit = () => {
    // Add your submit logic here
    console.log('Form submitted');
  }

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
            <input type="text" id="O_Fname" placeholder="First Name" required />
          </div>
          <div className="owner-input-box">
            <label>Middle Name</label>
            <input type="text" id="O_Mname" placeholder="Middle Name" required />
          </div>
          <div className="owner-input-box">
            <label>Last Name</label>
            <input type="text" id="O_Lname" placeholder="Last Name" required />
          </div>
          <div className="owner-input-box">
            <label>Suffix</label>
            <input type="text" id="O_Suffix" placeholder="Jr, Sr, III..." />
          </div>
          <div className="owner-input-box-sex">
            <label>Sex</label>
            <select id="sex" required>
              <option className="option" value="">Select</option>
              <option className="option" value="Male">Male</option>
              <option className="option" value="Female">Female</option>
            </select>
          </div>
          <div className="owner-input-box-date">
            <label>Date of Birth</label>
            <input type="date" id="birthdate" required />
          </div>
          <div className="owner-input-box owner-full">
            <label>Place of Birth</label>
            <input type="text" id="O_Place_of_Birth" placeholder="Place of Birth" required />
          </div>
          <div className="owner-input-box">
            <label>Nationality</label>
            <input type="text" id="O_Nationality" defaultValue="Filipino" required />
          </div>
        </div>

        <h2 className="owner-section-title">Address Information</h2>
        <div className="owner-form-grid">
          <div className="owner-input-box">
            <label>House Number</label>
            <input type="text" id="house_no" placeholder="House Number" />
          </div>
          <div className="owner-input-box">
            <label>Street</label>
            <input type="text" id="street" placeholder="Street" />
          </div>
          <div className="owner-input-box">
            <label>Barangay</label>
            <input type="text" id="barangay" placeholder="Barangay"/>
          </div>
          <div className="owner-input-box">
            <label>City</label>
            <input type="text" id="city" placeholder="City" />
          </div>
          <div className="owner-input-box">
            <label>Province</label>
            <input type="text" id="province" placeholder="Province" />
          </div>
          <div className="owner-input-box">
            <label>Country</label>
            <input type="text" id="country" defaultValue="Philippines" placeholder="Country" />
          </div>
        </div>

        <h2 className="owner-section-title">Father's Information</h2>
        <div className="owner-form-grid">
          <div className="owner-input-box">
            <label>First Name</label>
            <input type="text" id="f_fname" placeholder="First Name" />
          </div>
          <div className="owner-input-box">
            <label>Middle Name</label>
            <input type="text" id="f_mname" placeholder="Middle Name" />
          </div>
          <div className="owner-input-box">
            <label>Last Name</label>
            <input type="text" id="f_lname" placeholder="Last Name" />
          </div>
          <div className="owner-input-box">
            <label>Suffix</label>
            <input type="text" id="f_suffix" placeholder="Jr, Sr, III..." />
          </div>
          <div className="owner-input-box">
            <label>Nationality</label>
            <input type="text" id="f_nationality" defaultValue="Filipino" />
          </div>
        </div>

        <h2 className="owner-section-title">Mother's Information</h2>
        <div className="owner-form-grid">
          <div className="owner-input-box">
            <label>First Name</label>
            <input type="text" id="m_fname" placeholder="First Name" />
          </div>
          <div className="owner-input-box">
            <label>Middle Name</label>
            <input type="text" id="m_mname" placeholder="Middle Name" />
          </div>
          <div className="owner-input-box">
            <label>Last Name</label>
            <input type="text" id="m_lname" placeholder="Last Name" />
          </div>
          <div className="owner-input-box">
            <label>Suffix</label>
            <input type="text" id="m_suffix" placeholder="Jr, Sr, III..." />
          </div>
          <div className="owner-input-box">
            <label>Nationality</label>
            <input type="text" id="m_nationality" defaultValue="Filipino" placeholder="Nationality" />
          </div>
        </div>

        <div className="owner-button-container">
          <button 
            className="owner-submit-btn" 
            onClick={handleSubmit}
            type="button"
          >
            Submit Information
          </button>
        </div>
      </div>
    </div>
  )
}

export default OwnerPage