<?php
session_start();
require_once "connect.php"; // เรียกใช้ $conn จาก Supabase

// --- 🛡️ ADMIN ACCESS ONLY GATE ---
if (!isset($_SESSION['player_id']) || (int)$_SESSION['role'] !== 1) {
    header("Location: dashboard.php?error=unauthorized");
    exit("⛔ ACCESS_DENIED: เฉพาะผู้ดูแลระบบเท่านั้นที่เข้าถึงหน้านี้ได้");
}

error_reporting(E_ALL);

// รายชื่อตารางที่ต้องการให้แสดงผล
$tables = ['players', 'challenges']; 
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>Hacker King | DB Explorer (Admin Only)</title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Orbitron:wght@700&display=swap" rel="stylesheet">
    <style>
        /* --- [ CSS ส่วนเดิมของคุณคงไว้ทั้งหมด ] --- */
        :root { --primary: #a855f7; --secondary: #22d3ee; --dark-bg: #020617; --card-bg: #0f172a; --text: #e2e8f0; --border: #334155; --admin-red: #ef4444; }
        body { background: var(--dark-bg); color: var(--text); font-family: 'Fira Code', monospace; padding: 40px; margin: 0; border-top: 5px solid var(--admin-red); }
        .header-area { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        h1 { font-family: 'Orbitron'; color: var(--admin-red); text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); margin: 0; }
        .table-container { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); overflow-x: auto; }
        h3 { color: var(--secondary); margin-top: 0; display: flex; align-items: center; }
        h3::before { content: "> "; margin-right: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: rgba(168, 85, 247, 0.1); color: var(--primary); text-align: left; padding: 12px; border-bottom: 2px solid var(--border); }
        td { padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #cbd5e1; }
        tr:hover { background: rgba(255, 255, 255, 0.03); }
        .btn-back { display: inline-block; color: var(--secondary); text-decoration: none; border: 1px solid var(--secondary); padding: 8px 15px; border-radius: 4px; transition: 0.3s; font-size: 12px; }
        .btn-back:hover { background: var(--secondary); color: #000; }
        .admin-badge { background: rgba(239, 68, 68, 0.1); color: var(--admin-red); border: 1px solid var(--admin-red); padding: 2px 10px; font-size: 10px; border-radius: 20px; }
    </style>
</head>
<body>

    <div class="header-area">
        <div>
            <h1>ROOT_DATABASE_EXPLORER <span class="admin-badge">ADMIN_ONLY</span></h1>
            <p style="font-size: 10px; color: #64748b; margin: 5px 0 0 0;">ACCESS_LOG: SessionID_<?php echo session_id(); ?></p>
        </div>
        <a href="admin_manage.php" class="btn-back"> < BACK_TO_CONSOLE </a>
    </div>

    <hr style="border: 0; border-top: 1px solid var(--border); margin-bottom: 30px;">

    <?php
    foreach ($tables as $table) {
        // เช็คว่าตารางมีอยู่ใน Schema public ของ Supabase หรือไม่
        $checkQuery = pg_query_params($conn, "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1", array($table));
        
        if (pg_num_rows($checkQuery) === 0) continue;

        echo "<div class='table-container'>";
        echo "<h3>TABLE_VIEW: " . strtoupper($table) . "</h3>";
        
        $results = pg_query($conn, "SELECT * FROM $table");
        echo "<table>";
        
        $firstRow = true;
        while ($row = pg_fetch_assoc($results)) {
            if ($firstRow) {
                echo "<thead><tr>";
                foreach (array_keys($row) as $header) {
                    echo "<th>" . strtoupper($header) . "</th>";
                }
                echo "</tr></thead><tbody>";
                $firstRow = false;
            }

            echo "<tr>";
            foreach ($row as $key => $value) {
                $displayValue = htmlspecialchars($value ?? 'NULL');
                
                // Masking Password หรือ Key สำคัญ
                if (strpos(strtolower($key), 'password') !== false || strpos(strtolower($key), 'access_key') !== false) {
                    $displayValue = "<span style='opacity: 0.3; font-size: 9px;'>" . substr($displayValue, 0, 10) . "... [SECURED]</span>";
                }
                echo "<td>$displayValue</td>";
            }
            echo "</tr>";
        }
        
        if ($firstRow) {
            echo "<tr><td colspan='100%'>[ NO_DATA_AVAILABLE ]</td></tr>";
        }

        echo "</tbody></table>";
        echo "</div>";
    }
    ?>

</body>
</html>