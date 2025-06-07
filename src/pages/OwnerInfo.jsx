// OwnerPage.jsx
import React from 'react'
import '../styles/OwnerInfo.css'

function OwnerPage() {
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
            <input type="text" id="O_Fname" required />
          </div>
          <div className="owner-input-box">
            <label>Middle Name</label>
            <input type="text" id="O_Mname" required />
          </div>
          <div className="owner-input-box">
            <label>Last Name</label>
            <input type="text" id="O_Lname" required />
          </div>
          <div className="owner-input-box">
            <label>Suffix</label>
            <input type="text" id="O_Suffix" />
          </div>
          <div className="owner-input-box">
            <label>Sex</label>
            <select id="sex" required>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="owner-input-box">
            <label>Date of Birth</label>
            <input type="date" id="birthdate" required />
          </div>
          <div className="owner-input-box owner-full">
            <label>Place of Birth</label>
            <input type="text" id="O_Place_of_Birth" placeholder="Hospital" required />
          </div>
          <div className="owner-input-box">
            <label>Nationality</label>
            <input type="text" id="O_Nationality" defaultValue="Filipino" required />
          </div>
        </div>

        <h2 className="owner-section-title">Address Information</h2>
        <div className="owner-form-grid">
          <div className="owner-input-box">
            <label>House No.</label>
            <input type="text" id="house_no" />
          </div>
          <div className="owner-input-box">
            <label>Street</label>
            <input type="text" id="street" />
          </div>
          <div className="owner-input-box">
            <label>Barangay</label>
            <input type="text" id="barangay" />
          </div>
          <div className="owner-input-box">
            <label>City</label>
            <input type="text" id="city" />
          </div>
          <div className="owner-input-box">
            <label>Province</label>
            <input type="text" id="province" />
          </div>
          <div className="owner-input-box">
            <label>Country</label>
            <input type="text" id="country" defaultValue="Philippines" />
          </div>
        </div>

        <h2 className="owner-section-title">Father's Information</h2>
        <div className="owner-form-grid">
          <div className="owner-input-box">
            <label>First Name</label>
            <input type="text" id="f_fname" />
          </div>
          <div className="owner-input-box">
            <label>Middle Name</label>
            <input type="text" id="f_mname" />
          </div>
          <div className="owner-input-box">
            <label>Last Name</label>
            <input type="text" id="f_lname" />
          </div>
          <div className="owner-input-box">
            <label>Suffix</label>
            <input type="text" id="f_suffix" />
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
            <input type="text" id="m_fname" />
          </div>
          <div className="owner-input-box">
            <label>Middle Name</label>
            <input type="text" id="m_mname" />
          </div>
          <div className="owner-input-box">
            <label>Last Name</label>
            <input type="text" id="m_lname" />
          </div>
          <div className="owner-input-box">
            <label>Suffix</label>
            <input type="text" id="m_suffix" />
          </div>
          <div className="owner-input-box">
            <label>Nationality</label>
            <input type="text" id="m_nationality" defaultValue="Filipino" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default OwnerPage