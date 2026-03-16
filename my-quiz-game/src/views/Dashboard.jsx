import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Dashboard.css";
import { API } from "../config";
import socket from "../socket";

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState(null);

  const navigate = useNavigate();
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

  const fetchOnlinePlayers = async () => {
    try {
      const response = await fetch(`${API}/api/players/online`);
      if (response.ok) {
        const result = await response.json();
        setOnlinePlayers(result);
      }
    } catch (err) {
      console.error("ONLINE_FETCH_ERROR:", err);
    }
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    
    if (storedUser && storedUser.id) {
      // ลงทะเบียน Socket และให้ Server อัปเดต Online ใน DB
      socket.emit("register_user", storedUser.id);
    }

    fetchDashboardData();
    fetchOnlinePlayers();

    socket.on("update_data", () => {
      fetchDashboardData();
      fetchOnlinePlayers();
    });

    socket.on("receive_invite", (data) => {
      if (data.roomId) {
        setInviteData(data);
        setShowInvite(true);
      }
    });

    return () => {
      socket.off("update_data");
      socket.off("receive_invite");
    };
  }, [navigate]);

  const handleAcceptInvite = () => {
    if (inviteData && inviteData.roomId) {
      setShowInvite(false);
      navigate(`/TournamentRoom/${inviteData.roomId}`);
    }
  };

  const handleDeclineInvite = () => {
    setShowInvite(false);
    setInviteData(null);
  };

  // ✅ ปรับปรุงส่วน Logout ให้ใช้ Socket แทน API
  const handleLogout = () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    
    if (storedUser && storedUser.id) {
      // 1. ส่ง Event บอก Server ให้เซ็ต Offline ใน Database ทันที
      socket.emit("logout_event", storedUser.id);
    }

    // 2. ปิดการเชื่อมต่อ Socket (Event disconnect ใน Server จะทำงานซ้ำอีกชั้นเพื่อความชัวร์)
    socket.disconnect(); 
    
    // 3. ทำความสะอาดข้อมูลในเครื่อง
    localStorage.removeItem("user");
    localStorage.removeItem("sessionScore");
    localStorage.clear(); // เคลียร์ทั้งหมดเพื่อความปลอดภัย
    
    // 4. ย้ายหน้าไป Login
    navigate("/login");
    
    // 5. สั่งเชื่อมต่อ socket ใหม่เตรียมไว้สำหรับการ Login ครั้งหน้า (หลังจาก Delay เล็กน้อย)
    setTimeout(() => {
      socket.connect();
    }, 500);
  };

