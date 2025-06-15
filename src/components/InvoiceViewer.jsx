import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Invoice.css";

const InvoiceViewer = () => {
  const [html2canvasLoaded, setHtml2canvasLoaded] = useState(false);
  const [jsPDFLoaded, setJsPDFLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Load html2canvas library
    const html2canvasScript = document.createElement("script");
    html2canvasScript.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    html2canvasScript.onload = () => setHtml2canvasLoaded(true);
    document.head.appendChild(html2canvasScript);

    // Load jsPDF library
    const jsPDFScript = document.createElement("script");
    jsPDFScript.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    jsPDFScript.onload = () => setJsPDFLoaded(true);
    document.head.appendChild(jsPDFScript);

    return () => {
      // Cleanup
      if (document.head.contains(html2canvasScript)) {
        document.head.removeChild(html2canvasScript);
      }
      if (document.head.contains(jsPDFScript)) {
        document.head.removeChild(jsPDFScript);
      }
    };
  }, []);

  const handleGoBack = () => {
    navigate(-1); // Go back to previous page
  };

  const handleDownloadPDF = async () => {
    if (!html2canvasLoaded || !jsPDFLoaded) {
      alert("PDF generator is still loading. Please try again in a moment.");
      return;
    }

    try {
      const element = document.querySelector(".form-content");

      // Generate canvas from the form
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
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Calculate dimensions to fit A4
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add image to PDF
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        position,
        imgWidth,
        imgHeight
      );
      heightLeft -= pageHeight;

      // Add new pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          0,
          position,
          imgWidth,
          imgHeight
        );
        heightLeft -= pageHeight;
      }

      // Download the PDF
      pdf.save("birth-certificate-form.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try using the Print option instead.");
    }
  };

  const handleDownloadImage = async () => {
    if (!html2canvasLoaded) {
      alert("Image download is still loading. Please try again in a moment.");
      return;
    }

    try {
      const element = document.querySelector(".form-content");

      const canvas = await window.html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      // Create download link
      const link = document.createElement("a");
      link.download = "birth-certificate-form.png";
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating image:", error);
      alert(
        "Error generating image. Please try using the Print option and save as PDF instead."
      );
    }
  };

  // Style object to ensure all text is black
  const blackTextStyle = { color: "#000000" };

  return (
    <div className="form-container">
      {/* Back Button and Action Buttons */}
      <div className="no-print">
        {/* Back Button */}
        <div className="back-button-container" style={{ marginBottom: "15px" }}>
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

        {/* Action Buttons */}
        <div className="button-group">
          <button
            onClick={handleDownloadPDF}
            className="action-button pdf-btn"
            disabled={!html2canvasLoaded || !jsPDFLoaded}
            title={
              !html2canvasLoaded || !jsPDFLoaded
                ? "Loading PDF generator..."
                : "Download PDF file directly"
            }
          >
            📄 Download PDF{" "}
            {(!html2canvasLoaded || !jsPDFLoaded) && "(Loading...)"}
          </button>
          <button
            onClick={handleDownloadImage}
            className="action-button image-btn"
            disabled={!html2canvasLoaded}
            title={
              !html2canvasLoaded
                ? "Loading image library..."
                : "Download as PNG image"
            }
          >
            🖼️ Download Image {!html2canvasLoaded && "(Loading...)"}
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="form-content" style={blackTextStyle}>
        {/* Header */}
        <div className="header">
          <div className="logo-left">
            <div className="psa-logo"></div>
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
            <div className="right-logo"></div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="important-notice">
          <div className="notice-header" style={blackTextStyle}>
            IMPORTANT: PLEASE READ BEFORE CLAIMING THE REQUESTED DOCUMENT
          </div>
          <div className="notice-content" style={blackTextStyle}>
            <p style={blackTextStyle}>
              1. A valid ID is required from the owner of the document.
            </p>
            <p style={blackTextStyle}>
              2. An authorization letter and ID of the document owner with the
              ID of the requester are required.
            </p>
            <p style={blackTextStyle}>
              3. Prepare Php 300.00 for the claiming of the owner's birth
              certificate.
            </p>
          </div>
        </div>

        {/* Birth Certificate Number */}
        <div className="form-section">
          <label className="field-label" style={blackTextStyle}>
            Birth Certificate Number:
          </label>
          <input
            type="text"
            className="form-input long-input"
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

            <div className="form-row">
              <div className="form-field">
                <label style={blackTextStyle}>Last name:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label style={blackTextStyle}>First name:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label style={blackTextStyle}>Middle name:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label style={blackTextStyle}>Date of Birth:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label style={blackTextStyle}>Place of Birth:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
            </div>
          </div>

          {/* Parents Information */}
          <div className="parents-section">
            <div className="parent-group">
              <h4 className="parent-title" style={blackTextStyle}>
                Name of Father
              </h4>
              <div className="form-field">
                <label style={blackTextStyle}>Last name:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
              <div className="form-field">
                <label style={blackTextStyle}>First name:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
              <div className="form-field">
                <label style={blackTextStyle}>Middle name:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
            </div>

            <div className="parent-group">
              <h4 className="parent-title" style={blackTextStyle}>
                Name of Mother
              </h4>
              <div className="form-field">
                <label style={blackTextStyle}>Last name:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
              <div className="form-field">
                <label style={blackTextStyle}>First name:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
              <div className="form-field">
                <label style={blackTextStyle}>Middle name:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
            </div>
          </div>

          {/* Requester's Information */}
          <div className="form-group">
            <h3 className="section-title" style={blackTextStyle}>
              Requester's Information
            </h3>

            <div className="form-row">
              <div className="form-field">
                <label style={blackTextStyle}>First name:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label style={blackTextStyle}>Last name:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label style={blackTextStyle}>Contact Number:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label style={blackTextStyle}>Request Purpose:</label>
                <input
                  type="text"
                  className="form-input"
                  style={blackTextStyle}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Notice */}
        <div className="bottom-notice">
          <div className="notice-title" style={blackTextStyle}>
            NOTICE
          </div>
          <div className="notice-text" style={blackTextStyle}>
            <p style={blackTextStyle}>
              The PSA and BirthCertify supports the policy of the State to
              protect the fundamental right of privacy. In view of the changes
              of Republic Act No. 10173 or the "Data Privacy Act of 2012", this
              office cannot issue documents from which the identity of an
              individual is apparent or can be reasonably and directly
              ascertained without the consent of the individual whose personal
              information is processed. Such consent must be evidenced by
              written, electronic or recorded means.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewer;
