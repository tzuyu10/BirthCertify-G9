import React from "react";
import { useNavigate } from "react-router-dom";
import * as IoIcons from "react-icons/io";

const DownloadBox = ({
  fileName = "birth-certificate-form.pdf",
  linkText = "Go to PDF Generator",
}) => {
  const navigate = useNavigate();

  const handleDownloadClick = () => {
    // Route directly to the InvoiceViewer component
    navigate("/pdf-generator");
  };

  const handleLinkClick = (e) => {
    e.stopPropagation();
    navigate("/pdf-generator");
  };

  return (
    <div
      className="download-box"
      onClick={handleDownloadClick}
      style={{
        cursor: "pointer",
        border: "2px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px",
        margin: "10px",
        backgroundColor: "#f9fafb",
        textAlign: "center",
      }}
    >
      <h4>
        <IoIcons.IoIosDownload /> Download
      </h4>
      <p>{fileName}</p>

      <a
        href="#"
        onClick={handleLinkClick}
        style={{
          color: "#2563eb",
          textDecoration: "underline",
          cursor: "pointer",
          fontSize: "14px",
          display: "block",
          marginTop: "8px",
        }}
      >
        {linkText}
      </a>
    </div>
  );
};

export default DownloadBox;
