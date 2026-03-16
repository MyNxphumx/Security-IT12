import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API } from "../config";
import "../css/Tournament.css"; 
import socket from "../socket";

const TournamentRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [player1, setPlayer1] = useState(null); 
  const [player2, setPlayer2] = useState(null); 
  const [isStarted, setIsStarted] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const [cooldowns, setCooldowns] = useState({});
  const [sentInvites, setSentInvites] = useState([]); 

  const [matchQuests, setMatchQuests] = useState([]); 
  const [currentStep, setCurrentStep] = useState(0); 
  const [challenge, setChallenge] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [queryDisplay, setQueryDisplay] = useState("");
  const [message, setMessage] = useState("");
  const [gameEnded, setGameEnded] = useState(false);
  const [winnerData, setWinnerData] = useState(null);
  const [time, setTime] = useState(0);
  const [isHost, setIsHost] = useState(false);

  const exitMission = async (user) => {
    socket.emit("leave_tournament", { roomId });
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return navigate("/login");
    setCurrentUser(user);

    const handleBrowserBack = () => {
      exitMission(user);
    };

    window.addEventListener("popstate", handleBrowserBack);

    return () => {
      exitMission(user);
      window.removeEventListener("popstate", handleBrowserBack);
      socket.off("room_sync");
      socket.off("countdown");
      socket.off("start_match");
      socket.off("tournament_update");
      socket.on("match_finished", (data) => {
        // data ควรมี { winnerId, p1Score, p2Score, ... } จาก Backend
        setWinnerData(data); 
        setGameEnded(true);
      });
      socket.on("opponent_left", () => {
        if (!gameEnded) { // 👈 ถ้าเกมยังไม่จบ ค่อยจัดการเรื่องคนออก
          if (isStarted) {
            setWinnerData({ winnerId: currentUser.id, reason: "OPPONENT_DISCONNECTED" });
            setGameEnded(true);
          } else {
            setPlayer2(null);
            setIsReady(false);
          }
        }
        // ถ้า gameEnded เป็น true แล้ว ไม่ต้องทำอะไร ปล่อยให้ Modal โชว์คะแนนค้างไว้แบบนั้น
      });
      socket.off("kicked");

    };
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    socket.emit("register_user", user.id);
    socket.emit("join_tournament", { roomId, user });
    fetchOnlinePlayers(user.id);

    socket.on("room_sync", (players) => {
      if (players.length >= 2) setSentInvites([]);
      const p1 = players.find(p => p.userId.toString() === user.id.toString());
      const p2 = players.find(p => p.userId.toString() !== user.id.toString());
      setPlayer1(p1 || null);
      setPlayer2(p2 || null);
      setIsHost(players[0]?.userId.toString() === user.id.toString());
    });

    socket.on("countdown", ({ count, matchSequence }) => {
      setCountdown(count);
      if (matchSequence) setMatchQuests(matchSequence);
    });

    socket.on("start_match", () => {
      setCountdown(null);
      setIsStarted(true);
      setTime(0);
    });

    socket.on("tournament_update", (data) => {
      if (data.userId.toString() !== user.id.toString()) {
        setPlayer2(prev => ({ ...prev, currentStep: data.currentStep, score: data.score }));
      }
    });

    socket.on("match_finished", (data) => {
      setWinnerData(data);
      setGameEnded(true);
    });

    socket.on("opponent_left", () => {
      if (isStarted && !gameEnded) {
        setWinnerData({ winnerId: user.id, reason: "OPPONENT_DISCONNECTED" });
        setGameEnded(true);
      } else {
        setPlayer2(null);
        setIsReady(false);
      }
    });

    socket.on("kicked", () => {
      alert("🚫 ACCESS_DENIED: คุณถูกลบออกจากห้องโดย Host");
      navigate("/dashboard");
    });

  }, [roomId, isStarted, gameEnded]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          if (next[id] > 0) next[id] -= 1;
          else delete next[id];
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval;
    if (isStarted && !gameEnded) {
      interval = setInterval(() => setTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isStarted, gameEnded]);

  useEffect(() => {
    if (isStarted && matchQuests[currentStep]) {
      const fetchQuest = async () => {
        const res = await fetch(`${API}/api/challenges/by-id/${matchQuests[currentStep]}`);
        const data = await res.json();
        setChallenge(data);
        setUsername(""); setPassword(""); setMessage("");
      };
      fetchQuest();
    }
  }, [isStarted, currentStep, matchQuests]);

  useEffect(() => {
    if (!challenge) return;
    let q = (challenge.query_template || "SELECT * FROM users WHERE username = '{ID}' AND password = '{KEY}'")
            .replace("{ID}", username).replace("{KEY}", password);
    setQueryDisplay(q);
  }, [username, password, challenge]);

  const handleCleanExit = async () => {
    await exitMission(currentUser);
    navigate("/dashboard");
  };

  const handleInvite = (targetId) => {
    if (cooldowns[targetId]) return;
    socket.emit("send_invite", { fromUser: currentUser, targetUserId: targetId, roomId });
    setCooldowns(prev => ({ ...prev, [targetId]: 3 }));
    if (!sentInvites.includes(targetId)) setSentInvites(prev => [...prev, targetId]);
  };

  const cancelInvite = (targetId) => {
    setSentInvites(prev => prev.filter(id => id !== targetId));
  };

  const handleKickPlayer = () => {
    if (window.confirm(`🚫 KICK_CONFIRMATION: ต้องการลบ ${player2.username} ออกจากห้องใช่หรือไม่?`)) {
      socket.emit("kick_player", { roomId, targetUserId: player2.userId });
      setPlayer2(null);
    }
  };

  const handleReady = () => {
    setIsReady(true);
    socket.emit("player_ready", { roomId, userId: currentUser.id });
  };

  const executeExploit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/execute-exploit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          displayStep: currentStep + 1,
          username, password,
          sessionScore: player1?.score || 0,
          isTournament: true,
          challengeId: matchQuests[currentStep]
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        const nextScore = (player1?.score || 0) + data.pointsGained;
        const nextStep = currentStep + 1;
        setPlayer1(prev => ({ ...prev, score: nextScore, currentStep: nextStep }));
        socket.emit("update_progress", { roomId, userId: currentUser.id, currentStep: nextStep, score: nextScore });
        if (nextStep < 10) setCurrentStep(nextStep);
        else socket.emit("finish_match", { roomId, userId: currentUser.id, totalTime: time, finalScore: nextScore });
      } else {
        setMessage("❌ ACCESS_DENIED: PAYLOAD_FAILED");
      }
    } catch (err) { setMessage("⚠️ CONNECTION_ERROR"); }
  };

  const fetchOnlinePlayers = async (myId) => {
    const targetId = myId || currentUser?.id;
    try {
        const response = await fetch(`${API}/api/players/online`);
        const result = await response.json();
        setOnlinePlayers(result.filter(p => p.id.toString() !== targetId.toString()));
    } catch (e) { console.error("FETCH_ONLINE_ERR", e); }
  };

