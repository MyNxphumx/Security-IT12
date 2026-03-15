import React, { useState } from 'react';
import './Login.css';
import { API } from "../../config";

const Login = () => {

    const [credentials, setCredentials] = useState({
        username: '',
        password: ''
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (response.ok) {
                // 🔍 DEBUG: ตรวจสอบว่า Backend ส่ง role มาจริงไหม
                console.log("LOGIN_SUCCESS: DATA_RECEIVED ->", data.user);

                // ✅ 1. บันทึกข้อมูล user ทั้งหมด (รวม role และ id)
                localStorage.setItem('user', JSON.stringify(data.user));

                // ✅ 2. รีเซ็ตคะแนนรอบปัจจุบันให้เป็น 0
                localStorage.setItem('sessionScore', '0');

                // ✅ 3. ล้าง Timer เก่า
                sessionStorage.removeItem("hacker_timer");

                // ✅ 4. นำทางไป Dashboard
                window.location.href = '/dashboard';
            } else {
                setError(data.error || 'AUTH_FAILURE: ACCESS_DENIED');
            }
        } catch (err) {
            console.error("LOGIN_ERROR:", err);
            setError('NETWORK_ERROR: SERVER_NOT_REACHABLE');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="corner top-left"></div>
            <div className="corner bottom-right"></div>

            <div className="header-area">
                <div className="logo-text">HACKER_KING</div>
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

                <button
                    type="submit"
                    className="btn-login"
                    disabled={loading}
                >
                    {loading ? 'PROCESSING...' : 'INITIATE_AUTH()'}
                </button>
            </form>

            {error && (
                <div className="error-box">
                    {`> ${error}`}
                </div>
            )}

            <div className="footer-links">
                <a href="/Register">[ CREATE_NEW_OPERATOR ]</a>
            </div>
        </div>
    );
};

export default Login;