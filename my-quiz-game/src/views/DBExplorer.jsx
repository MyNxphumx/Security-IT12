import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/DBExplorer.css';

const DBExplorer = () => {
    const navigate = useNavigate();
    const [players, setPlayers] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const pRes = await fetch('http://localhost:3000/api/admin/players');
            const cRes = await fetch('http://localhost:3000/api/admin/challenges');
            setPlayers(await pRes.json());
            setChallenges(await cRes.json());
            setLoading(false);
        } catch (err) {
            console.error("Fetch Error:", err);
            setLoading(false);
        }
    };

    // ฟังก์ชันสำหรับ Mask ข้อมูลลับ (เหมือนใน PHP)
    const maskSensitive = (key, value) => {
        if (!value) return "NULL";
        const k = key.toLowerCase();
        if (k.includes('password') || k.includes('access_key')) {
            return <span className="secured-text">{String(value).substring(0, 10)}... [SECURED]</span>;
        }
        return String(value);
    };

    const DynamicTable = ({ title, data }) => (
        <div className="table-container">
            <h3>TABLE_VIEW: {title.toUpperCase()}</h3>
            {data.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            {Object.keys(data[0]).map(key => (
                                <th key={key}>{key.toUpperCase()}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i}>
                                {Object.entries(row).map(([key, val], idx) => (
                                    <td key={idx}>{maskSensitive(key, val)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="no-data">[ NO_DATA_AVAILABLE ]</div>
            )}
        </div>
    );

    return (
        <div className="explorer-body">
            <div className="header-area">
                <div>
                    <h1>ROOT_DATABASE_EXPLORER <span className="admin-badge">ADMIN_ONLY</span></h1>
                    <p className="access-log">ACCESS_LOG: SESSION_ACTIVE_V8.0</p>
                </div>
                <button onClick={() => navigate('/dashboard')} className="btn-back">
                    &lt; BACK_TO_CONSOLE
                </button>
            </div>

            <hr className="divider" />

            {loading ? (
                <div className="loading">INITIALIZING_QUERY...</div>
            ) : (
                <div className="content">
                    <DynamicTable title="players" data={players} />
                    <DynamicTable title="challenges" data={challenges} />
                </div>
            )}
        </div>
    );
};

export default DBExplorer;