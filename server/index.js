const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// 1. Middleware: อนุญาตให้ React (port 5173) คุยกับ Node.js ได้
app.use(cors());
app.use(express.json());

// 2. การเชื่อมต่อ Supabase Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // ยอมรับ Self-signed certificate ของ Supabase
  }
});

// ตรวจสอบการเชื่อมต่อ
pool.connect((err) => {
  if (err) {
    console.error('❌ DATABASE_CONNECTION_ERROR:', err.message);
  } else {
    console.log('✅ DATABASE_CONNECTED_SUCCESSFULLY');
  }
});

// 3. Route สำหรับ Login (ฉบับปรับปรุงเพื่อตาราง players)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // ค้นหาข้อมูลจากตาราง players ตามโครงสร้างจริงใน Supabase
    const result = await pool.query('SELECT * FROM players WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'INVALID_IDENTIFIER' });
    }

    const user = result.rows[0];

    // แก้ไขรหัสผ่าน $2y$ (PHP) ให้เป็น $2a$ (Node.js) เพื่อให้ bcryptjs ตรวจสอบได้
    const compatibleHash = user.password.replace(/^\$2y\$/, '$2a$');

    // ตรวจสอบความถูกต้องของรหัสผ่าน
    const isMatch = await bcrypt.compare(password, compatibleHash);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'ENCRYPTED_KEY_MISMATCH' });
    }

    // AUTH SUCCESS: ส่งข้อมูลกลับไปให้ Frontend
    console.log(`User ${username} logged in successfully!`);
    res.json({
      message: 'AUTH_SUCCESS',
      user: { 
        id: user.id, 
        username: user.username,
        score: user.score,
        level: user.level_reached 
      }
    });

  } catch (err) {
    console.error('SERVER_ERROR:', err);
    res.status(500).json({ error: 'SYSTEM_FAILURE' });
  }
});



// ดึงข้อมูล Dashboard ของ User
// ในไฟล์ server/index.js
app.get('/api/dashboard/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // ดึงข้อมูลจากตาราง players ตามภาพของคุณ
    const playerRes = await pool.query('SELECT * FROM players WHERE id = $1', [id]);
    
    if (playerRes.rows.length === 0) {
      return res.status(404).json({ error: 'PLAYER_NOT_FOUND' });
    }

    const challengesRes = await pool.query('SELECT * FROM challenges ORDER BY level_num ASC');

    res.json({
      player: playerRes.rows[0],
      challenges: challengesRes.rows,
      totalLevels: challengesRes.rows.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('SERVER_ERROR');
  }
});




// --- [ADMIN API: PLAYERS] ---
app.get('/api/admin/players', async (req, res) => {
    const result = await pool.query('SELECT * FROM players ORDER BY role DESC, id ASC');
    res.json(result.rows);
});

app.post('/api/admin/players/action', async (req, res) => {
    const { action, id } = req.body;
    if (action === 'reset') {
        await pool.query('UPDATE players SET score = 0, level_reached = 1 WHERE id = $1', [id]);
    } else if (action === 'ban') {
        await pool.query('DELETE FROM players WHERE id = $1', [id]);
    } else if (action === 'make_admin') {
        await pool.query('UPDATE players SET role = 1 WHERE id = $1', [id]);
    }
    res.json({ success: true });
});

// --- [ADMIN API: CHALLENGES] ---
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
    res.json({ success: true });
});


app.get('/api/challenges/:level_num', async (req, res) => {
    const { level_num } = req.params;
    const { userId } = req.query; // รับจาก ?userId=... ที่ Frontend ส่งมา

    try {
        if (!userId) return res.status(400).json({ error: "MISSING_USER_ID" });

        // 1. ใช้ pool.query (ไม่ใช่ db.query)
        const player = await pool.query('SELECT level_reached FROM players WHERE id = $1', [userId]);
        
        if (player.rows.length === 0) return res.status(404).json({ error: "USER_NOT_FOUND" });
        
        const currentLevel = player.rows[0].level_reached;

        // 2. ตรวจสอบสิทธิ์
        if (parseInt(level_num) > currentLevel) {
            return res.status(403).json({ 
                error: "ACCESS_DENIED", 
                message: "คุณยังไม่ได้ปลดล็อคด่านนี้!" 
            });
        }

        // 3. ส่งข้อมูลโจทย์
        const challenge = await pool.query('SELECT * FROM challenges WHERE level_num = $1', [level_num]);
        if (challenge.rows.length === 0) return res.status(404).json({ error: "CHALLENGE_NOT_FOUND" });
        
        res.json(challenge.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "SERVER_ERROR" });
    }
});

// --- [CHALLENGE API: EXECUTE EXPLOIT] ---
// ตรวจสอบ Payload ที่ผู้เล่นส่งมาและอัปเดตคะแนน
app.post('/api/execute-exploit', async (req, res) => {
  const { userId, level, username, password, time_spent } = req.body;

  try {
    const challengeRes = await pool.query('SELECT * FROM challenges WHERE level_num = $1', [level]);
    if (challengeRes.rows.length === 0) return res.status(404).json({ error: 'INVALID_LEVEL' });

    const challenge = challengeRes.rows[0];
    
    // --- จุดที่เลียนแบบ PHP: การสร้าง Query ที่ถูก Inject ---
    let queryDisplay = challenge.sql_logic || "SELECT * FROM users WHERE username = '{ID}' AND password = '{KEY}'";
    queryDisplay = queryDisplay.replace('{ID}', username).replace('{KEY}', password);

    let isSuccess = false;

    // --- จุดที่สำคัญที่สุด: ลองรัน Query นั้นจริงๆ ใน DB จำลอง หรือตรวจสอบ Logic ---
    try {
      // วิธีที่ 1: รันในตาราง dummy 'users' เพื่อเช็คว่า Bypass ได้จริงไหม
      // (คุณต้องมีตาราง users ใน Supabase ที่มีข้อมูลหลอกๆ ไว้ 1 row ด้วย)
      const checkResult = await pool.query(queryDisplay);
      
      if (checkResult.rows.length > 0) {
        isSuccess = true;
      }
    } catch (dbErr) {
      // ถ้า Syntax ผิด (เช่น ใส่ Single Quote เกิน) จะถือว่าไม่ผ่านแบบใน PHP
      return res.status(401).json({ status: 'fail', message: 'SQL_SYNTAX_ERROR: ' + dbErr.message });
    }

    if (isSuccess) {
      const points = Math.max(100, 1000 - (time_spent * 2)); // Penalty แบบ PHP
      await pool.query(
        `UPDATE players 
         SET score = score + $1, 
             level_reached = GREATEST(level_reached, $2 + 1) 
         WHERE id = $3`,
        [points, level, userId]
      );

      res.json({
        status: 'success',
        message: `ACCESS GRANTED: SQL Injection สำเร็จ!`,
        nextLevel: parseInt(level) + 1
      });
    } else {
      res.status(401).json({ status: 'fail', message: 'ACCESS DENIED: ไม่สามารถข้ามการตรวจสอบได้' });
    }
  } catch (err) {
    res.status(500).json({ error: 'SYSTEM_FAILURE' });
  }
});

// 4. สั่งให้ Server เริ่มทำงาน
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SERVER_RUNNING_ON_PORT_${PORT}`);
});