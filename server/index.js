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
        const result = await pool.query('SELECT * FROM players WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'INVALID_IDENTIFIER' });
        }

        let user = result.rows[0];
        const compatibleHash = user.password.replace(/^\$2y\$/, '$2a$');
        const isMatch = await bcrypt.compare(password, compatibleHash);

        // 🛑 แก้ไขจุดนี้: ถ้า Password ไม่ตรง ให้หยุดทำงานทันที
        if (!isMatch) {
            return res.status(401).json({ error: 'INVALID_ENCRYPTED_KEY' });
        }

        // ✅ ถ้าผ่านมาถึงตรงนี้ได้ แปลว่า Username และ Password ถูกต้องแน่นอน
        console.log(`🎲 Re-shuffling challenges for ${username}...`);

        // --- ส่วนลอจิก Shuffle แบบแบ่งระดับ (Grouped Shuffle) ---
        const allChallenges = await pool.query('SELECT id, category FROM challenges');
        const rows = allChallenges.rows;

        // 1. แยกกลุ่ม ID ตาม Category
        const beginnerIds = rows.filter(c => c.category === 'Beginner').map(c => c.id);
        const intermediateIds = rows.filter(c => c.category === 'Intermediate').map(c => c.id);
        const advancedIds = rows.filter(c => c.category === 'Advanced').map(c => c.id);

        // 2. ฟังก์ชันสำหรับ Shuffle
        const shuffleArray = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        // 3. รวมลำดับใหม่
        const finalSequence = [
            ...shuffleArray(beginnerIds),
            ...shuffleArray(intermediateIds),
            ...shuffleArray(advancedIds)
        ];

        // 4. บันทึกลง Database และรีเซ็ต Step
        await pool.query(
            'UPDATE players SET shuffled_sequence = $1, current_step = 0 WHERE id = $2', 
            [finalSequence, user.id]
        );

        // ✅ ส่ง Response กลับ (ย้ายมาไว้ในจุดที่การันตีว่ารหัสถูก)
        console.log(`User ${username} logged in successfully!`);
