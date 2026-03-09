<?php
session_start();
session_regenerate_id(true);
require_once "connect.php"; // เชื่อมต่อ $conn ของ Supabase

// --- 🛡️ AUTH CHECK ---
if (!isset($_SESSION['player_id'])) { 
    header("Location: login_real.php"); 
    exit(); 
}

// 1. ดึงข้อมูลผู้เล่นปัจจุบันจาก Supabase
$player_id = $_SESSION['player_id'];
$res_player = pg_query_params(
    $conn,
    "SELECT * FROM players WHERE id = $1 LIMIT 1",
    array($player_id)
);
if (!$res_player) {
    session_destroy();
    die("DATABASE_ERROR");
}
$player = pg_fetch_assoc($res_player);

if (!$player) {
    session_destroy();
    header("Location: login_real.php");
    exit();
}

$level_reached = (int)($player['level_reached'] ?? 1);
$total_score   = (int)($player['score'] ?? 0);
$user_role     = (int)($player['role'] ?? 0);

// 2. ดึงจำนวนโจทย์ทั้งหมด
$res_count = pg_query($conn, "SELECT COUNT(*) FROM challenges");
$total_levels = (int)pg_fetch_result($res_count, 0, 0) ?: 1; 
$progress_pct = max(0, round((($level_reached - 1) / $total_levels) * 100));

// 3. ดึงรายการโจทย์ทั้งหมด
$challenges_res = pg_query($conn, "SELECT * FROM challenges ORDER BY level_num ASC");
if (!$challenges_res) {
    die("CHALLENGE_LOAD_ERROR");
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hacker King | Dashboard & Academy</title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Orbitron:wght@400;700&family=Sarabun:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        /* ... (ใส่ CSS เดิมที่คุณให้มาที่นี่) ... */
        :root {
            --primary: #a855f7; --primary-glow: rgba(168, 85, 247, 0.6);
            --secondary: #22d3ee; --success: #10b981; --danger: #ff4757;
            --warning: #fbbf24; --dark-bg: #020617; --card-bg: rgba(15, 23, 42, 0.95);
            --border: #334155; --terminal-green: #4ade80;
        }
        /* [คัดลอก CSS ที่เหลือมาวางทั้งหมด] */
        body { font-family: 'Sarabun', sans-serif; background: var(--dark-bg); color: #e2e8f0; margin: 0; background-image: radial-gradient(circle at 50% 50%, #1e1b4b 0%, #020617 100%); overflow-x: hidden; }
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
        .progress-container { margin-top: 25px; background: #000; padding: 2px; border: 1px solid var(--border); }
        .progress-bar { height: 8px; background: linear-gradient(90deg, var(--primary), var(--secondary)); box-shadow: 0 0 15px var(--primary); transition: width 1s ease-in-out; }
        .stats-box { background: var(--card-bg); border: 1px solid var(--border); padding: 20px; display: flex; flex-direction: column; gap: 15px; justify-content: center; }
        .stat-item { text-align: center; }
        .stat-label { font-size: 10px; color: #94a3b8; font-family: 'Fira Code'; text-transform: uppercase; }
        .stat-val { font-family: 'Orbitron', sans-serif; font-size: 28px; color: var(--warning); text-shadow: 0 0 10px var(--warning); }
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
        .academy-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .lesson-card { background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border); padding: 20px; border-radius: 4px; transition: 0.3s; }
        .lesson-card:hover { border-color: var(--secondary); background: rgba(34, 211, 238, 0.05); }
        .lesson-card h3 { font-family: 'Orbitron'; font-size: 14px; color: var(--secondary); margin-top: 0; }
        .lesson-card code { background: #000; color: var(--terminal-green); padding: 2px 6px; border-radius: 3px; font-size: 12px; }
        .cheat-sheet { margin-top: 50px; background: rgba(0, 0, 0, 0.4); border: 1px solid var(--border); font-family: 'Fira Code', monospace; }
        .cheat-header { background: #1e293b; padding: 8px 20px; color: var(--warning); font-size: 12px; }
        .cheat-body { padding: 15px 20px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
        @media (max-width:900px){

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

            }

            @media (max-width:480px){

            .level-grid{
            grid-template-columns:1fr;
            }

            .welcome-card h1{
            font-size:22px;
            }

            .stat-val{
            font-size:22px;
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
            $i = (int)$row['level_num'];
            $is_unlocked = $i <= $level_reached;
            $is_completed = $i < $level_reached;
            
            // Emoji Logic
            $emoji = "📡";
            if (stripos($row['title'], 'string') !== false) $emoji = "💉";
            else if (stripos($row['title'], 'numeric') !== false) $emoji = "🔢";
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
                <strong>Payload:</strong> <code>' OR '1'='1</code>
            </p>
        </div>
        </div>
</div>

</body>
</html>