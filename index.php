<?php
session_start();
if (!isset($_SESSION['player_id'])) { 
    header("Location: login_real.php"); 
    exit(); 
}

error_reporting(0);
require_once "connect.php";

$player_id = $_SESSION['player_id'];
$level = isset($_GET['level']) ? (int)$_GET['level'] : 1;

// ดึงข้อมูลโจทย์จาก Database
$res = pg_query_params(
    $conn,
    "SELECT * FROM challenges WHERE level_num=$1",
    [$level]
);

$challenge = pg_fetch_assoc($res);

// ถ้าไม่มีด่านถัดไป (จบเกม) ให้ส่งไปหน้า Dashboard หรือหน้าจบ
if (!$challenge && $level > 1) {
    header("Location: dashboard.php?status=game_complete");
    exit();
}

// --- ตรรกะเตรียมตัวแปรสำหรับการแสดงผล Query ---
// 1. รับค่าจากฟอร์มก่อน (ต้องอยู่ด้านบนๆ)
// --- 1. เตรียมค่าพื้นฐาน (เพื่อให้แถบโชว์ตลอดเวลา ไม่ว่าจะกดปุ่มหรือไม่) ---
if (isset($_POST['login'])) {
    $user_val = urldecode($_POST['username']);
    $pass_val = urldecode($_POST['password']);
}
// --- 2. สร้าง Query สำหรับโชว์ (อยู่นอก if login เพื่อให้แถบ SERVER_LOG ขึ้นตลอด) ---
$template = $challenge['query_template'];
if (!empty($template)) {
    $query_display = str_replace(
        ['{ID}', '{KEY}'], 
        [$user_val, $pass_val], 
        $template
    );
} else {
    $query_display = "SELECT * FROM users WHERE username = '$user_val' AND password = '$pass_val'";
}

