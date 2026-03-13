// server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // สำหรับตรวจสอบ password_verify

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Query หา User จาก Supabase
        const result = await pool.query(
            "SELECT id, username, password, role FROM players WHERE username = $1 LIMIT 1",
            [username]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            
            // ตรวจสอบรหัสผ่านที่ Hash ไว้ (เหมือน password_verify ใน PHP)
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                // ส่งข้อมูลกลับไปให้ React และเริ่มระบบ Real-time
                res.json({
                    success: true,
                    user: { id: user.id, username: user.username, role: user.role }
                });
            } else {
                res.status(401).json({ error: "INVALID_AUTHORIZATION_KEY" });
            }
        } else {
            res.status(404).json({ error: "USER_NOT_FOUND" });
        }
    } catch (err) {
        res.status(500).json({ error: "DATABASE_ERROR" });
    }
});