return (
    <div className="tournament-container">
      {countdown !== null && (
        <div className="countdown-overlay"><h1 className="countdown-number">{countdown}</h1></div>
      )}

      {/* แก้ไขส่วน Navbar: เปลี่ยนจาก exit-link เป็น btn-abort-link ให้ตรงกับ CSS */}
      <nav className="status-bar">
        <div className="brand">TOURNAMENT_MODE://{roomId}</div>
        <div className="stats-group">
          <div id="timer-display">TIME: <span>{time}</span>s</div>
          <div className="phase">NODE: {isStarted ? `${currentStep + 1}/10` : "WAITING"}</div>
        </div>
        <button className="btn-abort-link" onClick={handleCleanExit}>[ ABORT_MISSION ]</button>
      </nav>

      <div className="match-grid">
        <div className={`player-panel ${isReady ? 'ready-glow' : ''}`}>
          <div className="player-tag">YOU: {currentUser?.username}</div>
          <div className="progress-bar-container">
            <div className="progress-fill" style={{ width: `${(currentStep / 10) * 100}%` }}></div>
          </div>
          <div className="score-val">{(player1?.score || 0).toLocaleString()} PTS</div>
        </div>

        <div className="vs-divider">VS</div>

        <div className={`player-panel remote ${player2?.isReady ? 'ready-glow-remote' : ''}`}>
          <div className="player-tag">TARGET: {player2?.username || "SCANNING..."}</div>
          <div className="progress-bar-container">
            <div className="progress-fill opponent" style={{ width: `${((player2?.currentStep || 0) / 10) * 100}%` }}></div>
          </div>
          <div className="score-val">{(player2?.score || 0).toLocaleString()} PTS</div>
          
          {player2 && !isStarted && isHost && (
            <button className="btn-kick-opponent" onClick={handleKickPlayer}>
              ✖ DISCONNECT_TARGET
            </button>
          )}
        </div>
      </div>

      <div className="game-zone">
        {!isStarted ? (
          <div className="pre-match-ui">
            {!player2 ? (
                <div className="invite-card">
                    <div className="card-header-fx">
                        <span>NETWORK_OPERATORS</span>
                        {/* เพิ่ม class ให้ปุ่ม REFRESH */}
                        <button onClick={() => fetchOnlinePlayers()} className="btn-refresh-scan">REFRESH</button>
                    </div>
                    <div className="target-list">
                        {onlinePlayers.length > 0 ? onlinePlayers.map(p => (
                            <div key={p.id} className="target-item">
                                <span className={sentInvites.includes(p.id) ? "text-invited" : ""}>
                                  {p.username} {sentInvites.includes(p.id) && "(PENDING)"}
                                </span>
                                <div className="action-btns">
                                  {/* แก้ไข class ปุ่ม INVITE */}
                                  <button 
                                    className={`btn-invite-action ${cooldowns[p.id] ? 'btn-disabled' : ''}`} 
                                    onClick={() => handleInvite(p.id)}
                                    disabled={cooldowns[p.id] > 0}
                                  >
                                    {cooldowns[p.id] ? `WAIT ${cooldowns[p.id]}s` : "INVITE"}
                                  </button>
                                  {sentInvites.includes(p.id) && (
                                    <button className="btn-remove-invite" onClick={() => cancelInvite(p.id)}>✖</button>
                                  )}
                                </div>
                            </div>
                        )) : <div className="no-targets">NO_TARGETS_FOUND</div>}
                    </div>
                </div>
            ) : (
                <button className="btn-ready-primary" onClick={handleReady} disabled={isReady}>
                    {isReady ? "WAITING_FOR_REMOTE_SYNC..." : "⚡ INITIATE_READY_SIGNAL"}
                </button>
            )}
          </div>
        ) : (
          /* ส่วน Battle Terminal */
          <div className="battle-terminal animate-in">
            <div className="hacker-king-area">
                <div className="speech-bubble">
                    <span className="king-label">[KING_SAYS]</span>
                    <p>{challenge?.description}</p>
                </div>
                <div className="hint-btns">
                    <button className="hint-btn unlocked" onClick={() => alert(`HINT_1: ${challenge?.hint_1}`)}>GET_HINT_1</button>
                    <button className="hint-btn unlocked" onClick={() => alert(`HINT_2: ${challenge?.hint_2}`)}>GET_HINT_2</button>
                </div>
            </div>

            <form onSubmit={executeExploit} className="game-card-form">
                <label className="input-label">INJECTION_IDENTIFIER</label>
                <input className="hacker-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Payload..." />
                <label className="input-label">ACCESS_KEY</label>
                <input className="hacker-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" />
                <button type="submit" className="btn-execute-main">EXECUTE_EXPLOIT()</button>
            </form>

            <div className="terminal log-terminal">
                <div className="log-header">SERVER_LOG: SQL_QUERY</div>
                <code className="query-text">{queryDisplay}</code>
            </div>
            {message && <div className={`terminal error-text`}>{message}</div>}
          </div>
        )}
      </div>

      {gameEnded && (
        <div className="hint-modal">
          <div className="hint-box result-card">
            <div className="hint-header">MISSION_COMPLETE</div>
            <div className="hint-content">
              {/* ✅ เช็คจาก winnerData ที่ส่งมาจาก Server เท่านั้น */}
              <h1 className={winnerData?.winnerId === currentUser?.id ? "text-victory" : "text-defeat"}>
                {winnerData?.winnerId === currentUser?.id ? "🏆 VICTORY" : "💀 DEFEAT"}
              </h1>
              
              <div className="final-stats">
                <p>YOUR_SCORE: {winnerData?.p1Score ?? player1?.score} PTS</p>
                <p>OPPONENT_SCORE: {winnerData?.p2Score ?? player2?.score} PTS</p>
              </div>

              {winnerData?.reason && <p className="text-small">REASON: {winnerData.reason}</p>}
            </div>
            <button onClick={handleCleanExit} className="btn-execute-main">RETURN_TO_DASHBOARD</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentRoom;