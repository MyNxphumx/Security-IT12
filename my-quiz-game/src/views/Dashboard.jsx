import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "../css/Dashboard.css";
import { API } from "../config";

// เชื่อมต่อกับ Backend Socket
const socket = io(API);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const navigate = useNavigate();

  // ✅ ดึงคะแนนรอบปัจจุบันจาก LocalStorage
  const sessionScore = parseInt(localStorage.getItem("sessionScore")) || 0;

  const fetchDashboardData = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser || !storedUser.id) {
      navigate("/login");
      return;
    }

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

  useEffect(() => {
    fetchDashboardData();

    // ฟังคำสั่งจาก Server เมื่อมีการอัปเดตข้อมูล (Real-time Sync)
    socket.on("update_data", () => {
      console.log("📡 DASHBOARD_SYNC: Data updated via server.");
      fetchDashboardData();
    });

    return () => socket.off("update_data");
  }, [navigate]);

  if (loading) {
    return (
      <div className="initializing-screen">
        <div className="loader-text">INITIALIZING_SYSTEM...</div>
        <div className="loader-bar"></div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="error-screen">SYSTEM_FAILURE: {error}</div>;
  }

  const { player, totalLevels, challenges } = data;

  // คำนวณความคืบหน้า
  const currentStep = player.current_step || 0;
  const total = totalLevels || 30;
  const progressPct = Math.min(100, Math.round((currentStep / total) * 100)) || 0;

  // กรอง Category
  const categories = {
    Beginner: challenges?.filter((c) => c.category === "Beginner") || [],
    Intermediate: challenges?.filter((c) => c.category === "Intermediate") || [],
    Advanced: challenges?.filter((c) => c.category === "Advanced") || [],
  };

  const handleLogout = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser && storedUser.id) {
        await fetch(`${API}/api/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: storedUser.id }),
        });
      }
    } catch (err) {
      console.error("LOGOUT_ERROR:", err);
    } finally {
      localStorage.removeItem("user");
      localStorage.removeItem("sessionScore");
      navigate("/login");
    }
  };

  return (
    <div className="dashboard-body">
      {/* เอฟเฟกต์เส้นสแกนฉากหลัง */}
      <div className="scanner-line"></div>
      
      <nav className="navbar">
        <div className="brand">
          HACKER_KING://DB <span className="status-dot"></span>
        </div>
        <div className="nav-actions">
          {player && player.role === 1 && (
            <div className="admin-group" style={{ display: 'inline-block' }}>
              <button className="btn-nav" onClick={() => navigate("/admin")}>
                ROOT_CONSOLE
              </button>
              <button className="btn-nav" onClick={() => navigate("/db-explorer")}>
                DB_EXPLORER
              </button>
            </div>
          )}
          <button className="btn-nav" onClick={() => navigate("/leaderboard")}>
             RANKING
          </button>
          <button className="btn-nav btn-logout" onClick={handleLogout}>
            SHUTDOWN
          </button>
        </div>
      </nav>

      <div className="container">
        {/* --- HERO & STATS SECTION --- */}
        <div className="hero-grid">
          <div className="welcome-card shadow-fx">
            <div className="token-id">
              ID_PATH: {Math.random().toString(36).substring(7).toUpperCase()}
            </div>
            <h1>WELCOME_OPERATOR: {player.username}</h1>
            <p className="status-text">
              <span className="blink">●</span> SYSTEM_READY: <span className="text-active">LIVE_SYNC_ESTABLISHED</span>
            </p>

            <div className="progress-section">
              <div className="progress-info">
                <span>SYSTEM_BREACH_LEVEL</span>
                <span>{progressPct}%</span>
              </div>
              <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progressPct}%` }}></div>
              </div>
            </div>
          </div>

          <div className="stats-box shadow-fx">
            <div className="stat-item">
              <div className="stat-label">SESSION_SCORE</div>
              <div className="stat-val neon-text">{sessionScore.toLocaleString()}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">HIGH_SCORE</div>
              <div className="stat-val-small">{(player.score || 0).toLocaleString()}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">MISSION_CLEARED</div>
              <div className="stat-val-small">{currentStep} <span className="text-muted">/ {total}</span></div>
            </div>
          </div>
        </div>

        {/* --- TARGET SELECTION --- */}
        {!selectedCategory ? (
          <div className="category-selection-grid">
            <div className="cat-card beginner" onClick={() => setSelectedCategory("Beginner")}>
              <div className="cat-icon">🛡️</div>
              <h2>BEGINNER</h2>
              <p>Entry-level SQLi bypass techniques.</p>
              <div className="cat-footer">{categories.Beginner.length} NODES AVAILABLE</div>
            </div>
            
            <div className="cat-card intermediate" onClick={() => setSelectedCategory("Intermediate")}>
              <div className="cat-icon">⚔️</div>
              <h2>INTERMEDIATE</h2>
              <p>Cross-table data extraction & keys.</p>
              <div className="cat-footer">{categories.Intermediate.length} NODES AVAILABLE</div>
            </div>

            <div className="cat-card advanced" onClick={() => setSelectedCategory("Advanced")}>
              <div className="cat-icon">💀</div>
              <h2>ADVANCED</h2>
              <p>Blind & Error-based exploitation.</p>
              <div className="cat-footer">{categories.Advanced.length} NODES AVAILABLE</div>
            </div>
          </div>
        ) : (
          <div className="target-list-section animate-in">
            <div className="list-header">
              <button className="btn-back-main" onClick={() => setSelectedCategory(null)}>
                &lt; RETURN_TO_MENU
              </button>
              <h2 className="selected-cat-title">
                SECTOR: <span className="text-active">{selectedCategory.toUpperCase()}</span>
              </h2>
            </div>

            <div className="level-grid">
              {categories[selectedCategory].map((row) => (
                <div 
                  key={row.challenge_id} 
                  className={`level-node ${!row.is_locked ? "unlocked" : "locked"} ${row.is_completed ? "completed" : ""}`}
                >
                  <div className="node-header">
                    <span className="node-id">NODE_{row.display_level.toString().padStart(3, '0')}</span>
                    {row.is_completed && <span className="node-tag">COMPLETED</span>}
                  </div>
                  
                  {!row.is_locked ? (
                    <div className="node-body">
                      <h3 className="node-title">{row.title}</h3>
                      <p className="node-desc">{row.description}</p>
                      <button 
                        className="btn-execute" 
                        onClick={() => navigate(`/challenge/${row.display_level}`)}
                      >
                        {row.is_completed ? "RE-RUN_EXPLOIT" : "EXECUTE_PAYLOAD"}
                      </button>
                    </div>
                  ) : (
                    <div className="node-locked">
                      <div className="lock-icon">🔒</div>
                      <div className="lock-text">ACCESS_DENIED: ENCRYPTED</div>
                    </div>
                  )}
                </div>
              ))}
              {categories[selectedCategory].length === 0 && (
                <div className="no-data-msg">[ NO_TARGETS_FOUND_IN_THIS_SECTOR ]</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;