if (loading) {
  return (
    <div className="initializing-screen">
      <div className="loader-text">INITIALIZING_SYSTEM</div>
      <div className="loader-bar-container">
        <div className="loader-bar"></div>
      </div>
    </div>
  );
}

  if (error || !data) {
    return <div className="error-screen">SYSTEM_FAILURE: {error}</div>;
  }

  const { player, totalLevels, challenges } = data;
  const currentStep = player.current_step || 0;
  const total = totalLevels || 30;
  const progressPct = Math.min(100, Math.round((currentStep / total) * 100)) || 0;

  const categories = {
    Beginner: challenges?.filter((c) => c.category === "Beginner") || [],
    Intermediate: challenges?.filter((c) => c.category === "Intermediate") || [],
    Advanced: challenges?.filter((c) => c.category === "Advanced") || [],
  };

  return (
    <div className="dashboard-body">
      <div className="scanner-line"></div>

      {showInvite && (
        <div className="invite-overlay animate-in">
          <div className="invite-dialog shadow-fx">
            <div className="dialog-header">
              <span className="blink">🚨</span> INCOMING_BREACH_SIGNAL
            </div>
            <div className="dialog-content">
              <p>ตรวจพบการท้าดวลจากผู้เล่น:</p>
              <h2 className="challenger-name">OPERATOR::{inviteData?.fromUser?.username}</h2>
              <p className="room-id-text">Target Sector: {inviteData?.roomId}</p>
            </div>
            <div className="dialog-actions">
              <button className="btn-dialog-decline" onClick={handleDeclineInvite}>IGNORE</button>
              <button className="btn-dialog-accept" onClick={handleAcceptInvite}>ACCEPT_BREACH</button>
            </div>
          </div>
        </div>
      )}

      <div className="online-panel shadow-fx">
        <div className="panel-header">
          <span className="blink">●</span> LIVE_OPERATORS [{onlinePlayers.length}]
        </div>
        <div className="online-list">
          {onlinePlayers.map((p, index) => (
            <div key={index} className="online-user">
              <span className="user-prefix">----</span> {p.username}
            </div>
          ))}
          {onlinePlayers.length === 0 && <div className="text-muted">SCANNING...</div>}
        </div>
      </div>
      
      <nav className="navbar">
        <div className="brand">
          HACKER_KING://DB <span className="status-dot"></span>
        </div>
        <div className="nav-actions">
          <button className="btn-nav btn-tournament-nav" onClick={() => {
              const user = JSON.parse(localStorage.getItem("user"));
              const myRoomId = `ROOM_${user.id}`;
              navigate(`/TournamentRoom/${myRoomId}`);
          }}>
              <span className="blink">⚔️</span> TOURNAMENT
          </button>
          
          {player && player.role === 1 && (
          <div className="admin-group">
              <button className="btn-nav" onClick={() => navigate("/admin")}>ROOT_CONSOLE</button>
              <button className="btn-nav" onClick={() => navigate("/db-explorer")}>DB_EXPLORER</button>
            </div>
          )}
          
          <button className="btn-nav" onClick={() => navigate("/leaderboard")}>RANKING</button>
          <button className="btn-nav btn-logout" onClick={handleLogout}>SHUTDOWN</button>
        </div>
      </nav>

      <div className="container">
        <div className="hero-grid">
          <div className="welcome-card shadow-fx">
            <div className="token-id">ID_PATH: {Math.random().toString(36).substring(7).toUpperCase()}</div>
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
          </div>
        </div>

        {!selectedCategory ? (
          <>
            <div className="category-selection-grid">
              <div className="cat-card beginner" onClick={() => setSelectedCategory("Beginner")}>
                <div className="cat-icon">🛡️</div>
                <h2>BEGINNER</h2>
                <div className="cat-footer">{categories.Beginner.length} NODES</div>
              </div>
              <div className="cat-card intermediate" onClick={() => setSelectedCategory("Intermediate")}>
                <div className="cat-icon">⚔️</div>
                <h2>INTERMEDIATE</h2>
                <div className="cat-footer">{categories.Intermediate.length} NODES</div>
              </div>
              <div className="cat-card advanced" onClick={() => setSelectedCategory("Advanced")}>
                <div className="cat-icon">💀</div>
                <h2>ADVANCED</h2>
                <div className="cat-footer">{categories.Advanced.length} NODES</div>
              </div>
            </div>

            <div className="tournament-card-container animate-in">
                <div className="tournament-hero-card shadow-fx" onClick={() => {
                    const user = JSON.parse(localStorage.getItem("user"));
                    const myRoomId = `ROOM_${user.id || 'DEFAULT'}`; 
                    navigate(`/TournamentRoom/${myRoomId}`);
                }}>
                <div className="tournament-overlay"></div>
                <div className="card-content">
                  <div className="badge-match">LIVE_BATTLE_AVAILABLE</div>
                  <h2>⚔️ TOURNAMENT_SECTOR</h2>
                  <p>CHALLENGE OTHER OPERATORS IN REAL-TIME BREACH COMPETITION</p>
                  <div className="btn-enter-tournament">ENTER_LOBBY // AUTH_REQUIRED</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="target-list-section animate-in">
            <div className="list-header">
              <button className="btn-back-main" onClick={() => setSelectedCategory(null)}>&lt; RETURN_TO_MENU</button>
              <h2 className="selected-cat-title">SECTOR: <span className="text-active">{selectedCategory.toUpperCase()}</span></h2>
            </div>
            <div className="level-grid">
               {categories[selectedCategory].map((row) => (
                  <div key={row.challenge_id} className={`level-node ${!row.is_locked ? "unlocked" : "locked"} ${row.is_completed ? "completed" : ""}`}>
                     <div className="node-header">
                        <span className="node-id">NODE_{row.display_level.toString().padStart(3, '0')}</span>
                        {row.is_completed && <span className="node-tag">CLEARED</span>}
                     </div>
                     {!row.is_locked ? (
                        <div className="node-body">
                           <h3 className="node-title">{row.title}</h3>
                           <button className="btn-execute" onClick={() => navigate(`/challenge/${row.display_level}`)}>EXECUTE</button>
                        </div>
                     ) : (
                        <div className="node-locked">🔒 LOCKED</div>
                     )}
                  </div>
               ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;