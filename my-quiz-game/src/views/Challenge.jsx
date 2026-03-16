import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../css/Challenge.css";
import { API } from "../config";
import { io } from "socket.io-client";

const socket = io(API);

const Challenge = () => {
  const { level } = useParams();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState("");
  const [queryDisplay, setQueryDisplay] = useState("");

  // ✅ ระบบ Streak และ Hidden Quest
  const [streak, setStreak] = useState(parseInt(localStorage.getItem("streak")) || 0);
  const [specialQuest, setSpecialQuest] = useState(null);
  const [showSpecialOffer, setShowSpecialOffer] = useState(false);
  const [showSpecialChallenge, setShowSpecialChallenge] = useState(false);
  const [specialUser, setSpecialUser] = useState("");
  const [specialPass, setSpecialPass] = useState("");

  // ✅ ระบบ Timer
  const [time, setTime] = useState(parseInt(sessionStorage.getItem("hacker_timer")) || 0);

  // ✅ ระบบคะแนน Session
  const [sessionScore, setSessionScore] = useState(parseInt(localStorage.getItem("sessionScore")) || 0);

  const [hint1Unlocked, setHint1Unlocked] = useState(false);
  const [hint2Unlocked, setHint2Unlocked] = useState(false);

  const [hintDialog, setHintDialog] = useState({ open: false, title: "", text: "" });
  const [resultDialog, setResultDialog] = useState({ open: false, query: "", data: [] });

  const storedUser = JSON.parse(localStorage.getItem("user"));

  /* 1. โหลด Challenge */
  useEffect(() => {
    setMessage("");
    setMsgType("");
    setUsername("");
    setPassword("");

    const fetchChallenge = async () => {
      try {
        const res = await fetch(`${API}/api/challenges/${level}?userId=${storedUser.id}`);
        if (res.status === 403) {
          alert("⛔ ACCESS_DENIED: ด่านนี้ยังไม่ถูกปลดล็อก!");
          navigate("/dashboard");
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          setMsgType("error-text");
          setMessage("SERVER_ERROR: " + (data.error || "UNKNOWN"));
          return;
        }
        setChallenge(data);
      } catch (err) {
        console.error("FETCH_ERROR:", err);
      }
    };
    fetchChallenge();
  }, [level, navigate, storedUser.id]);

  /* 2. TIMER SYSTEM */
  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        const t = prev + 1;
        sessionStorage.setItem("hacker_timer", t);
        if (t >= 30) setHint1Unlocked(true);
        if (t >= 180) setHint2Unlocked(true);
        return t;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /* 3. SQL PREVIEW */
  useEffect(() => {
    if (!challenge) return;
    let template = challenge.query_template || "SELECT * FROM users WHERE username = '{ID}' AND password = '{KEY}'";
    let q = template.replace("{ID}", username).replace("{KEY}", password);
    setQueryDisplay(q);
  }, [username, password, challenge]);

  /* --- 4. ฟังก์ชันดึงโจทย์พิเศษ (Trigger Special Quest) --- */
  const triggerSpecialQuest = async (targetCategory) => {
    try {
      const res = await fetch(`${API}/api/admin/challenges`);
      const all = await res.json();
      const pool = all.filter(c => c.category === targetCategory);
      if (pool.length > 0) {
        setSpecialQuest(pool[Math.floor(Math.random() * pool.length)]);
        setShowSpecialOffer(true);
      }
    } catch (e) {
      console.error("SPECIAL_FETCH_ERROR:", e);
    }
  };

  /* 5. EXECUTE EXPLOIT (ด่านปกติ) */
  const executeExploit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/execute-exploit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: storedUser.id,
          displayStep: level,
          username: username,
          password: password,
          sessionScore: sessionScore,
          time_spent: time,
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        setMsgType("success-text");
        setMessage(data.message);
        setResultDialog({ open: true, query: queryDisplay, data: data.data || [] });

        const newScore = data.newSessionScore;
        setSessionScore(newScore);
        localStorage.setItem("sessionScore", newScore);

        const updatedUser = { ...storedUser, current_step: data.nextLevel - 1 };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        socket.emit("player_cleared", { userId: storedUser.id, username: storedUser.username, level: level });

        // ✅ ลอจิก Streak
        const newStreak = streak + 1;
        setStreak(newStreak);
        localStorage.setItem("streak", newStreak);

        if (newStreak >= 6) {
          if (challenge.category === "Beginner") triggerSpecialQuest("Intermediate");
          else if (challenge.category === "Intermediate") triggerSpecialQuest("Advanced");
          setStreak(0); // Reset streak หลังปลดล็อกโบนัส
          localStorage.setItem("streak", 0);
        }
      } else {
        setMsgType("error-text");
        setMessage(data.message || "ACCESS_DENIED");
        setStreak(0); // ตอบผิด Reset streak
        localStorage.setItem("streak", 0);
      }
    } catch (err) {
      setMsgType("error-text");
      setMessage("CONNECTION_LOST_SATELLITE_OFFLINE");
    }
  };

  /* 6. SUBMIT SPECIAL EXPLOIT (ด่านพิเศษ) */
  const handleSpecialSubmit = async () => {
    try {
      const res = await fetch(`${API}/api/execute-exploit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: storedUser.id,
          username: specialUser,
          password: specialPass,
          sessionScore: sessionScore,
          challengeId: specialQuest.id // ส่ง ID ด่านพิเศษไป
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        alert(`🔥 BREACH_SUCCESS! ได้รับคะแนนโบนัส ${data.pointsGained} แต้ม`);
        setSessionScore(data.newSessionScore);
        localStorage.setItem("sessionScore", data.newSessionScore);
        setShowSpecialChallenge(false);
        setSpecialQuest(null);
        setSpecialUser("");
        setSpecialPass("");
      } else {
        alert("❌ EXPLOIT_FAILED: Payload ไม่ถูกต้อง");
      }
    } catch (e) {
      alert("CONNECTION_ERROR");
    }
  };

  if (!challenge) return <div className="loading">CONNECTING_TO_SATELLITE...</div>;

  return (
    <div className="game-body">
      <nav className="navbar">
        <div className="brand">HACKER_KING://DB_BREACH</div>
        <div className="stats-bar">
          <div id="timer-display">TIME: <span>{time}</span>s</div>
          <div id="score-display">SCORE: <span>{sessionScore}</span></div>
          <div className="phase">PHASE_{String(level).padStart(2, "0")}</div>
        </div>
        <button className="exit-link" onClick={() => navigate("/dashboard")}>[ EXIT ]</button>
      </nav>

      <div className="container">
        <div className="hacker-king-area">
          <div className="speech-bubble">
            <span>[KING_SAYS]</span>
            <p>{challenge.description}</p>
          </div>
          <img src="https://img.freepik.com/free-vector/colored-hacker-code-realistic-composition-with-person-creates-codes-hacking-stealing-information-vector-illustration_1284-18005.jpg" className="king-image" alt="Hacker King" />
          <div className="hint-btns">
            <button className={`hint-btn ${hint1Unlocked ? "unlocked" : ""}`} onClick={() => hint1Unlocked && setHintDialog({ open: true, title: "HINT_1", text: challenge.hint_1 })}>
              {hint1Unlocked ? "GET_HINT_1" : `HINT_1 (${Math.max(0, 30 - time)}s)`}
            </button>
            <button className={`hint-btn ${hint2Unlocked ? "unlocked" : ""}`} onClick={() => hint2Unlocked && setHintDialog({ open: true, title: "HINT_2", text: challenge.hint_2 })}>
              {hint2Unlocked ? "GET_HINT_2" : `HINT_2 (${Math.max(0, 180 - time)}s)`}
            </button>
          </div>
        </div>

        <div className="game-card">
          <div className="lvl-badge">MISSION_PHASE: #{level}</div>
          <h2>INJECT_PAYLOAD</h2>
          <form onSubmit={executeExploit}>
            <label>TARGET_IDENTIFIER</label>
            <input className="hacker-input" type="text" placeholder="Payload..." value={username} onChange={(e) => setUsername(e.target.value)} />
            <label>ACCESS_KEY</label>
            <input className="hacker-input" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit" className="btn-execute">EXECUTE_EXPLOIT()</button>
          </form>
          {message && <div className={`terminal ${msgType}`}>{message}</div>}
          <div className="terminal log-terminal">
            <div className="log-header">SERVER_LOG: SQL_QUERY</div>
            <code>{queryDisplay}</code>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      {hintDialog.open && (
        <div className="hint-modal">
          <div className="hint-box">
            <div className="hint-header">{hintDialog.title}</div>
            <div className="hint-content">{hintDialog.text}</div>
            <button className="btn-close" onClick={() => setHintDialog({ ...hintDialog, open: false })}>CLOSE</button>
          </div>
        </div>
      )}

      {resultDialog.open && (
        <div className="hint-modal">
          <div className="hint-box" style={{ width: "600px", maxHeight: "80vh", overflowY: "auto" }}>
            <div className="hint-header">DATABASE BREACHED</div>
            <div className="hint-content">
              <div className="explanation-section" style={{ marginBottom: "20px", padding: "10px", background: "rgba(0, 255, 0, 0.1)", borderLeft: "4px solid #00ff00" }}>
                <p style={{ color: "#00ff00", fontWeight: "bold", marginBottom: "5px" }}>[ANALYSIS_REPORT]</p>
                <p>{challenge?.explanation || "No explanation provided."}</p>
              </div>
              <p><b>EXECUTED QUERY</b></p>
              <code style={{ display: "block", marginBottom: "15px" }}>{resultDialog.query}</code>
              <p><b>DATA EXTRACTED</b></p>
              {resultDialog.data.length > 0 ? (
                <div style={{ overflowX: 'auto', marginTop: "10px" }}>
                  <table className="result-table">
                    <thead>
                      <tr>{Object.keys(resultDialog.data[0]).map(k => <th key={k}>{k}</th>)}</tr>
                    </thead>
                    <tbody>
                      {resultDialog.data.map((row, i) => (
                        <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{v}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="success-text">ACCESS GRANTED: Payload successful.</p>}
            </div>
            <button className="btn-execute" onClick={() => {
              const nextLevel = parseInt(level) + 1;
              setResultDialog({ open: false, query: "", data: [] });
              if (nextLevel > 30) navigate("/dashboard");
              else { setTime(0); sessionStorage.removeItem("hacker_timer"); navigate(`/challenge/${nextLevel}`); }
            }}>NEXT_PHASE()</button>
          </div>
        </div>
      )}

      {/* --- HIDDEN QUEST: OFFER --- */}
      {/* 1. Modal ถามความสมัครใจ (สีม่วง - Special Offer) */}
{showSpecialOffer && (
  <div className="hint-modal">
    {/* เพิ่ม class special-offer-box */}
    <div className="hint-box special-offer-box">
      {/* ใช้ class special-header-purple เพื่อให้หัวข้อเต็มขอบและเป็นสีม่วง */}
      <div className="special-header-purple">⚠️ ANOMALY_DETECTED</div>
      
      <div className="hint-content">
        <p style={{ color: "var(--primary)", fontWeight: "bold", marginBottom: "10px" }}>
          [HIGH_LEVEL_SIGNAL_FOUND]
        </p>
        <p>ตรวจพบช่องโหว่ระดับ <b>{specialQuest?.category}</b> ในเครือข่ายสำรอง!</p>
        <p>ต้องการดำเนินการเจาะระบบ (High Reward) หรือไม่?</p>
        <p style={{ color: "var(--primary)", marginTop: "10px" }}>
          * รางวัลโบนัส: <b>{specialQuest?.base_points}</b> แต้ม
        </p>
      </div>

      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <button className="btn-execute" onClick={() => { setShowSpecialOffer(false); setShowSpecialChallenge(true); }}>
          ACCEPT_MISSION
        </button>
        {/* ใช้ btn-abort เพื่อสีที่ดูซอฟต์ลงสำหรับปุ่มยกเลิก */}
        <button className="btn-abort" onClick={() => setShowSpecialOffer(false)}>
          IGNORE
        </button>
      </div>
    </div>
  </div>
)}

  {/* --- 2. HIDDEN QUEST: CHALLENGE (สีฟ้า - Special Challenge) --- */}
  {showSpecialChallenge && specialQuest && (
    <div className="hint-modal">
      {/* เพิ่ม class special-challenge-box และปรับ width */}
      <div className="hint-box special-challenge-box" style={{ width: "500px" }}>
        {/* ใช้ class special-header-cyan สำหรับหัวข้อสีฟ้าตัดดำ */}
        <div className="special-header-cyan">SPECIAL_EXPLOIT: {specialQuest.title}</div>
        
        <div className="hint-content">
          <p style={{ fontSize: "14px", borderBottom: "1px solid #334155", paddingBottom: "10px", color: "#fff" }}>
            {specialQuest.description}
          </p>
          
          {/* ใช้โครงสร้าง special-auth-area เพื่อจัดระเบียบช่อง Input */}
          <div className="special-auth-area" style={{ marginTop: "15px" }}>
            <label style={{ display: "block", color: "var(--secondary)", fontSize: "11px", marginBottom: "5px" }}>
              TARGET_IDENTIFIER
            </label>
            <input 
              className="hacker-input" 
              value={specialUser} 
              onChange={(e) => setSpecialUser(e.target.value)} 
              placeholder="Username..." 
            />
            
            <label style={{ display: "block", color: "var(--secondary)", fontSize: "11px", marginBottom: "5px" }}>
              ACCESS_KEY
            </label>
            <input 
              className="hacker-input" 
              type="password" 
              value={specialPass} 
              onChange={(e) => setSpecialPass(e.target.value)} 
              placeholder="Password..." 
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          {/* ปรับสีปุ่ม Execute ให้เข้ากับธีมสีฟ้า */}
          <button 
            className="btn-execute" 
            onClick={handleSpecialSubmit} 
            style={{ borderColor: "var(--secondary)", color: "var(--secondary)" }}
          >
            SUBMIT_PAYLOAD
          </button>
          <button className="btn-abort" onClick={() => setShowSpecialChallenge(false)}>
            ABORT
          </button>
        </div>
      </div>
    </div>
  )}
    </div>
  );
};

export default Challenge;