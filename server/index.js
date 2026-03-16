const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require("socket.io");
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
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

// --- [STATE MANAGEMENT] ---
const userSockets = new Map(); 
const activeMatches = new Map();

// --- [HELPERS] ---
const syncRoomPlayers = (roomId) => {
  const clients = io.sockets.adapter.rooms.get(roomId);
  const players = [];
  if (clients) {
    const clientIds = Array.from(clients);
    clientIds.forEach((clientId) => {
      const clientSocket = io.sockets.sockets.get(clientId);
      if (clientSocket && clientSocket.playerData) {
        players.push(clientSocket.playerData);
      }
    });
  }
  io.to(roomId).emit("room_sync", players);
  return players;
};

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// --- [SOCKET.IO LOGIC] ---
io.on("connection", (socket) => {
  console.log(`📡 New Satellite Connected: ${socket.id}`);

  socket.on("register_user", async (userId) => {
    if (userId) {
      const uid = userId.toString();
      userSockets.set(uid, socket.id);
      socket.userId = uid;
      socket.join(`user_${uid}`);
      
      // อัปเดตสถานะเป็น Online ทันทีเมื่อ Register ผ่าน Socket
      try {
        await pool.query('UPDATE players SET is_online = true, last_seen = NOW() WHERE id = $1', [uid]);
        io.emit("update_data"); 
        console.log(`👤 USER_ONLINE: ${uid} via Socket`);
      } catch (err) { console.error("SOCKET_REGISTER_DB_ERROR", err); }
    }
  });

  // ✅ แก้ไขส่วน Logout: ใช้ Socket Event แทน API
  socket.on("logout_event", async (userId) => {
    if (userId) {
        try {
            await pool.query('UPDATE players SET is_online = false, last_seen = NOW() WHERE id = $1', [userId]);
            userSockets.delete(userId.toString());
            io.emit("update_data");
            console.log(`🔌 USER_LOGOUT_EVENT: ${userId}`);
        } catch (err) { console.error("LOGOUT_EVENT_ERROR", err); }
    }
  });

  socket.on("send_invite", (data) => {
      const { fromUser, targetUserId, roomId } = data;
      const targetSocketId = userSockets.get(targetUserId.toString());
      if (targetSocketId) {
          io.to(targetSocketId).emit("receive_invite", { fromUser, roomId });
      }
  });

  socket.on("join_tournament", ({ roomId, user }) => {
    socket.join(roomId);
    socket.currentRoom = roomId;
    socket.userId = user.id.toString();
    socket.playerData = {
      userId: user.id,
      username: user.username,
      currentStep: 0,
      score: 0,
      isReady: false 
    };
    syncRoomPlayers(roomId);
  });

  socket.on("kick_player", ({ roomId, targetUserId }) => {
    io.to(`user_${targetUserId}`).emit("kicked");
    const clients = io.sockets.adapter.rooms.get(roomId);
    if (clients) {
      clients.forEach((clientId) => {
        const clientSocket = io.sockets.sockets.get(clientId);
        if (clientSocket && clientSocket.userId === targetUserId.toString()) {
          clientSocket.leave(roomId);
          clientSocket.currentRoom = null;
          if(clientSocket.playerData) clientSocket.playerData.isReady = false;
        }
      });
    }
    setTimeout(() => syncRoomPlayers(roomId), 100);
  });

socket.on("player_ready", async ({ roomId }) => {
    if (socket.playerData) socket.playerData.isReady = true;
    const allPlayers = syncRoomPlayers(roomId);
    const readyPlayers = allPlayers.filter(p => p.isReady === true);
    
    if (readyPlayers.length >= 2) {
      try {
        // ในโหมดแข่ง (Tournament) ยังคงจำกัดไว้ที่ 10 ข้อ (4+3+3)
        const beg = await pool.query("SELECT id FROM challenges WHERE category = 'Beginner' ORDER BY RANDOM() LIMIT 4");
        const inter = await pool.query("SELECT id FROM challenges WHERE category = 'Intermediate' ORDER BY RANDOM() LIMIT 3");
        const adv = await pool.query("SELECT id FROM challenges WHERE category = 'Advanced' ORDER BY RANDOM() LIMIT 3");
        
        const matchSequence = [...beg.rows, ...inter.rows, ...adv.rows].map(r => r.id);

        let count = 5;
        const countdownInterval = setInterval(() => {
          io.to(roomId).emit("countdown", { count, matchSequence });
          if (count <= 0) {
            clearInterval(countdownInterval);
            io.to(roomId).emit("start_match", { startTime: Date.now() });
          }
          count--;
        }, 1000);
      } catch (err) { console.error("QUEST_GEN_ERROR", err); }
    }
  });

  socket.on("finish_match", ({ roomId, userId, totalTime, finalScore }) => {
    let match = activeMatches.get(roomId) || { results: [] };
    activeMatches.set(roomId, match);
    match.results.push({ userId, username: socket.playerData.username, totalTime, finalScore });
    if (match.results.length === 1) {
        io.to(roomId).emit("match_finished", { winnerId: userId, results: match.results });
        setTimeout(() => activeMatches.delete(roomId), 5000);
    }
  });

  socket.on("update_progress", (data) => {
    if (socket.playerData) {
      socket.playerData.currentStep = data.currentStep;
      socket.playerData.score = data.score;
    }
    io.to(data.roomId).emit("tournament_update", data);
  });

  socket.on("leave_tournament", ({ roomId }) => {
    socket.to(roomId).emit("opponent_left");
    socket.leave(roomId);
    socket.currentRoom = null;
    if(socket.playerData) socket.playerData.isReady = false;
    syncRoomPlayers(roomId);
  });

  // ✅ ปรับปรุง Disconnect: ให้ครอบคลุมการปิดเบราว์เซอร์
  socket.on("disconnect", async () => {
    if (socket.userId) {
      try {
        await pool.query('UPDATE players SET is_online = false, last_seen = NOW() WHERE id = $1', [socket.userId]);
        userSockets.delete(socket.userId);
        io.emit("update_data");
        console.log(`🔌 USER_OFFLINE (Socket Cut): ${socket.userId}`);
      } catch (err) { console.error("DISCONNECT_DB_ERROR", err); }
    }
    
    if (socket.currentRoom) {
      io.to(socket.currentRoom).emit("opponent_left");
      const oldRoom = socket.currentRoom;
      setTimeout(() => syncRoomPlayers(oldRoom), 500);
    }
  });
});

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    // 1. ตรวจสอบข้อมูลเบื้องต้น
    if (!username || !password) {
        return res.status(400).json({ error: 'DATA_INCOMPLETE' });
    }

    try {
        // 2. เช็คชื่อซ้ำแบบ Case-Sensitive (ตรงตัวเป๊ะๆ)
        const checkUser = await pool.query(
            'SELECT id FROM players WHERE username = $1', 
            [username]
        );

        if (checkUser.rows.length > 0) {
            return res.status(400).json({ error: 'IDENTIFIER_ALREADY_TAKEN' });
        }

        // 3. เข้ารหัสรหัสผ่าน
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. บันทึกข้อมูล (แนะนำให้ใส่คอลัมน์พื้นฐานให้ครบ)
        const insertQuery = `
            INSERT INTO players (
                username, 
                password, 
                score, 
                current_step, 
                role, 
                is_online, 
                shuffled_sequence,
                last_seen
            ) 
            VALUES ($1, $2, 0, 0, 0, false, $3, NOW()) 
            RETURNING id, username;
        `;

        const newUser = await pool.query(insertQuery, [username, hashedPassword, []]);

        // 5. แจ้ง Socket ให้ Update ข้อมูล (ถ้าต้องการให้หน้า Admin เห็น User ใหม่ทันที)
        if (req.app.get('io')) {
            req.app.get('io').emit("update_data");
        }

        res.status(201).json({ 
            message: 'REGISTRATION_SUCCESSFUL', 
            userId: newUser.rows[0].id 
        });

    } catch (err) {
        console.error("REGISTER_ERROR:", err);
        // ดักจับกรณี Database พ่น Error อื่นๆ
        res.status(500).json({ error: 'SYSTEM_FAILURE_DURING_CREATION' });
    }
});


