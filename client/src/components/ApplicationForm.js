import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ApplicationForm.css';

const ApplicationForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cv: null
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      const fileType = file.type;
      if (fileType === 'application/pdf' || 
          fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setFormData({
          ...formData,
          cv: file
        });
        setFileError('');
      } else {
        setFileError('Please upload a PDF or DOCX file');
        e.target.value = null;
      }
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.cv) {
      newErrors.cv = 'CV document is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('cv', formData.cv);

      const response = await axios.post('https://job-application-processing-pipeline-3.onrender.com/api/applications/submit', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Application submitted:', response.data);

      navigate('/success', { state: { name: formData.name } });
    } catch (error) {
      console.error('Error submitting application:', error);
      setErrors({
        submit: error.response?.data?.error || 'Failed to submit application. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h1>Job Application</h1>
        
        <div className="hosting-notice">
          <p>
            ⚠️ Please note: This form is hosted on a free server. Submission may take some time while the server wakes up from sleep mode. 
            If the submission doesn't work, click 
             <a href="https://job-application-processing-pipeline-3.onrender.com/" target="_blank" rel="noopener noreferrer">here</a>  
            to wake up the server and try again.
          </p>
        </div>

        {errors.submit && (
          <div className="error-message">{errors.submit}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email address"
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
            />
            {errors.phone && <div className="field-error">{errors.phone}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="cv">Upload CV (PDF or DOCX)</label>
            <input
              type="file"
              id="cv"
              name="cv"
              accept=".pdf,.docx"
              onChange={handleFileChange}
            />
            {fileError && <div className="field-error">{fileError}</div>}
            {errors.cv && <div className="field-error">{errors.cv}</div>}
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Submitting... (This may take a moment)' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ApplicationForm;
