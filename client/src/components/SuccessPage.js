// client/src/components/SuccessPage.js
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import './SuccessPage.css';

const SuccessPage = () => {
  const location = useLocation();
  const { name } = location.state || { name: 'Candidate' };

  return (
    <div className="success-container">
      <div className="success-card">
        <div className="success-icon">✓</div>
        <h1>Application Submitted!</h1>
        <p>Thank you, {name}, for your application.</p>
        <p>We have received your CV and will review it shortly.</p>
        <p>You will receive a follow-up email tomorrow with more information.</p>
        <Link to="/" className="back-button">Submit Another Application</Link>
      </div>
    </div>
  );
};

export default SuccessPage;