// --- [AUTH API] ---
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
        
        // แก้ไขตรงนี้: ดึงด่านทั้งหมดที่มีใน DB มาจัดลำดับ
        const allChallenges = await pool.query('SELECT id, category FROM challenges');
        const rows = allChallenges.rows;
        
        const finalSequence = [
          ...shuffleArray(rows.filter(c => c.category === 'Beginner').map(c => c.id)),
          ...shuffleArray(rows.filter(c => c.category === 'Intermediate').map(c => c.id)),
          ...shuffleArray(rows.filter(c => c.category === 'Advanced').map(c => c.id))
        ];

        // บันทึกลง Database (ตอนนี้จะมีความยาวเท่ากับจำนวนโจทย์ทั้งหมดใน DB แล้ว)
        await pool.query('UPDATE players SET shuffled_sequence = $1, current_step = 0 WHERE id = $2', [finalSequence, user.id]);

        io.emit("update_data"); 
        res.json({
            message: 'AUTH_SUCCESS',
            user: { id: user.id, username: user.username, role: user.role, highScore: user.score, currentScore: 0, currentStep: 0 }
        });
    } catch (err) { res.status(500).json({ error: 'SYSTEM_FAILURE' }); }
});

// ❌ ลบ API Logout เดิมออก (ย้ายไปใช้ Socket logout_event แล้ว)
app.post('/api/logout', (req, res) => {
    res.json({ success: true, message: 'PLEASE_USE_SOCKET_EVENT' });
});

