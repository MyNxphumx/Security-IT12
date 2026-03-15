import React, { useState } from 'react';
import "../css/Register.css";

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.username.length < 3) {
      setError("ERROR: INVALID_CODENAME_LENGTH");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("ERROR: ACCESS_PHRASE_MISMATCH");
      return;
    }

    setLoading(true);
    // Logic การส่งข้อมูล (API) ใส่ตรงนี้
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="auth-page-wrapper">
      {/* Background Gradient & CRT Effect */}
      <div className="cyber-bg"></div>
      <div className="scanlines"></div>

      <div className="terminal-card">
        {/* Decorative Corners - ทำให้ดูเหมือน UI ยุคอนาคต */}
        <div className="corner tl"></div>
        <div className="corner tr"></div>
        <div className="corner bl"></div>
        <div className="corner br"></div>

        {/* Header Section */}
        <div className="terminal-header">
          <h1 className="glitch-text" data-text="HACKER_KING">HACKER_KING</h1>
          <div className="terminal-status">
            <span className="blink-dot"></span>
            <span className="status-text">SECURE_AUTH_TERMINAL_V3.1</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-field">
            <label>IDENTIFIER_ID (CODENAME)</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter codename..."
              autoComplete="off"
              required
            />
          </div>

          <div className="input-field">
            <label>ENCRYPTED_KEY (PASSWORD)</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="input-field">
            <label>RE_VERIFY_KEY (CONFIRM)</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="neon-btn" disabled={loading}>
            <span className="btn-content">
              {loading ? "INITIALIZING..." : "INITIATE_CREATION()"}
            </span>
          </button>
        </form>

        {/* Error Messaging */}
        {error && (
          <div className="terminal-error">
            <span className="error-prefix">!! ERROR:</span> {error}
          </div>
        )}

        <div className="terminal-footer">
          <a href="/login" className="terminal-link">
            [ BACK_TO_AUTH_TERMINAL ]
          </a>
        </div>
      </div>
    </div>
  );
};

export default Register;