<?php
session_start();
if (!isset($_SESSION['player_id'])) { 
    header("Location: login_real.php"); 
    exit(); 
}

error_reporting(0);
$db = new SQLite3('game.db');

$player_id = $_SESSION['player_id'];
$level = isset($_GET['level']) ? (int)$_GET['level'] : 1;

// ดึงข้อมูลโจทย์จาก Database
$challenge = $db->querySingle("SELECT * FROM challenges WHERE level_num = $level", true);

// ถ้าไม่มีด่านถัดไป (จบเกม) ให้ส่งไปหน้า Dashboard หรือหน้าจบ
if (!$challenge && $level > 1) {
    header("Location: dashboard.php?status=game_complete");
    exit();
}

$message = "";
$query_display = "";
$is_success = false;

if (isset($_POST['login'])) {
    $user_input = $_POST['username'];
    $pass_input = $_POST['password'];
    $time_spent = isset($_POST['time_spent']) ? (int)$_POST['time_spent'] : 0;

    // จำลอง Query แสดงผลตาม Logic ใน DB
    $logic_type = $challenge['sql_logic'];
    if ($logic_type == 'string') {
        $query_display = "SELECT * FROM users WHERE username = '$user_input' AND password = '$pass_input'";
    } elseif ($logic_type == 'numeric') {
        $query_display = "SELECT * FROM users WHERE id = $user_input AND password = '$pass_input'";
    } elseif ($logic_type == 'blind') {
        $query_display = "SELECT * FROM users WHERE username = \"$user_input\" AND password = \"$pass_input\"";
    }

    // ตรวจสอบคำตอบ
    if ($user_input === $challenge['target_identifier'] && ($challenge['access_key'] == "" || $pass_input === $challenge['access_key'])) {
        $is_success = true;
        
        $base_score = 1000;
        $penalty = $time_spent * 2;
        $earned_score = max(100, $base_score - $penalty);

        $stmt = $db->prepare("UPDATE players SET 
                    level_reached = CASE WHEN level_reached <= :lvl THEN :next_lvl ELSE level_reached END,
                    score = score + :scr
                    WHERE id = :id");
        $stmt->bindValue(':lvl', $level);
        $stmt->bindValue(':next_lvl', $level + 1);
        $stmt->bindValue(':scr', $earned_score);
        $stmt->bindValue(':id', $player_id);
        $stmt->execute();

        $message = "success|ACCESS GRANTED: Payload ถูกต้อง! กำลังพาคุณไปด่าน " . ($level + 1) . "...";
        
        // 🔥 AUTO REDIRECT: ไปด่านถัดไปใน 1.5 วินาที
        header("refresh:1.5;url=index.php?level=" . ($level + 1));
    } else {
        $message = "error|ACCESS DENIED: โครงสร้าง Query ผิดพลาด หรือรหัสไม่ถูกต้อง!";
    }
}

$msg_parts = $message ? explode('|', $message, 2) : ['', ''];
$msg_type = $msg_parts[0];
$msg_text = $msg_parts[1] ?? '';
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>Hacker King | Phase <?php echo $level; ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Orbitron:wght@700&family=Sarabun:wght@400;600&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #a855f7; --secondary: #22d3ee; --success: #10b981; --danger: #ff4757; --warning: #fbbf24; --dark-bg: #020617; --card-bg: rgba(15, 23, 42, 0.95); --border: #334155; --terminal-green: #4ade80; }
        body { font-family: 'Sarabun', sans-serif; background: var(--dark-bg); color: #e2e8f0; margin: 0; overflow: hidden; background-image: radial-gradient(circle at 50% 50%, #1e1b4b 0%, #020617 100%); }
        body::before { content: " "; position: fixed; top: 0; left: 0; bottom: 0; right: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06)); z-index: 1000; background-size: 100% 2px, 3px 100%; pointer-events: none; }
        .navbar { height: 70px; background: rgba(2, 6, 23, 0.8); backdrop-filter: blur(10px); border-bottom: 1px solid var(--primary); display: flex; align-items: center; justify-content: space-between; padding: 0 40px; }
        .brand { font-family: 'Orbitron'; font-weight: 700; color: var(--primary); text-shadow: 0 0 10px var(--primary); }
        #timer-display { background: #000; border: 1px solid var(--secondary); color: var(--secondary); padding: 5px 15px; border-radius: 4px; font-family: 'Fira Code'; }
        .container { display: flex; justify-content: center; align-items: center; min-height: calc(100vh - 70px); gap: 60px; padding: 40px; }
        .hacker-king-area { width: 350px; text-align: center; }
        .king-image { width: 280px; filter: drop-shadow(0 0 30px var(--primary)); animation: king-float 4s ease-in-out infinite; }
        @keyframes king-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
        .speech-bubble { background: var(--card-bg); border-left: 5px solid var(--primary); padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: left; font-size: 14px; }
        .game-card { background: var(--card-bg); border: 1px solid var(--border); width: 450px; padding: 40px; position: relative; }
        .lvl-badge { position: absolute; top: 15px; right: 20px; font-family: 'Orbitron'; color: var(--primary); font-size: 12px; opacity: 0.6; }
        h2 { font-family: 'Orbitron'; color: var(--secondary); border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-top: 0; }
        input { width: 100%; background: #0f172a; border: 1px solid var(--border); padding: 12px; color: var(--terminal-green); font-family: 'Fira Code'; margin-bottom: 20px; box-sizing: border-box; outline: none; }
        .btn-execute { width: 100%; padding: 15px; background: transparent; border: 1px solid var(--primary); color: var(--primary); font-family: 'Orbitron'; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .btn-execute:hover { background: var(--primary); color: white; box-shadow: 0 0 20px var(--primary); }
        .terminal { margin-top: 20px; background: #000; border: 1px solid #333; padding: 15px; font-family: 'Fira Code'; font-size: 13px; }
        .kw { color: #ff79c6; }
        .success-text { color: var(--success); }
        .error-text { color: var(--danger); }
        .hint-btns { margin-top: 15px; display: flex; flex-direction: column; gap: 8px; align-items: center; }
        .hint-btn { background: rgba(251, 191, 36, 0.05); border: 1px solid #444; color: #666; padding: 8px 15px; cursor: not-allowed; font-size: 11px; font-family: 'Fira Code'; width: 80%; }
        .hint-btn.unlocked { border-color: var(--warning); color: var(--warning); cursor: pointer; }
    </style>
</head>
<body>

<nav class="navbar">
    <div class="brand">HACKER_KING://DB_BREACH</div>
    <div class="stats-bar" style="display:flex; gap:15px; align-items:center;">
        <div id="timer-display">TIME: <span id="time-val">0</span>s</div>
        <div style="background:var(--primary); color:white; padding:5px 15px; border-radius:4px; font-family:'Fira Code';">PHASE_0<?php echo $level; ?></div>
    </div>
    <a href="dashboard.php" onclick="sessionStorage.removeItem('hacker_timer');" style="color:var(--secondary); text-decoration:none; font-family:'Fira Code'; font-size:12px;">[ EXIT ]</a>
</nav>

<div class="container">
    <div class="hacker-king-area">
        <div class="speech-bubble">
            <span style="color:var(--primary);">[KING_SAYS]:</span><br>
            <span id="king-text"><?php echo htmlspecialchars($challenge['description']); ?></span>
        </div>
        <img src="https://i.ibb.co/LzYm6L2/hacker-king.png" class="king-image">
        <div class="hint-btns">
            <button id="btn-hint-1" class="hint-btn" onclick="showHint(1)">HINT_1 (LOCKED: 30s)</button>
            <button id="btn-hint-2" class="hint-btn" onclick="showHint(2)">HINT_2 (LOCKED: 180s)</button>
        </div>
    </div>

    <div class="game-card">
        <div class="lvl-badge">MISSION_PHASE: #<?php echo $level; ?></div>
        <h2>INJECT_PAYLOAD</h2>
        <form method="POST" onsubmit="sessionStorage.setItem('hacker_timer', totalSeconds);">
            <input type="hidden" name="time_spent" id="time_spent_input" value="0">
            <label style="font-size:10px; color:var(--primary); font-family:'Fira Code';">TARGET_IDENTIFIER</label>
            <input type="text" name="username" placeholder="Payload..." required autocomplete="off" autofocus>
            <label style="font-size:10px; color:var(--primary); font-family:'Fira Code';">ACCESS_KEY</label>
            <input type="password" name="password" placeholder="********">
            <button type="submit" name="login" class="btn-execute">EXECUTE_EXPLOIT()</button>
        </form>

        <?php if($message): ?>
            <div class="terminal <?php echo $msg_type == 'success' ? 'success-text' : 'error-text'; ?>">
                > <?php echo $msg_text; ?>
            </div>
        <?php endif; ?>

        <?php if($query_display): ?>
            <div class="terminal" style="border-top:none; background:#0a0a0a; color:#888;">
                <div style="font-size:10px; color:#444; margin-bottom:5px;">SERVER_LOG: SQL_QUERY</div>
                <?php 
                    $q = htmlspecialchars($query_display);
                    foreach(['SELECT', 'FROM', 'WHERE', 'AND', 'OR'] as $kw) $q = str_replace($kw, "<span class='kw'>$kw</span>", $q);
                    echo $q;
                ?>
            </div>
        <?php endif; ?>
    </div>
</div>

<script>
let totalSeconds = parseInt(sessionStorage.getItem('hacker_timer')) || 0;
let isFinished = <?php echo $is_success ? 'true' : 'false'; ?>;

// 🔥 ถ้าผ่านด่านแล้ว ให้ล้างเวลาใน Session เพื่อให้ด่านใหม่เริ่มที่ 0
if (isFinished) {
    sessionStorage.removeItem('hacker_timer');
}

document.getElementById('time-val').innerText = totalSeconds;

let timerInterval = setInterval(() => {
    if (!isFinished) {
        totalSeconds++;
        document.getElementById('time-val').innerText = totalSeconds;
        document.getElementById('time_spent_input').value = totalSeconds;
        
        // Update Hint Buttons
        const b1 = document.getElementById('btn-hint-1');
        const b2 = document.getElementById('btn-hint-2');
        if(totalSeconds >= 30) { b1.classList.add('unlocked'); b1.innerText = "GET_HINT_1"; }
        else { b1.innerText = `HINT_1 (${30-totalSeconds}s)`; }
        if(totalSeconds >= 180) { b2.classList.add('unlocked'); b2.innerText = "GET_HINT_2"; }
        else { b2.innerText = `HINT_2 (${180-totalSeconds}s)`; }
    }
}, 1000);

function showHint(step) {
    if (totalSeconds < (step === 1 ? 30 : 180)) return;
    const h = step === 1 ? <?php echo json_encode($challenge['hint_1']); ?> : <?php echo json_encode($challenge['hint_2']); ?>;
    document.getElementById('king-text').innerHTML = `<span style="color:var(--warning);">[HINT_${step}]:</span> ${h}`;
}
</script>
</body>
</html>