// --- [USER/DASHBOARD API] ---
app.get('/api/dashboard/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ ลบบรรทัดที่ UPDATE is_online ออก เพื่อไม่ให้ไปทับ Logic ของ Socket ตอนจะ Logout
    const playerRes = await pool.query('SELECT * FROM players WHERE id = $1', [id]);
    if (playerRes.rows.length === 0) return res.status(404).json({ error: 'PLAYER_NOT_FOUND' });
    const player = playerRes.rows[0];

    const challengesRes = await pool.query('SELECT id, title, category, description FROM challenges');
    const allChallenges = challengesRes.rows;

    let sequence = player.shuffled_sequence || [];
    const dashboardChallenges = sequence.map((challengeId, index) => {
      const info = allChallenges.find(c => c.id === challengeId);
      return {
        display_level: index + 1,
        challenge_id: challengeId,
        title: info?.title || `Challenge ${index + 1}`,
        description: info?.description || '',
        category: info?.category || 'N/A',
        is_locked: index > player.current_step,
        is_completed: index < player.current_step
      };
    });
    res.json({ player: { username: player.username, score: player.score, role: player.role, current_step: player.current_step }, challenges: dashboardChallenges, totalLevels: 30 });
  } catch (err) { res.status(500).send('SERVER_ERROR'); }
});

app.get('/api/challenges/by-id/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM challenges WHERE id = $1', [req.params.id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'SERVER_ERROR' }); }
});

