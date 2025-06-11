import React from "react";
import Navbar from "../components/Navbar";
import "../styles/Navbar.css";
import "../styles/Help.css"; // Import the Help CSS file
import Background from "../components/AnimatedBackground"

const FAQ = () => {
  return (
    <div className="about-container">
      <Navbar />
      <div className="about-content">
        <h1 className="about-title">Frequently Asked Questions</h1>
        
        <section className="about-part">
          <h2>Getting Started</h2>
          <div className="faq-item">
            <h3>How do I create an account?</h3>
            <p className="about-text">
              Creating an account is simple! Click the "Sign Up" button on our homepage, 
              fill in your details, and verify your email address. You'll be ready to 
              start using our platform in just a few minutes.
            </p>
          </div>
          <div className="faq-item">
            <h3>Is the platform free to use?</h3>
            <p className="about-text">
              We offer both free and premium plans. Our free plan includes access to 
              core features, while our premium plans unlock advanced functionality and 
              additional resources to help you get the most out of our platform.
            </p>
          </div>
        </section>

        <section className="about-part">
          <h2>Account & Security</h2>
          <div className="faq-item">
            <h3>How do I reset my password?</h3>
            <p className="about-text">
              If you've forgotten your password, click "Forgot Password" on the login page. 
              Enter your email address, and we'll send you a secure link to reset your password.
            </p>
          </div>
          <div className="faq-item">
            <h3>Is my data secure?</h3>
            <p className="about-text">
              Absolutely! We use industry-standard encryption and security measures to 
              protect your data. We never share your personal information with third parties 
              without your explicit consent.
            </p>
          </div>
        </section>

        <section className="about-part">
          <h2>Features & Functionality</h2>
          <div className="faq-item">
            <h3>What features are available?</h3>
            <p className="about-text">
              Our platform offers a comprehensive suite of tools designed to help you 
              achieve your goals. Features include dashboard analytics, collaboration tools, 
              automated workflows, and integrations with popular third-party services.
            </p>
          </div>
          <div className="faq-item">
            <h3>Can I integrate with other tools?</h3>
            <p className="about-text">
              Yes! We support integrations with many popular tools and services. Check our 
              integrations page for a full list, or contact our support team if you need 
              help setting up a specific integration.
            </p>
          </div>
        </section>

        <section className="about-part">
          <h2>Billing & Plans</h2>
          <div className="faq-item">
            <h3>How does billing work?</h3>
            <p className="about-text">
              Premium plans are billed monthly or annually. You can upgrade, downgrade, 
              or cancel your subscription at any time from your account settings. All 
              billing is processed securely through our payment partners.
            </p>
          </div>
          <div className="faq-item">
            <h3>Can I cancel my subscription?</h3>
            <p className="about-text">
              Yes, you can cancel your subscription at any time. Your access to premium 
              features will continue until the end of your current billing period, after 
              which you'll be moved to our free plan.
            </p>
          </div>
        </section>

        <section className="about-part">
          <h2>Troubleshooting</h2>
          <div className="faq-item">
            <h3>I'm experiencing technical issues. What should I do?</h3>
            <p className="about-text">
              First, try refreshing your browser or clearing your cache. If the problem 
              persists, check our status page for any known issues. For additional help, 
              contact our support team with details about the issue you're experiencing.
            </p>
          </div>
          <div className="faq-item">
            <h3>Why is the platform running slowly?</h3>
            <p className="about-text">
              Slow performance can be caused by various factors including internet connection, 
              browser issues, or high server load. Try using a different browser or device, 
              and ensure you have a stable internet connection.
            </p>
          </div>
        </section>

        <section className="about-part">
          <h2>Get In Touch</h2>
          <p className="about-text">
            Can't find the answer you're looking for? We'd love to help! Whether you have 
            questions, feedback, or need technical support, don't hesitate to reach out. 
            Our team is here to assist you.
          </p>
          <div className="contact-info">
            <p>Email: contact@yourcompany.com</p>
            <p>Phone: (555) 123-4567</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FAQ;