import React, { useState } from 'react';
import '../styles/TermsOverlay.css';

const TermsOverlay = ({ 
  isVisible = true, 
  onAccept = () => console.log('Terms accepted'), 
  onDecline = () => console.log('Redirecting to landing page') 
}) => {
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    setIsScrolledToBottom(isAtBottom);
  };

  if (!isVisible) return null;

  return (
    <div className="terms-overlay">
      <div className="terms-modal">
        <div className="terms-header">
          <h2>Terms and Conditions</h2>
          <p className="terms-subtitle">Birth Certify Birth Certificate Request System</p>
        </div>
        
        <div className="terms-content" onScroll={handleScroll}>
          <div className="terms-text">
            <p className="welcome-text">
              Welcome to the Birth Certify Birth Certificate Request System (the "System"), an online platform designed to facilitate the request and processing of birth certificates. By accessing or using the System, you agree to be bound by these Terms and Conditions, our Privacy Policy, and all applicable laws and regulations in the Philippines. If you do not agree to these Terms and Conditions, you may not use the System.
            </p>

            <section>
              <h3>1. Acceptance of Terms</h3>
              <p>These Terms and Conditions constitute a legally binding agreement between you ("User," "you," or "your") and Group-9 ("We," "Us," or "Our"). Your use of the System signifies your irrevocable acceptance of these Terms and Conditions.</p>
            </section>

            <section>
              <h3>2. Eligibility</h3>
              <p>To use this System, you must be:</p>
              <ul>
                <li>At least eighteen (18) years of age; or</li>
                <li>A duly authorized representative acting on behalf of an eligible individual, with proper documentation to prove such authorization.</li>
                <li>Legally capable of entering into binding contracts.</li>
              </ul>
            </section>

            <section>
              <h3>3. Services Offered</h3>
              <p>The System provides an online platform for Users to:</p>
              <ul>
                <li>Submit requests for birth certificates (and potentially other related civil registry documents as made available).</li>
                <li>Provide necessary personal information and supporting documents for the request.</li>
                <li>Track the status of their requests.</li>
                <li>Make online payments for applicable fees (if integrated).</li>
              </ul>
            </section>

            <section>
              <h3>4. User Responsibilities</h3>
              <p>As a User of the System, you agree to:</p>
              <ul>
                <li><strong>Provide Accurate Information:</strong> You are solely responsible for ensuring the accuracy, completeness, and truthfulness of all information, data, and documents you submit through the System. Providing false, misleading, or inaccurate information may lead to the rejection of your request, legal penalties, and/or termination of your access to the System.</li>
                <li><strong>Secure Your Account:</strong> If the System requires account registration, you are responsible for maintaining the confidentiality of your account credentials (username and password) and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</li>
                <li><strong>Comply with Laws:</strong> You agree to use the System in compliance with all applicable local and national laws, rules, and regulations in the Philippines, particularly those pertaining to data privacy (like the Data Privacy Act of 2012), civil registration, and online transactions.</li>
                <li><strong>Cooperate with Verification:</strong> You agree to cooperate with any identity verification or document verification processes that we may deem necessary to process your request.</li>
                <li><strong>Payment of Fees:</strong> You agree to pay all applicable fees associated with your birth certificate request as outlined by the System and our official fee schedule. Payments are non-refundable unless otherwise specified by our refund policy.</li>
                <li><strong>Review and Confirm:</strong> Before submitting your request, you are responsible for reviewing all entered information and confirming its accuracy.</li>
              </ul>
            </section>

            <section>
              <h3>5. Data Privacy and Security</h3>
              <p>Our collection, use, storage, and protection of your personal information are governed by our Privacy Policy, which is incorporated by reference into these Terms and Conditions. By using the System, you consent to our data practices as described in the Privacy Policy. While we implement reasonable security measures, we cannot guarantee absolute security of your data transmitted through the internet.</p>
            </section>

            <section>
              <h3>6. Processing of Requests</h3>
              <ul>
                <li><strong>Processing Time:</strong> Processing times for birth certificate requests are estimates and may vary depending on various factors, including but not limited to, the completeness of your submission, volume of requests, and verification procedures. We are not liable for any delays in processing.</li>
                <li><strong>Verification:</strong> All requests are subject to verification by the relevant civil registry authorities. We reserve the right to reject any request that does not meet the requirements or that raises concerns regarding authenticity or legality.</li>
                <li><strong>Rejection of Requests:</strong> We reserve the right to reject any request for reasons including, but not limited to:
                  <ul>
                    <li>Incomplete or inaccurate information.</li>
                    <li>Insufficient or fraudulent supporting documents.</li>
                    <li>Failure to meet eligibility criteria.</li>
                    <li>Non-payment of fees.</li>
                    <li>Suspected fraudulent activity.</li>
                    <li>Inability to verify the information provided.</li>
                  </ul>
                </li>
                <li><strong>Delivery:</strong> The delivery of the requested birth certificate will be subject to the chosen delivery method and the policies of the relevant courier or postal service (if applicable). We are not responsible for delays or issues arising from third-party delivery services.</li>
              </ul>
            </section>

            <section>
              <h3>7. Fees and Payments</h3>
              <ul>
                <li><strong>Fee Schedule:</strong> All fees for birth certificate requests are clearly stated within the System. These fees are subject to change without prior notice, but any changes will apply only to requests submitted after the effective date of the change.</li>
                <li><strong>Payment Methods:</strong> The System supports various payment methods as indicated therein. You agree to adhere to the terms and conditions of the respective payment gateway or provider.</li>
                <li><strong>Refund Policy:</strong> All payments made through the System are generally non-refundable once the processing of your request has commenced, unless otherwise specified in our distinct Refund Policy.</li>
              </ul>
            </section>

            <section>
              <h3>8. Intellectual Property</h3>
              <p>All content, design, graphics, and other materials on the System, including but not limited to text, images, software, and underlying code, are the intellectual property of Group-9 or its licensors and are protected by applicable intellectual property laws. You may not reproduce, distribute, modify, create derivative works of, publicly display, or in any way exploit any of the content without our prior written consent.</p>
            </section>

            <section>
              <h3>9. Limitation of Liability</h3>
              <p>To the fullest extent permitted by law, Group-9, its officers, directors, employees, agents, and affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including but not limited to, damages for loss of profits, goodwill, data, or other intangible losses, resulting from:</p>
              <ul>
                <li>Your use or inability to use the System;</li>
                <li>The cost of procurement of substitute goods and services resulting from any goods, data, information, or services purchased or obtained or messages received or transactions entered into through or from the System;</li>
                <li>Unauthorized access to or alteration of your transmissions or data;</li>
                <li>Statements or conduct of any third party on the System; or</li>
                <li>Any other matter relating to the System.</li>
              </ul>
            </section>

            <section>
              <h3>10. Disclaimer of Warranties</h3>
              <p>The System is provided on an "as is" and "as available" basis, without any warranties of any kind, either express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that:</p>
              <ul>
                <li>The System will be uninterrupted, timely, secure, or error-free;</li>
                <li>The results that may be obtained from the use of the System will be accurate or reliable;</li>
                <li>The quality of any products, services, information, or other material purchased or obtained by you through the System will meet your expectations; or</li>
                <li>Any errors in the software will be corrected.</li>
              </ul>
            </section>

            <section>
              <h3>11. Indemnification</h3>
              <p>You agree to indemnify, defend, and hold harmless Group-9, its officers, directors, employees, agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising from your breach of these Terms and Conditions or your use of the System.</p>
            </section>

            <section>
              <h3>12. Modifications to Terms</h3>
              <p>We reserve the right, at our sole discretion, to modify or replace these Terms and Conditions at any time. If a revision is material, we will provide at least [Number] days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. Your continued use of the System after any such changes constitutes your acceptance of the new Terms and Conditions.</p>
            </section>

            <section>
              <h3>13. Termination</h3>
              <p>We may terminate or suspend your access to the System immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms and Conditions. Upon termination, your right to use the System will immediately cease.</p>
            </section>

            <section>
              <h3>14. Governing Law and Dispute Resolution</h3>
              <p>These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of the Philippines, without regard to its conflict of law principles. Any dispute, controversy, or claim arising out of or relating to these Terms and Conditions or your use of the System shall be resolved exclusively by the competent courts located in Quezon City, Metro Manila, Philippines.</p>
            </section>

            <section>
              <h3>15. Severability</h3>
              <p>If any provision of these Terms and Conditions is held to be invalid or unenforceable by a court of competent jurisdiction, the remaining provisions shall remain in full force and effect.</p>
            </section>

            <section>
              <h3>16. Entire Agreement</h3>
              <p>These Terms and Conditions, together with our Privacy Policy, constitute the entire agreement between you and Group-9 regarding your use of the System.</p>
            </section>
          </div>
        </div>

        <div className="terms-footer">
          <div className="scroll-indicator">
            {!isScrolledToBottom && (
              <p className="scroll-text">Please scroll down to read all terms and conditions</p>
            )}
          </div>
          <div className="terms-buttons">
            <button 
              className="btn-decline" 
              onClick={onDecline}
            >
              Decline & Return to Landing Page
            </button>
            <button 
              className="btn-accept" 
              onClick={onAccept}
              disabled={!isScrolledToBottom}
            >
              I Accept Terms & Conditions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOverlay;