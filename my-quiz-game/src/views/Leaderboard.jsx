import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Medal, ChevronLeft, Target, BarChart3 } from 'lucide-react';
import '../css/Leaderboard.css'; // เดี๋ยวเราจะสร้างไฟล์นี้กัน
import { API } from "../config";
const Leaderboard = () => {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // ดึงข้อมูลจาก API ตัวเดิมที่คุณมีใน server.js
                const res = await fetch(`${API}/api/admin/players`);
                if (!res.ok) throw new Error('FETCH_FAILED');
                
                const data = await res.json();
                
                // เรียงลำดับ: คะแนนมากสุดก่อน -> ถ้าคะแนนเท่ากัน ให้ดูด่านที่ไปถึง
                const sortedData = [...data].sort((a, b) => {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    return b.level_reached - a.level_reached;
                });

                setLeaders(sortedData.slice(0, 10)); // เอาแค่ 10 อันดับแรก
                setLoading(false);
            } catch (err) {
                console.error("Leaderboard Error:", err);
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const getRankIcon = (rank) => {
        if (rank === 0) return <Trophy size={20} className="gold" />;
        if (rank === 1) return <Medal size={20} className="silver" />;
        if (rank === 2) return <Medal size={20} className="bronze" />;
        return <span className="rank-number">{rank + 1}</span>;
    };

    if (loading) return <div className="loading">ACCESSING_HALL_OF_FAME...</div>;

    return (
        <div className="game-body leaderboard-bg">
            <nav className="navbar">
                <div className="brand">HACKER_KING://HALL_OF_FAME</div>
                <button className="exit-link" onClick={() => navigate('/dashboard')}>
                    [ EXIT_LEADERBOARD ]
                </button>
            </nav>

            <div className="container leaderboard-container">
                <div className="header-section">
                    <BarChart3 size={32} className="header-icon" />
                    <h1>TOP_10_OPERATORS</h1>
                    <p className="subtitle">รายชื่อแฮกเกอร์ระดับพระกาฬที่เจาะระบบสำเร็จสูงสุด</p>
                </div>

                <div className="table-wrapper">
                    <table className="rank-table">
                        <thead>
                            <tr>
                                <th>RANK</th>
                                <th>CODENAME</th>
                                <th><Target size={14} style={{marginRight: '5px'}}/>LEVEL</th>
                                <th>Max SCORE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaders.map((player, index) => (
                                <tr key={player.id} className={`rank-row rank-${index + 1}`}>
                                    <td>
                                        <div className="rank-badge-container">
                                            {getRankIcon(index)}
                                        </div>
                                    </td>
                                    <td className="codename">{player.username}</td>
                                    <td className="level-cell">
                                        PHASE_{ Math.max(0, player.level_reached - 1).toString().padStart(2, '0') }
                                    </td>
                                    <td className="score-cell">
                                        {player.score.toLocaleString()} <span className="unit">PTS</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <button className="btn-back" onClick={() => navigate('/dashboard')}>
                    <ChevronLeft size={16} /> RETURN_TO_DASHBOARD
                </button>
            </div>
        </div>
    );
};

export default Leaderboard;