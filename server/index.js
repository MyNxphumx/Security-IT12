const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http'); // 🆕 เพิ่ม http
const { Server } = require("socket.io"); // 🆕 เพิ่ม socket.io
require('dotenv').config();

const app = express();
const server = http.createServer(app); // 🆕 สร้าง server ด้วย http

// ✅ ตั้งค่า Socket.io พร้อมเปิด CORS
const io = new Server(server, {
  cors: {
    origin: "*", // ปรับเป็น URL ของ Frontend คุณเมื่อ Deploy จริง
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err) => {
  if (err) console.error('❌ DATABASE_CONNECTION_ERROR:', err.message);
  else console.log('✅ DATABASE_CONNECTED_SUCCESSFULLY');
});

// --- [SOCKET.IO LOGIC] ---
io.on("connection", (socket) => {
  console.log(`📡 New Satellite Connected: ${socket.id}`);

  // รับสัญญาณเมื่อผู้เล่นผ่านด่าน
  socket.on("player_cleared", (data) => {
    console.log(`🏆 Player ${data.username} cleared Phase ${data.level}`);
    io.emit("update_data"); // กระจายเสียงให้ทุกคนโหลด Leaderboard/Dashboard ใหม่
  });

  // รับสัญญาณเมื่อแอดมินอัปเดตระบบ
  socket.on("admin_update", () => {
    console.log("🛠 Admin synchronised system settings");
    io.emit("update_data"); 
  });

  socket.on("disconnect", () => {
    console.log(`🛰 Satellite Disconnected: ${socket.id}`);
  });
});

// --- [HELPERS] ---
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// --- [AUTH API] ---

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM players WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'INVALID_IDENTIFIER' });

        let user = result.rows[0];
        const compatibleHash = user.password.replace(/^\$2y\$/, '$2a$');
        const isMatch = await bcrypt.compare(password, compatibleHash);

        if (!isMatch) return res.status(401).json({ error: 'INVALID_ENCRYPTED_KEY' });

        await pool.query('UPDATE players SET is_online = true, last_seen = NOW() WHERE id = $1', [user.id]);

        const allChallenges = await pool.query('SELECT id, category FROM challenges');
        const rows = allChallenges.rows;
        const beginnerIds = rows.filter(c => c.category === 'Beginner').map(c => c.id);
        const intermediateIds = rows.filter(c => c.category === 'Intermediate').map(c => c.id);
        const advancedIds = rows.filter(c => c.category === 'Advanced').map(c => c.id);

        const finalSequence = [...shuffleArray(beginnerIds), ...shuffleArray(intermediateIds), ...shuffleArray(advancedIds)];

        await pool.query('UPDATE players SET shuffled_sequence = $1, current_step = 0 WHERE id = $2', [finalSequence, user.id]);

        io.emit("update_data"); // แจ้งเตือนแอดมินว่ามีคนออนไลน์

        res.json({
            message: 'AUTH_SUCCESS',
            user: { id: user.id, username: user.username, role: user.role, highScore: user.score, currentScore: 0, currentStep: 0 }
        });
    } catch (err) {
        res.status(500).json({ error: 'SYSTEM_FAILURE' });
    }
});

app.post('/api/logout', async (req, res) => {
    const { userId } = req.body;
    try {
        await pool.query('UPDATE players SET is_online = false WHERE id = $1', [userId]);
        io.emit("update_data");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'LOGOUT_FAILURE' });
    }
});

// --- [USER API] ---

app.get('/api/dashboard/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE players SET last_seen = NOW(), is_online = true WHERE id = $1', [id]);
    const playerRes = await pool.query('SELECT * FROM players WHERE id = $1', [id]);
    if (playerRes.rows.length === 0) return res.status(404).json({ error: 'PLAYER_NOT_FOUND' });
    const player = playerRes.rows[0];

    const challengesRes = await pool.query('SELECT id, title, category, description FROM challenges');
    const allChallenges = challengesRes.rows;

    let sequence = player.shuffled_sequence;
    if (!sequence || sequence.length === 0) {
        sequence = allChallenges.map(c => c.id).sort(() => Math.random() - 0.5);
        await pool.query('UPDATE players SET shuffled_sequence = $1 WHERE id = $2', [sequence, id]);
    }

    const dashboardChallenges = sequence.map((challengeId, index) => {
      const challengeInfo = allChallenges.find(c => c.id === challengeId);
      return {
        display_level: index + 1,
        challenge_id: challengeId,
        title: challengeInfo ? challengeInfo.title : `Challenge ${index + 1}`,
        description: challengeInfo ? challengeInfo.description : '',
        category: challengeInfo ? challengeInfo.category : 'N/A',
        is_locked: index > player.current_step,
        is_completed: index < player.current_step
      };
    });

    res.json({ player: { username: player.username, score: player.score, role: player.role, current_step: player.current_step }, challenges: dashboardChallenges, totalLevels: 30 });
  } catch (err) {
    res.status(500).send('SERVER_ERROR');
  }
});

app.get('/api/challenges/:display_level', async (req, res) => {
    const { display_level } = req.params;
    const { userId } = req.query;
    try {
        const player = await pool.query('SELECT shuffled_sequence, current_step FROM players WHERE id = $1', [userId]);
        const { shuffled_sequence, current_step } = player.rows[0];
        const realChallengeId = shuffled_sequence[parseInt(display_level) - 1];
        const challenge = await pool.query('SELECT * FROM challenges WHERE id = $1', [realChallengeId]);
        res.json({ ...challenge.rows[0], display_level });
    } catch (err) {
        res.status(500).json({ error: "SERVER_ERROR" });
    }
});

