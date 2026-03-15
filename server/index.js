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
  const { userId, level, username, password, accessKeyFromUser } = req.body;

  try {
    const challengeRes = await pool.query('SELECT * FROM challenges WHERE level_num = $1', [level]);
    if (challengeRes.rows.length === 0) return res.status(404).json({ error: 'INVALID_LEVEL' });

    const challenge = challengeRes.rows[0];
    
    // --- จุดเปลี่ยนสำคัญ ---
    // สร้าง SQL จริงโดยเอา INPUT จากผู้เล่นไปแทนที่ใน Template
    let finalQuery = challenge.query_template || "SELECT * FROM users WHERE username = '{ID}' AND password = '{KEY}'";
    finalQuery = finalQuery.replace('{ID}', username || "").replace('{KEY}', password || "");

    console.log("🛠 EXECUTING_EXPLOIT:", finalQuery);

    try {
      // รัน Query จริงๆ ใน Database
      const dbResult = await pool.query(finalQuery);
      const rows = dbResult.rows;

      // --- LOGIC การตรวจสอบชัยชนะ ---
// --- LOGIC การตรวจสอบชัยชนะ (ปรับปรุงให้รองรับข้อ 11-30) ---
    let isSuccess = false;

    if (challenge.category === 'Beginner') {
      // ด่าน 1-10: ขอแค่ Query แล้วมีข้อมูลออกมา (Bypass Success)
      isSuccess = rows.length > 0;
    } else {
      // ด่าน 11-30: ต้องเอา 'คำตอบ' ที่ได้จากตารางอื่น มากรอกในช่อง Password
      // เราจะเช็คว่า password ที่ส่งมา (ซึ่งทำหน้าที่เป็นช่องกรอก Key) ตรงกับ access_key ในโจทย์ไหม
      // ใช้ .trim() เพื่อกันคนเผลอเคาะ space bar และ .toLowerCase() ถ้าไม่ซีเรียสเรื่องตัวพิมพ์ใหญ่
      isSuccess = (password && password.trim() === challenge.access_key);
    }

      if (isSuccess) {
        // อัปเดตคะแนนและเลเวล (ใช้ Logic เดิมของคุณ)
        await pool.query(
          `UPDATE players SET score = score + $1, level_reached = GREATEST(level_reached, $2 + 1) WHERE id = $3`,
          [challenge.base_points || 100, level, userId]
        );

        return res.json({
          status: "success",
          message: "BREACH_SUCCESSFUL",
          data: rows, // ส่งข้อมูลที่ Query ได้กลับไปให้หน้าบ้านโชว์เป็นตาราง
          nextLevel: parseInt(level) + 1
        });
      } else {
        return res.status(401).json({
          status: "fail",
          message: "INCORRECT_ACCESS_KEY", // เจาะได้แต่คีย์ผิด หรือเจาะไม่ได้เลย
          data: rows // ยังส่งข้อมูลกลับไป เผื่อผู้เล่นต้องเอาไปหา Key ต่อ
        });
      }

    } catch (dbErr) {
      // กรณี SQL พัง (สำคัญมากสำหรับด่าน Error-based)
      return res.status(400).json({
        status: "error",
        message: dbErr.message, // ส่ง Error Message กลับไปให้ผู้เล่นเห็น (เพื่อเจาะ Error-based)
        sql_state: dbErr.code
      });
    }

  } catch (err) {
    res.status(500).json({ error: 'SYSTEM_FAILURE' });
  }
});

// 4. สั่งให้ Server เริ่มทำงาน
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SERVER_RUNNING_ON_PORT_${PORT}`);
});