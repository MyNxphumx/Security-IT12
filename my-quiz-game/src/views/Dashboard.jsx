import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Dashboard.css";

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. ตรวจสอบการ Login จาก LocalStorage
    const storedUser = JSON.parse(localStorage.getItem("user"));
    
    if (!storedUser || !storedUser.id) {
      console.warn("Unauthorized access, redirecting to login...");
      navigate("/login");
      return;
    }

    // 2. ดึงข้อมูล Dashboard จาก API
    const fetchDashboardData = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/dashboard/${storedUser.id}`);
        
        if (!response.ok) {
          if (response.status === 404) throw new Error("USER_NOT_FOUND");
          throw new Error("SERVER_ERROR");
        }

        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  // หน้าจอตอนกำลังโหลด
  if (loading) {
    return (
      <div className="initializing-screen">
        <div className="loader-text">INITIALIZING_SYSTEM...</div>
        <div className="loader-bar"></div>
      </div>
    );
  }

  // หน้าจอเมื่อเกิด Error
  if (error || !data) {
    return (
      <div className="initializing-screen error-state">
        <div className="error-text">SYSTEM_FAILURE: {error || "DATA_LINK_BROKEN"}</div>
        <button className="btn-nav" onClick={() => window.location.reload()}>RETRY_CONNECTION</button>
      </div>
    );
  }

  const { player, totalLevels, challenges } = data;

  // คำนวณความคืบหน้า (Progress)
  const progressPct = Math.min(
    100,
    Math.round(((player.level_reached - 1) / totalLevels) * 100)
  );

  // ฟังก์ชัน Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="dashboard-body">
      {/* --- NAVIGATION BAR --- */}
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
            <p>ระบบตรวจพบช่องโหว่ในเลเยอร์ที่ 7... กรุณาเลือกเป้าหมายเพื่อเริ่มกระบวนการ Brute Force</p>
            
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

        {/* --- TARGET LIST (LEVELS) --- */}
        <h2 className="section-title">ACTIVE_TARGET_LIST</h2>
        <div className="level-grid">
          {challenges.map((row) => {
            const isUnlocked = row.level_num <= player.level_reached;
            const isCompleted = row.level_num < player.level_reached;
            const isCurrent = row.level_num === player.level_reached;

            // เลือก Emoji ตามประเภทด่าน
            let emoji = "📡";
            const titleLower = row.title.toLowerCase();
            if (titleLower.includes("string")) emoji = "💉";
            else if (titleLower.includes("numeric")) emoji = "🔢";
            else if (row.level_num >= 5) emoji = "💀";

            return (
              <div 
                key={row.id} 
                className={`level-card 
                  ${isUnlocked ? "unlocked" : "locked"} 
                  ${isCompleted ? "completed" : ""} 
                  ${isCurrent ? "current-target" : ""}`}
              >
                {!isUnlocked && (
                  <div className="locked-overlay">
                    <span className="lock-icon">🔒</span>
                    <div className="access-denied-text">ENCRYPTED_DATA</div>
                  </div>
                )}
                
                <span className="level-icon">{emoji}</span>
                <div className="level-name">{row.title}</div>
                <div className="level-desc">{row.description}</div>
                
                {isUnlocked && (
                  <button 
                    className="btn-enter" 
                      onClick={() => navigate(`/challenge/${row.level_num}`)}
                  >
                    {isCompleted ? "RE-RUN_EXPLOIT" : "EXECUTE_PAYLOAD"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;