// ... (Logic เช็ค Password และ Shuffle เหมือนเดิม) ...


        res.json({
            message: 'AUTH_SUCCESS',
            user: {
                id: user.id,
                username: user.username,
                role: user.role, // เพิ่มบรรทัดนี้!
                highScore: user.score,
                currentScore: 0,
                currentStep: 0
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
    
    // 1. ดึงข้อมูล Player (ที่มี shuffled_sequence และ current_step)
    const playerRes = await pool.query('SELECT * FROM players WHERE id = $1', [id]);
    if (playerRes.rows.length === 0) return res.status(404).json({ error: 'PLAYER_NOT_FOUND' });
    const player = playerRes.rows[0];

    // 2. ดึงโจทย์ทั้งหมด 30 ข้อมาเก็บไว้ในตัวแปร (เพื่อเอาไป Map)
    const challengesRes = await pool.query('SELECT id, title, category FROM challenges');
    const allChallenges = challengesRes.rows;

    // 3. สร้างรายการด่าน 30 ด่านตามลำดับใน shuffled_sequence
    // ถ้า shuffled_sequence ว่าง (เช่น เพิ่งสมัคร) ให้ทำการสร้างลำดับใหม่
    let sequence = player.shuffled_sequence;
    if (!sequence || sequence.length === 0) {
        sequence = allChallenges.map(c => c.id).sort(() => Math.random() - 0.5);
        await pool.query('UPDATE players SET shuffled_sequence = $1 WHERE id = $2', [sequence, id]);
    }

    const dashboardChallenges = sequence.map((challengeId, index) => {
      const challengeInfo = allChallenges.find(c => c.id === challengeId);
      const displayLevel = index + 1; // ด่านที่ 1, 2, 3...30

      return {
        display_level: displayLevel,
        challenge_id: challengeId,
        title: challengeInfo ? challengeInfo.title : `Challenge ${displayLevel}`,
        category: challengeInfo ? challengeInfo.category : 'N/A',
        is_locked: index > player.current_step, // ล็อคถ้าลำดับยังมาไม่ถึง
        is_completed: index < player.current_step
      };
    });

    // ✅ เพิ่มฟิลด์ role เข้าไปใน player object
    res.json({
        player: {
            username: player.username,
            score: player.score,
            role: player.role, // เพิ่มบรรทัดนี้!
            current_step: player.current_step
        },
        challenges: dashboardChallenges,
        totalLevels: 30
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


app.get('/api/challenges/:display_level', async (req, res) => {
    const { display_level } = req.params; // รับเลข 1 - 30
    const { userId } = req.query;

    try {
        const stepIndex = parseInt(display_level) - 1; // แปลงเป็น Index 0 - 29

        // 1. ดึงข้อมูลลำดับการเล่นของ User
        const player = await pool.query('SELECT shuffled_sequence, current_step FROM players WHERE id = $1', [userId]);
        if (player.rows.length === 0) return res.status(404).json({ error: "USER_NOT_FOUND" });
        
        const { shuffled_sequence, current_step } = player.rows[0];

        // 2. ตรวจสอบสิทธิ์: ห้ามเล่นข้ามลำดับ (เช่น จะเล่นด่าน 5 แต่ current_step อยู่แค่ 2)
        if (stepIndex > current_step) {
            return res.status(403).json({ error: "ACCESS_DENIED", message: "ด่านนี้ยังไม่ปลดล็อค" });
        }

        // 3. หา ID จริงจากลำดับที่สุ่มไว้
        const realChallengeId = shuffled_sequence[stepIndex];

        // 4. ดึงข้อมูลโจทย์จริงออกมา
        const challenge = await pool.query('SELECT * FROM challenges WHERE id = $1', [realChallengeId]);
        if (challenge.rows.length === 0) return res.status(404).json({ error: "CHALLENGE_NOT_FOUND" });
        
        // ส่งข้อมูลโจทย์กลับไป (โดยที่หน้าบ้านจะเห็นว่าเป็น "ด่านที่ X" ตามที่เขากดมา)
        res.json({
            ...challenge.rows[0],
            display_level: display_level // ส่งเลขลำดับกลับไปให้ UI โชว์ด้วย
        });

    } catch (err) {
        res.status(500).json({ error: "SERVER_ERROR" });
    }
});

// --- [CHALLENGE API: EXECUTE EXPLOIT] ---
// ตรวจสอบ Payload ที่ผู้เล่นส่งมาและอัปเดตคะแนน
app.post('/api/execute-exploit', async (req, res) => {
  // เพิ่ม sessionScore (คะแนนรวมที่สะสมมาตั้งแต่ Login รอบนี้) รับมาจากหน้าบ้าน
  const { userId, displayStep, username, password, sessionScore } = req.body; 

  try {
    const stepIndex = parseInt(displayStep) - 1;

    // 1. ดึงข้อมูลลำดับโจทย์
    const playerRes = await pool.query('SELECT shuffled_sequence, current_step, score FROM players WHERE id = $1', [userId]);
    if (playerRes.rows.length === 0) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    
    const { shuffled_sequence, current_step, score: highScore } = playerRes.rows[0];
    const realChallengeId = shuffled_sequence[stepIndex];

    // 2. ดึงข้อมูลโจทย์จริง
    const challengeRes = await pool.query('SELECT * FROM challenges WHERE id = $1', [realChallengeId]);
    const challenge = challengeRes.rows[0];

    // ... (ลอจิกการสร้าง finalQuery และรัน dbResult เหมือนเดิม) ...
    let finalQuery = challenge.query_template || "SELECT * FROM users WHERE username = '{ID}' AND password = '{KEY}'";
    finalQuery = finalQuery.replace('{ID}', username || "").replace('{KEY}', password || "");
    const dbResult = await pool.query(finalQuery);
    const rows = dbResult.rows;

    // --- LOGIC การตรวจสอบชัยชนะ ---
    let isSuccess = false;
    if (challenge.category === 'Beginner') {
      isSuccess = rows.length > 0;
    } else {
      isSuccess = (password && password.trim() === challenge.access_key);
    }

    if (isSuccess) {
      const pointsForThisLevel = challenge.base_points || 100;
      // คำนวณคะแนนรวมใน Session นี้ (คะแนนที่ทำได้ตั้งแต่เริ่ม Login รอบนี้)
      const newPotentialScore = sessionScore + pointsForThisLevel;

      // ✅ อัปเดต DB โดยใช้ GREATEST เพื่อบันทึกเฉพาะ High Score
      // และอัปเดต current_step เฉพาะเมื่อเล่นด่านใหม่
      await pool.query(
        `UPDATE players 
         SET score = GREATEST(score, $1), 
             current_step = CASE WHEN $2 = current_step THEN current_step + 1 ELSE current_step END 
         WHERE id = $3`,
        [newPotentialScore, stepIndex, userId]
      );

      return res.json({
        status: "success",
        message: "BREACH_SUCCESSFUL",
        pointsGained: pointsForThisLevel,
        newSessionScore: newPotentialScore, // ส่งคะแนนสะสมรอบนี้กลับไปให้หน้าบ้านบวกต่อ
        nextLevel: parseInt(displayStep) + 1
      });
    } else {
      return res.status(401).json({ status: "fail", message: "INCORRECT_ACCESS_KEY", data: rows });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SYSTEM_FAILURE' });
  }
});




// 4. สั่งให้ Server เริ่มทำงาน
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SERVER_RUNNING_ON_PORT_${PORT}`);
});