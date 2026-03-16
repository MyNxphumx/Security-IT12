import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // เพิ่มตัวเปลี่ยนหน้า
import "../css/Register.css";
import { API } from "../config"; // มั่นใจว่ามีไฟล์ config ที่เก็บ URL server ไว้

const Register = () => {
  const navigate = useNavigate();
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
    
    // Client-side Validation
    if (formData.username.length < 3) {
      setError("ERROR: INVALID_CODENAME_LENGTH (MIN 3)");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("ERROR: ACCESS_PHRASE_MISMATCH");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // สมัครสำเร็จ
        alert("✅ ACCESS_GRANTED: สร้างบัญชีสำเร็จแล้ว บัญชาการได้!");
        navigate("/login");
      } else {
        // ดัก Error จาก Backend เช่น ชื่อซ้ำ
        setError(data.error || "SYSTEM_FAILURE");
      }
    } catch (err) {
      setError("CONNECTION_LOST: ไม่สามารถติดต่อดาวเทียมได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="cyber-bg"></div>
      <div className="scanlines"></div>

      <div className="terminal-card">
        <div className="corner tl"></div>
        <div className="corner tr"></div>
        <div className="corner bl"></div>
        <div className="corner br"></div>

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

        {error && (
          <div className="terminal-error">
            <span className="error-prefix">!! ERROR:</span> {error}
          </div>
        )}

        <div className="terminal-footer">
          <button onClick={() => navigate("/login")} className="terminal-link" style={{background: 'none', border: 'none', cursor: 'pointer'}}>
            [ BACK_TO_AUTH_TERMINAL ]
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;