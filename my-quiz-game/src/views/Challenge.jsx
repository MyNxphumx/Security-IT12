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

  // ✅ ระบบ Timer
  const [time, setTime] = useState(
    parseInt(sessionStorage.getItem("hacker_timer")) || 0
  );

  // ✅ ระบบคะแนน Session (ดึงจาก localStorage มาใช้บวกต่อ)
  const [sessionScore, setSessionScore] = useState(
    parseInt(localStorage.getItem("sessionScore")) || 0
  );

  const [hint1Unlocked, setHint1Unlocked] = useState(false);
  const [hint2Unlocked, setHint2Unlocked] = useState(false);

  const [hintDialog, setHintDialog] = useState({
    open: false,
    title: "",
    text: "",
  });

  const [resultDialog, setResultDialog] = useState({
    open: false,
    query: "",
    data: [],
  });

  const storedUser = JSON.parse(localStorage.getItem("user"));

  /* 1. โหลด Challenge */
  useEffect(() => {
    // ล้างค่าเมื่อเปลี่ยนด่าน
    setMessage("");
    setMsgType("");
    setUsername("");
    setPassword("");

    const fetchChallenge = async () => {
      try {
        const res = await fetch(
          `${API}/api/challenges/${level}?userId=${storedUser.id}`
        );

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
    let template =
      challenge.query_template ||
      "SELECT * FROM users WHERE username = '{ID}' AND password = '{KEY}'";
    let q = template.replace("{ID}", username).replace("{KEY}", password);
    setQueryDisplay(q);
  }, [username, password, challenge]);

  /* 4. EXECUTE EXPLOIT */
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
          sessionScore: sessionScore, // ✅ ส่งคะแนนสะสมของรอบนี้ไป
          time_spent: time,
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        setMsgType("success-text");
        setMessage(data.message);
        setResultDialog({
          open: true,
          query: queryDisplay,
          data: data.data || [],
        });

        // ✅ อัปเดตคะแนนใน State และ LocalStorage เมื่อตอบถูก
        const newScore = data.newSessionScore;
        setSessionScore(newScore);
        localStorage.setItem("sessionScore", newScore);

        // ✅ อัปเดตข้อมูล User ใน LocalStorage เพื่อให้ Dashboard เห็นค่าใหม่
        const updatedUser = { ...storedUser, current_step: data.nextLevel - 1 };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        socket.emit("player_cleared", { 
                userId: storedUser.id, 
                username: storedUser.username,
                level: level 
            });
      } else {
        setMsgType("error-text");
        setMessage(data.message || "ACCESS_DENIED");
      }
    } catch (err) {
      setMsgType("error-text");
      setMessage("CONNECTION_LOST_SATELLITE_OFFLINE");
    }
  };

  if (!challenge) return <div className="loading">CONNECTING_TO_SATELLITE...</div>;

  return (
    <div className="game-body">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="brand">HACKER_KING://DB_BREACH</div>
        <div className="stats-bar">
          <div id="timer-display">TIME: <span>{time}</span>s</div>
          <div id="score-display">SCORE: <span>{sessionScore}</span></div> {/* ✅ แสดงคะแนนรอบปัจจุบัน */}
          <div className="phase">PHASE_{String(level).padStart(2, "0")}</div>
        </div>
        <button className="exit-link" onClick={() => navigate("/dashboard")}>[ EXIT ]</button>
      </nav>

      <div className="container">
        {/* HACKER KING AREA */}
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

        {/* GAME CARD */}
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

      {/* MODALS (Hint & Result) - โค้ดส่วนนี้เหมือนเดิมของคุณ */}
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
          <div className="hint-box" style={{ width: "600px" }}>
            <div className="hint-header">DATABASE BREACHED</div>
            <div className="hint-content">
              <p><b>EXECUTED QUERY</b></p>
              <code>{resultDialog.query}</code>
              <p style={{ marginTop: "15px" }}><b>DATA EXTRACTED</b></p>
              {resultDialog.data.length > 0 ? (
                <div style={{overflowX: 'auto'}}>
                  <table>
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
              ) : <p>ACCESS GRANTED</p>}
            </div>
            <button className="btn-execute" onClick={() => {
              const nextLevel = parseInt(level) + 1;
              setResultDialog({ open: false, query: "", data: [] });
              if (nextLevel > 30) {
                navigate("/dashboard");
              } else {
                setTime(0);
                sessionStorage.removeItem("hacker_timer");
                navigate(`/challenge/${nextLevel}`);
              }
            }}>NEXT_PHASE()</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Challenge;