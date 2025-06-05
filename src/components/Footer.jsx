import '../styles/Footer.css';



const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-section logo-section">
        <div>
          <img src="/Asset 1.svg" alt="Birth Certify Logo" className="logo" />
          <h2 className="title">Birth Certify</h2>
          <p className="subtitle">A Civil Request Management System</p>
        </div>
        <div className="project-info">
          <p><strong>Birth Certify is a project of:</strong></p>
          <p>CANSINO, FAELDONIA, LUCERO, RACELIS, TAMARES</p>
          <p>BSCS 2-5 Academic Year 2024–2025</p>
          <p>College of Computer and Information Sciences, PUP Manila</p>
        </div>
      </div>

      <div className="footer-section about-section">
        <h2>About</h2>
        <p>
          Birth Certify is an online request platform for birth certificates,
          adapted from a PSA manual form and developed as a Civil Request
          Management System in fulfillment for COMP 010 – Information
          Management as a final project.
        </p>
      </div>

      <div className="footer-section contact-section">
        <h2>Contact Us</h2>
        <div className="icons">
            <img src='./call.svg' alt="Phone" className="icon" />
            <img src='./email.svg' alt="Email" className="icon" />
        </div>
      </div>
      <hr></hr>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Birth Certify. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;