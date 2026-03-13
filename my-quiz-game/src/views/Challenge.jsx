import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../css/Challenge.css";

const API = "http://localhost:3000";

const Challenge = () => {

  const { level } = useParams();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState("");

  const [queryDisplay, setQueryDisplay] = useState("");

  const [time, setTime] = useState(
    parseInt(sessionStorage.getItem("hacker_timer")) || 0
  );

  const [hint1Unlocked, setHint1Unlocked] = useState(false);
  const [hint2Unlocked, setHint2Unlocked] = useState(false);

  const [hintDialog, setHintDialog] = useState({
    open: false,
    title: "",
    text: ""
  });

  const storedUser = JSON.parse(localStorage.getItem("user"));

  /* โหลด Challenge */

  useEffect(() => {

    if (!storedUser) {
      navigate("/login");
      return;
    }

    const fetchChallenge = async () => {

      const res = await fetch(
        `${API}/api/challenges/${level}?userId=${storedUser.id}`
      );

      if (res.status === 403) {
        alert("⛔ ACCESS_DENIED: ด่านนี้ยังไม่ถูกปลดล็อก!");
        navigate("/dashboard");
        return;
      }

      const data = await res.json();

      setChallenge(data);

    };

    fetchChallenge();

  }, [level, navigate]);

  /* TIMER SYSTEM */

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

  /* SQL PREVIEW */

  useEffect(() => {

    if (!challenge) return;

    let template =
      challenge.query_template ||
      "SELECT * FROM users WHERE username = '{ID}' AND password = '{KEY}'";

    let q = template
      .replace("{ID}", username)
      .replace("{KEY}", password);

    setQueryDisplay(q);

  }, [username, password, challenge]);

  /* EXECUTE EXPLOIT */

  const executeExploit = async (e) => {

    e.preventDefault();

    const res = await fetch(`${API}/api/execute-exploit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: storedUser.id,
        level: level,
        username: username,
        password: password,
        time_spent: time,
      }),
    });

    const data = await res.json();

    if (data.status === "success") {

      setMsgType("success-text");
      setMessage(data.message);

      sessionStorage.removeItem("hacker_timer");

      setTimeout(() => {
        navigate(`/challenge/${parseInt(level) + 1}`);
      }, 1500);

    } else {

      setMsgType("error-text");
      setMessage(data.message);

    }

  };

  if (!challenge)
    return <div className="loading">CONNECTING_TO_SATELLITE...</div>;

  return (

    <div className="game-body">

      {/* NAVBAR */}

      <nav className="navbar">

        <div className="brand">HACKER_KING://DB_BREACH</div>

        <div className="stats-bar">

          <div id="timer-display">
            TIME: <span>{time}</span>s
          </div>

          <div className="phase">
            PHASE_{String(level).padStart(2, "0")}
          </div>

        </div>

        <button
          className="exit-link"
          onClick={() => {
            sessionStorage.removeItem("hacker_timer");
            navigate("/dashboard");
          }}
        >
          [ EXIT ]
        </button>

      </nav>


      {/* MAIN */}

      <div className="container">

        {/* HACKER KING */}

        <div className="hacker-king-area">

          <div className="speech-bubble">

            <span>[KING_SAYS]</span>

            <p>{challenge.description}</p>

          </div>

          <img
            src="https://img.freepik.com/free-vector/colored-hacker-code-realistic-composition-with-person-creates-codes-hacking-stealing-information-vector-illustration_1284-18005.jpg"
            className="king-image"
          />

          {/* HINT BUTTONS */}

          <div className="hint-btns">

            <button
              className={`hint-btn ${hint1Unlocked ? "unlocked" : ""}`}
              onClick={() => {

                if (hint1Unlocked) {

                  setHintDialog({
                    open: true,
                    title: "HINT_1",
                    text: challenge.hint_1
                  });

                }

              }}
            >

              {hint1Unlocked
                ? "GET_HINT_1"
                : `HINT_1 (${30 - time}s)`}

            </button>

            <button
              className={`hint-btn ${hint2Unlocked ? "unlocked" : ""}`}
              onClick={() => {

                if (hint2Unlocked) {

                  setHintDialog({
                    open: true,
                    title: "HINT_2",
                    text: challenge.hint_2
                  });

                }

              }}
            >

              {hint2Unlocked
                ? "GET_HINT_2"
                : `HINT_2 (${180 - time}s)`}

            </button>

          </div>

        </div>


        {/* GAME CARD */}

        <div className="game-card">

          <div className="lvl-badge">
            MISSION_PHASE: #{level}
          </div>

          <h2>INJECT_PAYLOAD</h2>

          <form onSubmit={executeExploit}>

            <label>TARGET_IDENTIFIER</label>

            <input
              className="hacker-input"
              type="text"
              placeholder="Payload..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <label>ACCESS_KEY</label>

            <input
              className="hacker-input"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="submit"
              className="btn-execute"
            >
              EXECUTE_EXPLOIT()
            </button>

          </form>


          {/* MESSAGE */}

          {message && (

            <div className={`terminal ${msgType}`}>
              {message}
            </div>

          )}


          {/* SQL PREVIEW */}

          <div className="terminal log-terminal">

            <div className="log-header">
              SERVER_LOG: SQL_QUERY
            </div>

            <code>{queryDisplay}</code>

          </div>

        </div>

      </div>


      {/* HINT DIALOG */}

      {hintDialog.open && (

        <div className="hint-modal">

          <div className="hint-box">

            <div className="hint-header">
              {hintDialog.title}
            </div>

            <div className="hint-content">
              {hintDialog.text}
            </div>

            <button
              className="btn-close"
              onClick={() =>
                setHintDialog({
                  open: false,
                  title: "",
                  text: ""
                })
              }
            >
              CLOSE
            </button>

          </div>

        </div>

      )}

    </div>

  );

};

export default Challenge;