// --- 3. ส่วนการตรวจสอบ (จะทำงานเฉพาะตอนกดปุ่ม EXECUTE เท่านั้น) ---
if (isset($_POST['login'])) {
    // 🔥 บรรทัดนี้สำคัญที่สุด! ต้องมีบรรทัดนี้ถึงจะเล่นผ่าน
    $check_result = pg_query($conn, $query_display); 

    if ($check_result && pg_num_rows($check_result) > 0) {
        $is_success = true;
        
        $time_spent = (int)$_POST['time_spent'];
        $base_score = 1000;
        $penalty = $time_spent * 2;
        $earned_score = max(100, $base_score - $penalty);

        pg_query_params(
            $conn,
            "UPDATE players SET level_reached = CASE WHEN level_reached <= $1 THEN $2 ELSE level_reached END, score = score + $3 WHERE id = $4",
            [$level, $level + 1, $earned_score, $player_id]
        );

        $message = "success|ACCESS GRANTED: SQL Injection สำเร็จ! กำลังพาคุณไปด่าน " . ($level + 1) . "...";
        header("refresh:1.5;url=index.php?level=" . ($level + 1));
    } else {
        $message = "error|ACCESS DENIED: โครงสร้าง Query ผิดพลาด หรือไม่สามารถข้ามการตรวจสอบได้!";
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hacker King | Phase <?php echo $level; ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Orbitron:wght@700&family=Sarabun:wght@400;600&display=swap" rel="stylesheet">
 <style>
    :root { --primary: #a855f7; --secondary: #22d3ee; --success: #10b981; --danger: #ff4757; --warning: #fbbf24; --dark-bg: #020617; --card-bg: rgba(15, 23, 42, 0.95); --border: #334155; --terminal-green: #4ade80; }
    
    /* ปรับ overflow เป็น auto เพื่อให้เลื่อนดูเนื้อหาในมือถือได้ */
    body { font-family: 'Sarabun', sans-serif; background: var(--dark-bg); color: #e2e8f0; margin: 0; overflow-x: hidden; overflow-y: auto; background-image: radial-gradient(circle at 50% 50%, #1e1b4b 0%, #020617 100%); min-height: 100vh; }
    
    body::before { content: " "; position: fixed; top: 0; left: 0; bottom: 0; right: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06)); z-index: 1000; background-size: 100% 2px, 3px 100%; pointer-events: none; }
    
    /* Navbar ปรับให้ Wrap ได้ถ้าจอแคบมาก */
    .navbar { min-height: 70px; background: rgba(2, 6, 23, 0.8); backdrop-filter: blur(10px); border-bottom: 1px solid var(--primary); display: flex; align-items: center; justify-content: space-between; padding: 0 40px; flex-wrap: wrap; gap: 10px; }
    
    .brand { font-family: 'Orbitron'; font-weight: 700; color: var(--primary); text-shadow: 0 0 10px var(--primary); }
    #timer-display { background: #000; border: 1px solid var(--secondary); color: var(--secondary); padding: 5px 15px; border-radius: 4px; font-family: 'Fira Code'; }
    
    /* Container: หัวใจหลักของ Responsive */
    .container { display: flex; justify-content: center; align-items: center; min-height: calc(100vh - 70px); gap: 60px; padding: 40px; flex-wrap: wrap; }
    
    /* ปรับความกว้างเป็น Max-width แทน */
    .hacker-king-area { width: 100%; max-width: 350px; text-align: center; }
    .king-image { width: 100%; max-width: 280px; height: auto; filter: drop-shadow(0 0 30px var(--primary)); animation: king-float 4s ease-in-out infinite, hacker-flicker 0.15s infinite; }
    
    @keyframes hacker-flicker { 0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.9; } }
    @keyframes king-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
    
    .speech-bubble { background: var(--card-bg); border-left: 5px solid var(--primary); padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: left; font-size: 14px; }
    
    /* Game Card ปรับเป็น Responsive Width */
    .game-card { background: var(--card-bg); border: 1px solid var(--border); width: 100%; max-width: 450px; padding: 40px; position: relative; box-sizing: border-box; }
    
    .lvl-badge { position: absolute; top: 15px; right: 20px; font-family: 'Orbitron'; color: var(--primary); font-size: 12px; opacity: 0.6; }
    h2 { font-family: 'Orbitron'; color: var(--secondary); border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-top: 0; }
    
    input { width: 100%; background: #0f172a; border: 1px solid var(--border); padding: 12px; color: var(--terminal-green); font-family: 'Fira Code'; margin-bottom: 20px; box-sizing: border-box; outline: none; }
    
    .btn-execute { width: 100%; padding: 15px; background: transparent; border: 1px solid var(--primary); color: var(--primary); font-family: 'Orbitron'; font-weight: bold; cursor: pointer; transition: 0.3s; }
    .btn-execute:hover { background: var(--primary); color: white; box-shadow: 0 0 20px var(--primary); }
    
    /* ปรับ Terminal ให้รองรับข้อความยาวๆ ไม่ให้ดันกล่องพัง */
    .terminal { margin-top: 20px; background: #000; border: 1px solid #333; padding: 15px; font-family: 'Fira Code'; font-size: 13px; word-break: break-all; overflow-x: auto; }
    
    .kw { color: #ff79c6; }
    .success-text { color: var(--success); }
    .error-text { color: var(--danger); }
    .hint-btns { margin-top: 15px; display: flex; flex-direction: column; gap: 8px; align-items: center; }
    .hint-btn { background: rgba(251, 191, 36, 0.05); border: 1px solid #444; color: #666; padding: 8px 15px; cursor: not-allowed; font-size: 11px; font-family: 'Fira Code'; width: 80%; }
    .hint-btn.unlocked { border-color: var(--warning); color: var(--warning); cursor: pointer; }

    /* --- เพิ่มเติมเฉพาะส่วน Responsive (Mobile) --- */
@media (max-width: 900px) {
        .container { flex-direction: column; padding: 20px; gap: 30px; }
        .navbar { padding: 10px 20px; justify-content: center; height: auto; }
        .hacker-king-area { max-width: 100%; }
        .game-card { padding: 25px 20px; }
        .king-image { max-width: 200px; }
    }

    /* 🔥 สำหรับหน้าจอมือถือ (Small Mobile 480px หรือ 4XXpx) */
/* 🔥 สำหรับหน้าจอมือถือขนาดเล็ก (4XXpx) */
@media (max-width: 480px) {
        /* 1. บังคับให้ Container เรียงเป็นแนวตั้งแน่นอน */
        .container { 
            display: flex !important;
            flex-direction: column !important; 
            padding: 10px !important; 
            gap: 20px !important; 
            height: auto !important;
            min-height: calc(100vh - 70px) !important;
            align-items: center !important;
            justify-content: flex-start !important;
        }

        /* 2. บังคับให้กล่อง King กว้างเต็มที่เพื่อให้ Game Card ตกลงมาข้างล่าง */
        .hacker-king-area { 
            width: 100% !important;
            max-width: 100% !important;
            margin-bottom: 10px !important;
            flex: none !important; /* ป้องกันไม่ให้มันพยายามยื้อพื้นที่แนวขวาง */
        }

        /* 3. ปรับ Game Card ให้กว้างเต็มจอ */
        .game-card { 
            width: 100% !important;
            max-width: 100% !important;
            padding: 20px 15px !important;
            flex: none !important;
            box-sizing: border-box !important;
        }

        /* 4. ปรับรูปและ Navbar ให้เล็กลง */
        .king-image { 
            max-width: 140px !important; 
            height: auto !important;
        }

        .navbar { 
            height: auto !important;
            flex-direction: column !important;
            padding: 15px !important;
            gap: 10px !important;
        }

        .speech-bubble { 
            width: 100% !important;
            font-size: 13px !important;
        }

        /* 5. ทำให้ Terminal ไม่ดันหน้าจอ */
        .terminal { 
            width: 100% !important;
            box-sizing: border-box !important;
            word-break: break-all !important;
        }
    }
    
    
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
        <img src="https://img.freepik.com/free-vector/colored-hacker-code-realistic-composition-with-person-creates-codes-hacking-stealing-information-vector-illustration_1284-18005.jpg?semt=ais_rp_50_assets&w=740&q=80" class="king-image">
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
            <input type="text" name="username" placeholder="Payload..."  autocomplete="off" autofocus>
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
            // เพิ่มคำสั่ง str_ireplace (Ignore case) และเพิ่ม Keyword ให้ครบ
            $keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'UNION', 'LIKE', 'LIMIT', 'ORDER BY', 'INSERT', 'UPDATE', 'DELETE'];
            foreach($keywords as $kw) {
                $q = str_ireplace($kw, "<span class='kw'>$kw</span>", $q);
            }
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

<script>
document.querySelector("form").addEventListener("submit", function(){

    const username = document.querySelector("input[name='username']");
    const password = document.querySelector("input[name='password']");

    username.value = encodeURIComponent(username.value);
    password.value = encodeURIComponent(password.value);

});
</script>

</body>
</html>