app.post('/api/execute-exploit', async (req, res) => {
  const { userId, displayStep, username, password, sessionScore } = req.body; 
  try {
    const stepIndex = parseInt(displayStep) - 1;
    const playerRes = await pool.query('SELECT shuffled_sequence, current_step FROM players WHERE id = $1', [userId]);
    const { shuffled_sequence, current_step } = playerRes.rows[0];
    const challengeRes = await pool.query('SELECT * FROM challenges WHERE id = $1', [shuffled_sequence[stepIndex]]);
    const challenge = challengeRes.rows[0];

    let finalQuery = (challenge.query_template || "SELECT * FROM users WHERE username = '{ID}' AND password = '{KEY}'")
                     .replace('{ID}', username || "").replace('{KEY}', password || "");
    const dbResult = await pool.query(finalQuery);

    let isSuccess = (challenge.category === 'Beginner') ? dbResult.rows.length > 0 : (password && password.trim() === challenge.access_key);

    if (isSuccess) {
      const newScore = sessionScore + (challenge.base_points || 100);
      await pool.query(
        `UPDATE players SET score = GREATEST(score, $1), current_step = CASE WHEN $2 = current_step THEN current_step + 1 ELSE current_step END, last_seen = NOW() WHERE id = $3`,
        [newScore, stepIndex, userId]
      );
      
      
      // ✅ ส่ง Socket แจ้งเตือนทุกคนเมื่อมีคนผ่านด่าน
      io.emit("update_data"); 
      
      res.json({ status: "success", pointsGained: challenge.base_points || 100, newSessionScore: newScore, nextLevel: parseInt(displayStep) + 1 });
    } else {
      res.status(401).json({ status: "fail", message: "INCORRECT", data: dbResult.rows });
    }
  } catch (err) {
    res.status(500).json({ error: 'SYSTEM_FAILURE' });
  }
});

// --- [ADMIN API] ---

app.get('/api/admin/players', async (req, res) => {
    try {

        const sql = `
        SELECT 
            id,
            username,
            role,
            score,
            level_reached,
            current_step,
            current_streak,
            is_online,
            last_seen,
            (is_online = true AND last_seen > NOW() - INTERVAL '5 minutes') AS effectively_online
        FROM players
        ORDER BY role DESC, id ASC`;

        const result = await pool.query(sql);

        res.json(result.rows);

    } catch (err) {

        res.status(500).json({ error: 'SERVER_ERROR' });

    }
});

app.post('/api/admin/players/update', async (req, res) => {
    const { user_id, new_username, new_password, new_role, new_score } = req.body;
    try {
        if (new_password && new_password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(new_password, salt);
            await pool.query(
                'UPDATE players SET username=$1, password=$2, role=$3, score=$4 WHERE id=$5',
                [new_username, hashedPassword, new_role, new_score, user_id]
            );
        } else {
            await pool.query(
                'UPDATE players SET username=$1, role=$2, score=$3 WHERE id=$4',
                [new_username, new_role, new_score, user_id]
            );
        }
        
        io.emit("update_data"); // ✅ แจ้งให้ผู้เล่นเห็นข้อมูลตัวเอง/อันดับที่เปลี่ยนทันที
        res.json({ success: true, message: 'PLAYER_UPDATED' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'UPDATE_FAILED' });
    }
});

app.post('/api/admin/players/action', async (req, res) => {
    const { action, id } = req.body;
    if (action === 'reset') await pool.query('UPDATE players SET score = 0, current_step = 0 WHERE id = $1', [id]);
    else if (action === 'ban') await pool.query('DELETE FROM players WHERE id = $1', [id]);
    else if (action === 'make_admin') await pool.query('UPDATE players SET role = 1 WHERE id = $1', [id]);
    
    io.emit("update_data"); // ✅ อัปเดตข้อมูลแบบ real-time
    res.json({ success: true });
});

app.get('/api/admin/challenges', async (req, res) => {
    const result = await pool.query('SELECT * FROM challenges ORDER BY level_num ASC');
    res.json(result.rows);
});

app.post('/api/admin/challenges/upsert', async (req, res) => {
    const { level_num, title, description, sql_logic, target_identifier, access_key, hint_1, hint_2 } = req.body;
    const sql = `
        INSERT INTO challenges (level_num, title, description, sql_logic, target_identifier, access_key, hint_1, hint_2)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (level_num) DO UPDATE SET
        title = EXCLUDED.title, description = EXCLUDED.description, sql_logic = EXCLUDED.sql_logic,
        target_identifier = EXCLUDED.target_identifier, access_key = EXCLUDED.access_key,
        hint_1 = EXCLUDED.hint_1, hint_2 = EXCLUDED.hint_2`;
    await pool.query(sql, [level_num, title, description, sql_logic, target_identifier, access_key, hint_1, hint_2]);
    
    io.emit("update_data"); // ✅ เมื่อแก้โจทย์ ให้หน้า Dashboard ของผู้เล่นเปลี่ยนทันที
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
// ✅ สำคัญ: ต้องใช้ server.listen แทน app.listen
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 REAL-TIME_SERVER_RUNNING_ON_PORT_${PORT}`);
});