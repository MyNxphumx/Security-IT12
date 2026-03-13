import React, { useState } from 'react';
import './Login.css';

const Login = () => {
    // State สำหรับเก็บค่าจาก Input
    const [credentials, setCredentials] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ฟังก์ชันจัดการการเปลี่ยนแปลงใน Input
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // ฟังก์ชันส่งข้อมูลไป Backend (Node.js)
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (response.ok) {
                // เก็บข้อมูล User และ Token (ถ้ามี) ลงใน Storage
                localStorage.setItem('user', JSON.stringify(data.user));
                // ย้ายหน้าไป Dashboard
                window.location.href = '/dashboard';
            } else {
                // ดึง Error Message ตามที่เราตั้งไว้ใน Node.js
                setError(data.error || 'AUTH_FAILURE: ACCESS_DENIED');
            }
        } catch (err) {
            setError('SYSTEM_FAILURE: DATABASE_CONNECTION_LOST');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* ตกแต่งมุมกรอบสไตล์ Hacker */}
            <div className="corner top-left"></div>
            <div className="corner bottom-right"></div>

            <div className="header-area">
                <div className="logo-text">HACKER_KING</div>
                <div className="subtitle">Secure_Auth_Terminal_v3.0</div>
            </div>

            <form onSubmit={handleLogin}>
                <div className="input-group">
                    <label>IDENTIFIER_ID</label>
                    <input 
                        type="text" 
                        name="username"
                        value={credentials.username}
                        onChange={handleChange}
                        autoComplete="username"
                        required 
                    />
                </div>
                <div className="input-group">
                    <label>ENCRYPTED_KEY</label>
                    <input 
                        type="password" 
                        name="password"
                        value={credentials.password}
                        onChange={handleChange}
                        autoComplete="current-password"
                        required 
                    />
                </div>
                
                <button type="submit" className="btn-login" disabled={loading}>
                    {loading ? 'PROCESSING...' : 'INITIATE_AUTH()'}
                </button>
            </form>

            {/* แสดง Error Box ถ้ามีข้อผิดพลาด (Logic เดียวกับ PHP) */}
            {error && (
                <div className="error-box">
                    {`> ${error}`}
                </div>
            )}

            <div className="footer-links">
                <a href="/register">[ CREATE_NEW_OPERATOR ]</a>
            </div>
        </div>
    );
};

export default Login;