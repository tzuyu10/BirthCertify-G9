import React from "react";
import Navbar from "../components/Navbar";
import "../styles/Navbar.css";
import "../styles/Help.css"; // Import the Help CSS file

const FAQ = () => {
  return (
    <div className="about-container">
      <Navbar />
      <div className="about-content">
        <h1 className="about-title">Frequently Asked Questions</h1>
        
        <section className="about-part">
          <h2>BirthCertify</h2>
          <div className="faq-item">
            <h3>What is BirthCertify?</h3>
            <p className="about-text">
              Birth Certify is an online request platform for birth certificates, 
              adapted from a PSA manual form and developed as a Civil Request Management System in fulfillment 
              for COMP 010 – Information Management as a final project.
            </p>
          </div>
          <div className="faq-item">
            <h3>Who can use BirthCertify?</h3>
            <p className="about-text">
              BirthCertify is designed for general public use. Anyone who needs to request a birth certificate, 
              update their information, or correct existing records can create an account and use the system. 
              The platform serves both individual users (registrants) and authorized administrators.
            </p>
          </div>
          <div className="faq-item">
            <h3>What technology powers BirthCertify?</h3>
            <p className="about-text">
              BirthCertify is built on modern, reliable technologies:
            </p>
            <ul className="tech-list">
              <li><strong>Frontend:</strong> React for a responsive, user-friendly interface</li>
              <li><strong>Backend:</strong> Supabase for secure data storage and management</li>
              <li><strong>Database:</strong> PostgreSQL for real-time database operations</li>
            </ul>
          </div>
        </section>

        <section className="about-part">
          <h2>Account & Security</h2>
          <div className="faq-item">
            <h3>How do I Sign-Up?</h3>
            <p className="about-text">
              To create an account, click the "Sign Up" button on the homepage and fill out the registration form 
              with your personal information. You'll need to provide a valid email address and create a secure password. 
              Once registered, you can log in to access all system features.
            </p>
          </div>
          <div className="faq-item">
            <h3>How is my data backed up?</h3>
            <p className="about-text">
              BirthCertify maintains a comprehensive backup and recovery system to prevent data loss. 
              Your information is regularly backed up to ensure continuity and data integrity.
            </p>
          </div>
        </section>

        <section className="about-part">
          <h2>Features & Functionality</h2>
          <div className="faq-item">
            <h3>What are the Key Features?</h3>
            <p className="about-text">
              BirthCertify offers comprehensive features including:
            </p>
            <ul className="tech-list">
              <li><strong>Core Services:</strong> Request birth certificate copies, updates, and corrections</li>
              <li><strong>Real-Time Tracking:</strong> Monitor application status with live updates and notifications</li>
              <li><strong>Secure Access:</strong> Protected login for users and administrators with role-based permissions</li>
              <li><strong>Draft Management:</strong> Save incomplete applications to complete later</li>
              <li><strong>Administrative Tools:</strong> Dashboard for managing requests, validation, and approvals</li>
              <li><strong>Data Security: </strong> Auto-generated PDF payment vouchers and transaction records</li>
              <li><strong>24/7 Accessibility:</strong> Available anytime from home or local offices</li>
            </ul>
          </div>
          <div className="faq-item">
            <h3>How do I request a copy of my birth certificate?</h3>
            <p className="about-text">
              After logging in, navigate to "Create New Request". 
              Fill out the required information, upload any necessary documents, and submit your request. 
              You'll receive a confirmation and can track your application status in real-time.
            </p>
          </div>
        </section>

        <section className="about-part">
          <h2>Who are we?</h2>
          <div className="faq-item">
            <h3>Meet the Team</h3>
            <p className="about-text">
              BirthCertify was developed by a dedicated team of five Computer Science students (Group 9) 
              in fullfillment for our COMP 010 - Information Management course project. Each team member contributed 
              their unique skills to create this comprehensive birth certificate request platform.
            </p>
            
            <div className="team-grid">
              {/* Team Member 1 */}
              <div className="team-member">
                <div className="github-profile">
                  <img 
                    src="https://github.com/saiionara.png" 
                    alt="Team Member 1 Profile" 
                    className="github-avatar"
                  />
                  <div className="github-info">
                    <h4>Florence Lee F. Cansino</h4>
                    <p className="member-role"></p>
                    <a 
                      href="https://github.com/saiionara" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="github-link"
                    >
                      <span className="github-icon">⚡</span>
                      GitHub
                    </a>
                  </div>
                </div>
              </div>

              {/* Team Member 2 */}
              <div className="team-member">
                <div className="github-profile">
                  <img 
                    src="https://github.com/tzuyu10.png" 
                    alt="Team Member 2 Profile" 
                    className="github-avatar"
                  />
                  <div className="github-info">
                    <h4>Elias Von Isaac R. Faeldonia</h4>
                    <a 
                      href="https://github.com/tzuyu10" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="github-link"
                    >
                      <span className="github-icon">⚡</span>
                      GitHub
                    </a>
                  </div>
                </div>
              </div>

              {/* Team Member 3 */}
              <div className="team-member">
                <div className="github-profile">
                  <img 
                    src="https://github.com/kndlcero.png" 
                    alt="Team Member 3 Profile" 
                    className="github-avatar"
                  />
                  <div className="github-info">
                    <h4>Ken Audie S. Lucero</h4>
                    <a 
                      href="https://github.com/kndlcero" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="github-link"
                    >
                      <span className="github-icon">⚡</span>
                      GitHub
                    </a>
                  </div>
                </div>
              </div>

              {/* Team Member 4 */}
              <div className="team-member">
                <div className="github-profile">
                  <img 
                    src="https://github.com/polopi08.png" 
                    alt="Team Member 4 Profile" 
                    className="github-avatar"
                  />
                  <div className="github-info">
                    <h4>John Paul T. Tamares</h4>
                    <a 
                      href="https://github.com/polopi08" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="github-link"
                    >
                      <span className="github-icon">⚡</span>
                      GitHub
                    </a>
                  </div>
                </div>
              </div>

              {/* Team Member 5 */}
              <div className="team-member">
                <div className="github-profile">
                  <img 
                    src="https://github.com/Richmond014.png" 
                    alt="Team Member 5 Profile" 
                    className="github-avatar"
                  />
                  <div className="github-info">
                    <h4>Michael Richmond V. Racelis</h4>
                    <a 
                      href="https://github.com/Richmond014" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="github-link"
                    >
                      <span className="github-icon">⚡</span>
                      GitHub
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="about-part">
          <h2>Contact Us</h2>
          <p className="about-text">
            Can't find the answer you're looking for? We'd love to help! Whether you have 
            questions, feedback, or need technical support, don't hesitate to reach out. 
            Our team is here to assist you.
          </p>
          <div className="contact-info">
            <p>Email: birthcertify_G9@gmail.com</p>
            <p>Phone: +63 9958363583 </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FAQ;