app.post('/api/execute-exploit', async (req, res) => {
  const { userId, displayStep, username, password, sessionScore, isTournament, challengeId } = req.body; 
  try {
    let challenge;

    // 1. แยกแยะโหมดการดึงโจทย์
    if (challengeId) { 
        // ✅ โหมดโจทย์พิเศษ (Hidden Quest) หรือ Tournament แบบระบุ ID
        const cRes = await pool.query('SELECT * FROM challenges WHERE id = $1', [challengeId]);
        challenge = cRes.rows[0];
    } else if (isTournament) {
        // โหมด Tournament ปกติ (ถ้ามีลอจิกอื่นเพิ่มเติม)
        const cRes = await pool.query('SELECT * FROM challenges WHERE id = $1', [challengeId]);
        challenge = cRes.rows[0];
    } else {
        // โหมดด่านปกติ (Main Path)
        const playerRes = await pool.query('SELECT shuffled_sequence FROM players WHERE id = $1', [userId]);
        const stepIndex = parseInt(displayStep) - 1;
        const cRes = await pool.query('SELECT * FROM challenges WHERE id = $1', [playerRes.rows[0].shuffled_sequence[stepIndex]]);
        challenge = cRes.rows[0];
    }

    // 2. ประมวลผล Query (เหมือนเดิม)
    let finalQuery = (challenge.query_template || "SELECT * FROM users WHERE username = '{ID}' AND password = '{KEY}'")
                     .replace('{ID}', username || "").replace('{KEY}', password || "");
    const dbResult = await pool.query(finalQuery);

    // 3. ตรวจสอบเงื่อนไขการชนะ
    let isSuccess = (challenge.category === 'Beginner') ? dbResult.rows.length > 0 : (password && password.trim() === challenge.access_key);

    if (isSuccess) {
      const points = challenge.base_points || 100;
      const newScore = sessionScore + points;
      
      // ✅ จุดที่ปรับปรุง: บันทึกคะแนนลง Database เฉพาะเมื่อเป็น "ด่านปกติ" หรือ "โจทย์พิเศษ" 
      // แต่จะไม่ขยับ current_step ถ้าเป็นโจทย์พิเศษ (challengeId)
      if (!isTournament) {
          if (challengeId) {
              // กรณี Hidden Quest: อัปเดตแค่คะแนนอย่างเดียว ไม่ขยับ Step ด่านหลัก
              await pool.query('UPDATE players SET score = GREATEST(score, $1) WHERE id = $2', [newScore, userId]);
          } else {
              // กรณีด่านปกติ: อัปเดตทั้งคะแนนและขยับ Step
              await pool.query(
                `UPDATE players SET score = GREATEST(score, $1), current_step = CASE WHEN $2 = current_step THEN current_step + 1 ELSE current_step END WHERE id = $3`,
                [newScore, parseInt(displayStep)-1, userId]
              );
          }
      }
      
      io.emit("update_data"); 

      res.json({ 
        status: "success", 
        message: challengeId ? "HIDDEN_SYSTEM_BREACHED" : "BREACH_SUCCESSFUL",
        pointsGained: points, 
        newSessionScore: newScore, 
        nextLevel: challengeId ? parseInt(displayStep) : parseInt(displayStep) + 1, // ถ้าเป็นด่านพิเศษ ไม่ต้องเพิ่ม Level หลัก
        explanation: challenge.explanation,
        data: dbResult.rows,
        isSpecial: !!challengeId // ส่ง flag บอก Frontend ว่านี่คือผลจากด่านพิเศษนะ
      });

    } else {
      res.status(401).json({ status: "fail", message: "INCORRECT_PAYLOAD", data: dbResult.rows });
    }
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'SYSTEM_FAILURE' }); 
  }
});

