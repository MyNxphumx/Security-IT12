import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Dashboard.css";
import { API } from "../config";

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null); 
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser || !storedUser.id) {
      navigate("/login");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const response = await fetch(`${API}/api/dashboard/${storedUser.id}`);
        if (!response.ok) throw new Error("SERVER_ERROR");
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [navigate]);

  if (loading) return <div className="initializing-screen"><div className="loader-text">INITIALIZING_SYSTEM...</div><div className="loader-bar"></div></div>;
  if (error || !data) return <div className="error-screen">SYSTEM_FAILURE: {error}</div>;

  const { player, totalLevels, challenges } = data;

  // จัดกลุ่มโจทย์
  const categories = {
    Beginner: challenges.filter(c => c.category === 'Beginner'),
    Intermediate: challenges.filter(c => c.category === 'Intermediate'),
    Advanced: challenges.filter(c => c.category === 'Advanced')
  };

  const progressPct = Math.min(100, Math.round(((player.level_reached - 1) / totalLevels) * 100));

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="dashboard-body">
      {/* --- NAVIGATION BAR (คืนค่าปุ่มเดิมทั้งหมด) --- */}
      <nav className="navbar">
        <div className="brand">HACKER_KING://DB</div>
        <div className="nav-actions">
          {player.role === 1 && (
            <>
              <button className="btn-nav btn-admin" onClick={() => navigate("/admin")}>
                [ ROOT_CONSOLE ]
              </button>
              <button className="btn-nav btn-explorer" onClick={() => navigate("/db-explorer")}>
                [ DB_EXPLORER ]
              </button>
            </>
          )}
          <button className="btn-nav btn-academy" onClick={() => navigate("/handbook")}>
            [ HANDBOOK ]
          </button>
          <button className="btn-nav btn-ranking" onClick={() => navigate("/leaderboard")}>
            [ RANKING ]
          </button>
          <button className="btn-nav btn-logout" onClick={handleLogout}>
            SHUTDOWN
          </button>
        </div>
      </nav>

      <div className="container">
        {/* --- HERO SECTION --- */}
        <div className="hero-grid">
          <div className="welcome-card">
            <div className="token-id">
              SESSION_TOKEN: {Math.random().toString(36).substring(7).toUpperCase()}
            </div>
            <h1>WELCOME_OPERATOR: {player.username}</h1>
            <p>ระบบตรวจพบช่องโหว่... กรุณาเลือกระดับเป้าหมายเพื่อเริ่มกระบวนการ</p>
            
            <div className="progress-wrapper">
              <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="progress-text">BREACH_PROGRESS: {progressPct}%</div>
            </div>
          </div>

          <div className="stats-box">
            <div className="stat-item">
              <div className="stat-label">CURRENT_SCORE</div>
              <div className="stat-val">{(player.score || 0).toLocaleString()}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">MISSION_CLEARED</div>
              <div className="stat-val">{player.level_reached - 1} / {totalLevels}</div>
            </div>
          </div>
        </div>

        <hr className="divider" />

        {/* --- TARGET SELECTION --- */}
        {!selectedCategory ? (
          <>
            <div className="category-selection-grid">
              <div className="cat-card beginner" onClick={() => setSelectedCategory('Beginner')}>
                <div className="cat-icon">🛡️</div>
                <h2>LEVEL: BEGINNER</h2>
                <p>พื้นฐานการทำ SQL Injection Bypass</p>
                <div className="cat-footer">{categories.Beginner.length} TARGETS</div>
              </div>
              <div className="cat-card intermediate" onClick={() => setSelectedCategory('Intermediate')}>
                <div className="cat-icon">⚔️</div>
                <h2>LEVEL: INTERMEDIATE</h2>
                <p>การดึงข้อมูลข้ามตารางและค้นหาคีย์ลับ</p>
                <div className="cat-footer">{categories.Intermediate.length} TARGETS</div>
              </div>
              <div className="cat-card advanced" onClick={() => setSelectedCategory('Advanced')}>
                <div className="cat-icon">💀</div>
                <h2>LEVEL: ADVANCED</h2>
                <p>เทคนิคขั้นสูง Blind และ Error-based</p>
                <div className="cat-footer">{categories.Advanced.length} TARGETS</div>
              </div>
            </div>
          </>
        ) : (
          <div className="target-list-section">
            <div className="list-header">
              <button className="btn-back" onClick={() => setSelectedCategory(null)}>
                [ ← BACK_TO_LEVELS ]
              </button>
            </div>
            
            <div className="level-grid">
              {categories[selectedCategory].map((row) => {
                const isUnlocked = row.level_num <= player.level_reached;
                const isCompleted = row.level_num < player.level_reached;
                return (
                  <div key={row.id} className={`level-card ${isUnlocked ? "unlocked" : "locked"} ${isCompleted ? "completed" : ""}`}>
                    {!isUnlocked && <div className="locked-overlay">🔒</div>}
                    <div className="level-name">#{row.level_num} {row.title}</div>
                    <div className="level-desc">{row.description}</div>
                    {isUnlocked && (
                      <button className="btn-enter" onClick={() => navigate(`/challenge/${row.level_num}`)}>
                        {isCompleted ? "RE-RUN_EXPLOIT" : "EXECUTE_PAYLOAD"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;