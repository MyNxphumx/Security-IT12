import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from "socket.io-client";
import '../css/DBExplorer.css';
import { API } from "../config";

const socket = io(API);

const DBExplorer = () => {
    const navigate = useNavigate();
    const [players, setPlayers] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false); // 🆕 เพิ่มสถานะตรวจสอบสิทธิ์

    useEffect(() => {
        // 🔒 [SECURITY CHECK] ตรวจสอบสิทธิ์ Admin ก่อนทำอย่างอื่น
        const userData = JSON.parse(localStorage.getItem('user')); // สมมติว่าเก็บไว้ในนี้
        
        if (!userData || userData.role !== 1) {
            console.error("🚫 ACCESS_DENIED: ADMIN_PRIVILEGES_REQUIRED");
            navigate('/dashboard'); // หรือ navigate('/') เพื่อให้ไปหน้า Login
            return;
        }

        setIsAuthorized(true); // ผ่านการตรวจสอบ
        fetchData(true);

        socket.on("update_data", () => {
            console.log("📡 DB_EXPLORER: SYNCING_WITH_SERVER...");
            fetchData(false);
        });

        return () => socket.off("update_data");
    }, [navigate]);

    const fetchData = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const pRes = await fetch(`${API}/api/admin/players`);
            const cRes = await fetch(`${API}/api/admin/challenges`);
            
            if (pRes.ok && cRes.ok) {
                setPlayers(await pRes.json());
                setChallenges(await cRes.json());
            }
        } catch (err) {
            console.error("📡 REALTIME_FETCH_ERROR:", err);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    // --- ส่วนตารางและฟังก์ชัน Mask เหมือนเดิมที่คุณทำไว้ ---
// --- ปรับปรุงฟังก์ชัน Mask และจำกัดความยาวข้อความ ---
const maskSensitive = (key, value) => {
    if (value === null || value === undefined) return "NULL";
    const k = key.toLowerCase();

    // 1. สถานะ Online/Offline (เหมือนเดิม)
    if (k === 'effectively_online' || k === 'is_online') {
        return value ? <span className="status-online">● ONLINE</span> : <span className="status-offline">○ OFFLINE</span>;
    }

    // 2. PASSWORD (เหมือนเดิม)
    if (k === 'password') {
        return <span className="secured-text">{String(value).substring(0, 8)}... [SECURED]</span>;
    }

    // 3. ✅ แสดงค่าทั้งหมดสำหรับ FLAG_VALUE และ TARGET_IDENTIFIER
    // เพิ่ม 'target_identifier' และ 'flag_value' ในเงื่อนไขนี้
    if (k === 'flag_value' || k === 'access_key' || k === 'target_identifier') {
        return <span className="full-text-display">{String(value)}</span>;
    }

    // 4. ส่วนที่ยังต้องการให้ตัดข้อความ (Truncate)
    const truncateFields = ['hint_1', 'hint_2', 'query_template', 'explanation', 'description', 'title'];
    if (truncateFields.includes(k)) {
        const maxLength = 30;
        const text = String(value);
        return text.length > maxLength ? (
            <span title={text}>{text.substring(0, maxLength)}...</span>
        ) : text;
    }

    if (k === 'last_seen' && value) return new Date(value).toLocaleTimeString();
    
    return String(value);
};

// --- ปรับปรุงส่วนการแสดงผล DynamicTable ---
// ภายในไฟล์ DBExplorer.js ส่วน DynamicTable
const DynamicTable = ({ title, data }) => {
    if (data.length === 0) return <div className="no-data">[ NO_DATA_STREAMING ]</div>;

    // --- จุดที่แก้ไข: กำหนด Headers สำหรับ MISSION_CHALLENGES ตามที่คุณต้องการ ---
    let headers;
    if (title === "mission_challenges") {
        headers = [
        "id", 
        "level_num", 
        "title", 
        "description", 
        "target_identifier", 
        "flag_value", // ✅ เปลี่ยนจาก access_key เป็น flag_value
        "base_points", 
        "category"
        ];
    } else {
        headers = Object.keys(data[0]);
    }

    return (
        <div className="table-container shadow-fx">
            <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>TABLE_VIEW: {title.toUpperCase()}</h3>
                <span className="live-indicator">LIVE_FEED</span>
            </div>
            <div className="scroll-wrapper">
                <table className="explorer-table">
                    <thead>
                        <tr>
                            {headers.map(key => (
                                        <th key={key}>
                                            {/* ✅ แสดงชื่อคอลัมน์เป็นตัวพิมพ์ใหญ่ตรงๆ ได้เลย */}
                                            {key.toUpperCase()}
                                        </th>
                                    ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i}>
                                {headers.map((key, idx) => (
                                    <td key={idx}>{maskSensitive(key, row[key])}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

    // 🛡️ ถ้ายังไม่ผ่านการตรวจสอบสิทธิ์ ไม่ต้องเรนเดอร์เนื้อหา
    if (!isAuthorized) return null;

    return (
        <div className="explorer-body">
            <div className="header-area">
                <div>
                    
                    <h1>ROOT_DATABASE_EXPLORER <span className="admin-badge">ADMIN_ONLY</span></h1>
                    <div className="monitor-status">
                    <span 
                    className="pulse-dot" 
                    style={{ display: "inline-block", marginLeft: "0px" }}
                    ></span>
                        <p className="access-log" style={{ display: "inline-block", marginLeft: "6px" }}>MONITORING_ACTIVE: REALTIME_SOCKET_STREAM</p>
                    </div>
                </div>
                <button onClick={() => navigate('/dashboard')} className="btn-back">
                    &lt; EXIT_EXPLORER
                </button>
            </div>

            <hr className="divider" />

            {loading ? (
                <div className="loading-screen">
                    <div className="spinner"></div>
                    <p>INITIALIZING_SECURE_CONNECTION...</p>
                </div>
            ) : (
                <div className="content">
                    <DynamicTable title="players_registry" data={players} />
                    <div style={{ height: '40px' }}></div>
                    <DynamicTable title="mission_challenges" data={challenges} />
                </div>
            )}
        </div>
    );
};

export default DBExplorer;