app.get('/api/players/online', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, username FROM players WHERE is_online = true AND last_seen > NOW() - INTERVAL '5 minutes' ORDER BY username ASC`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'FETCH_FAILED' }); }
});

// --- [ADMIN API] ---
app.get('/api/admin/players', async (req, res) => {
    try {
        const sql = `SELECT id, username, role, score, current_step, is_online, last_seen, (is_online = true AND last_seen > NOW() - INTERVAL '5 minutes') AS effectively_online FROM players ORDER BY role DESC, id ASC`;
        const result = await pool.query(sql);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'SERVER_ERROR' }); }
});

app.post('/api/admin/players/update', async (req, res) => {
    const { user_id, new_username, new_password, new_role, new_score } = req.body;
    try {
        if (new_password && new_password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(new_password, salt);
            await pool.query('UPDATE players SET username=$1, password=$2, role=$3, score=$4 WHERE id=$5', [new_username, hashedPassword, new_role, new_score, user_id]);
        } else {
            await pool.query('UPDATE players SET username=$1, role=$2, score=$3 WHERE id=$4', [new_username, new_role, new_score, user_id]);
        }
        io.emit("update_data");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'UPDATE_FAILED' }); }
});

app.post('/api/admin/players/action', async (req, res) => {
    const { action, id } = req.body;
    try {
        if (action === 'reset') await pool.query('UPDATE players SET score = 0, current_step = 0 WHERE id = $1', [id]);
        else if (action === 'ban') await pool.query('DELETE FROM players WHERE id = $1', [id]);
        else if (action === 'make_admin') await pool.query('UPDATE players SET role = 1 WHERE id = $1', [id]);
        io.emit("update_data"); 
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'ACTION_FAILED' }); }
});

app.get('/api/admin/challenges', async (req, res) => {
    const result = await pool.query('SELECT * FROM challenges ORDER BY id ASC');
    res.json(result.rows);
});

app.post('/api/admin/challenges/upsert', async (req, res) => {
    const { id, title, description, query_template, access_key, hint_1, hint_2, category, base_points } = req.body;
    const sql = `
        INSERT INTO challenges (id, title, description, query_template, access_key, hint_1, hint_2, category, base_points)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, description = EXCLUDED.description, query_template = EXCLUDED.query_template,
        access_key = EXCLUDED.access_key, hint_1 = EXCLUDED.hint_1, hint_2 = EXCLUDED.hint_2,
        category = EXCLUDED.category, base_points = EXCLUDED.base_points`;
    await pool.query(sql, [id, title, description, query_template, access_key, hint_1, hint_2, category, base_points]);
    io.emit("update_data");
    res.json({ success: true });
});


// --- เพิ่มส่วนนี้เข้าไปใน Backend ---

app.get('/api/challenges/:displayStep', async (req, res) => {
    try {
        const { displayStep } = req.params;
        const { userId } = req.query; // รับ userId จาก Query String

        // 1. หาว่าลำดับ (Sequence) ของผู้เล่นคนนี้ Challenge ที่ลำดับนี้คือ ID อะไร
        const playerRes = await pool.query('SELECT shuffled_sequence FROM players WHERE id = $1', [userId]);
        
        if (playerRes.rows.length === 0) {
            return res.status(404).json({ error: 'PLAYER_NOT_FOUND' });
        }

        const sequence = playerRes.rows[0].shuffled_sequence;
        const stepIndex = parseInt(displayStep) - 1; // ลำดับที่ส่งมา (1, 2, 3...) แปลงเป็น Index (0, 1, 2...)
        
        const challengeId = sequence[stepIndex];

        if (!challengeId) {
            return res.status(404).json({ error: 'CHALLENGE_SEQUENCE_NOT_FOUND' });
        }

        // 2. ไปดึงข้อมูล Challenge จาก ID นั้นมา
        const challengeRes = await pool.query('SELECT * FROM challenges WHERE id = $1', [challengeId]);
        
        if (challengeRes.rows.length === 0) {
            return res.status(404).json({ error: 'CHALLENGE_DATA_NOT_FOUND' });
        }

        // ส่งข้อมูลกลับไปให้ Frontend
        res.json(challengeRes.rows[0]);

    } catch (err) {
        console.error("GET_CHALLENGE_ERROR:", err);
        res.status(500).json({ error: 'SYSTEM_FAILURE' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 REAL-TIME_SERVER_RUNNING_ON_PORT_${PORT}`);
});