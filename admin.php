<?php
session_start();
require_once "connect.php"; // เชื่อมต่อกับ PostgreSQL (Supabase)

// --- 🛡️ SECURITY CHECK ---
if (!isset($_SESSION['player_id']) || (int)$_SESSION['role'] !== 1) {
    die("⛔ ACCESS_DENIED: Unauthorized Operation.");
}

$msg = "";

// --- 🛠️ LOGIC: จัดการ ACTIONS (Players & Challenges) ---
if (isset($_GET['action']) && isset($_GET['id'])) {
    $target_id = (int)$_GET['id'];
    
    switch ($_GET['action']) {
        case 'reset':
            pg_query($conn, "UPDATE players SET score = 0, level_reached = 1 WHERE id = $target_id");
            $msg = "SYSTEM: User #$target_id has been reset.";
            break;
        case 'ban':
            pg_query($conn, "DELETE FROM players WHERE id = $target_id");
            $msg = "SYSTEM: User #$target_id terminated.";
            break;
        case 'make_admin':
            pg_query($conn, "UPDATE players SET role = 1 WHERE id = $target_id");
            $msg = "SYSTEM: User #$target_id promoted to ADMIN.";
            break;
        case 'del_challenge':
            pg_query($conn, "DELETE FROM challenges WHERE level_num = $target_id");
            $msg = "CHALLENGE_DELETED: Level $target_id has been removed.";
            break;
    }
}

// --- 📝 LOGIC: เพิ่ม/แก้ไขโจทย์ (UPSERT สำหรับ PostgreSQL) ---
if (isset($_POST['save_challenge'])) {
    $sql = "INSERT INTO challenges 
            (level_num, title, description, sql_logic, target_identifier, access_key, hint_1, hint_2) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (level_num) DO UPDATE SET 
            title = EXCLUDED.title, 
            description = EXCLUDED.description,
            sql_logic = EXCLUDED.sql_logic,
            target_identifier = EXCLUDED.target_identifier,
            access_key = EXCLUDED.access_key,
            hint_1 = EXCLUDED.hint_1,
            hint_2 = EXCLUDED.hint_2";

    $params = [
        (int)$_POST['level_num'], $_POST['title'], $_POST['description'], 
        $_POST['sql_logic'], $_POST['target_identifier'], $_POST['access_key'], 
        $_POST['hint_1'], $_POST['hint_2']
    ];

    $result = pg_query_params($conn, $sql, $params);
    $msg = $result ? "CHALLENGE_SYNC: Level " . $_POST['level_num'] . " updated." : "❌ SQL Error: " . pg_last_error($conn);
}

// --- 📝 LOGIC: แก้ไขชื่อ/รหัสผ่านผู้เล่น ---
if (isset($_POST['update_user'])) {
    $uid = (int)$_POST['user_id'];
    $new_user = $_POST['new_username'];
    
    if (!empty($_POST['new_password'])) {
        $new_pass = password_hash($_POST['new_password'], PASSWORD_DEFAULT);
        $result = pg_query_params($conn, "UPDATE players SET username = $1, password = $2 WHERE id = $3", [$new_user, $new_pass, $uid]);
    } else {
        $result = pg_query_params($conn, "UPDATE players SET username = $1 WHERE id = $2", [$new_user, $uid]);
    }
    $msg = $result ? "CREDENTIALS_UPDATED: Operator $new_user updated." : "❌ Update Error.";
}

// ดึงข้อมูลสำหรับ Edit (ถ้ามีการกดปุ่ม EDIT ในตาราง)
$edit_data = ['level_num'=>'','title'=>'','description'=>'','sql_logic'=>'','target_identifier'=>'','access_key'=>'','hint_1'=>'','hint_2'=>''];
if(isset($_GET['edit_lvl'])) {
    $target_lvl = (int)$_GET['edit_lvl'];
    $res = pg_query($conn, "SELECT * FROM challenges WHERE level_num = $target_lvl");
    if($row = pg_fetch_assoc($res)) $edit_data = $row;
}

// ดึงข้อมูลตารางทั้งหมดมาแสดง
$players_res = pg_query($conn, "SELECT * FROM players ORDER BY role DESC, id ASC");
$challenges_res = pg_query($conn, "SELECT * FROM challenges ORDER BY level_num ASC");
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hacker King | Super Admin Console</title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code&family=Orbitron:wght@700&family=Sarabun:wght@400;600&display=swap" rel="stylesheet">
    <style>
        /* [คง CSS เดิมของคุณไว้ทั้งหมด] */
        :root { --admin-red: #ef4444; --dark: #020617; --border: #1e293b; --neon: #10b981; --gold: #fbbf24; --cyan: #22d3ee; }
        body { background: var(--dark); color: #e2e8f0; font-family: 'Sarabun', sans-serif; margin: 0; padding: 20px; }
        .admin-container { max-width: 1400px; margin: 0 auto; }
        .header { border-bottom: 2px solid var(--admin-red); padding-bottom: 10px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;}
        .header h1 { font-family: 'Orbitron'; color: var(--admin-red); margin: 0; font-size: 24px;}
        .grid { display: grid; grid-template-columns: 380px 1fr; gap: 25px; }
        .card { background: rgba(15, 23, 42, 0.9); border: 1px solid var(--border); padding: 20px; border-radius: 4px; margin-bottom: 25px; }
        h2 { font-family: 'Orbitron'; font-size: 13px; color: var(--neon); border-left: 3px solid var(--neon); padding-left: 10px; margin-bottom: 20px; }
        label { display: block; font-size: 10px; color: #64748b; margin-bottom: 3px; font-family: 'Fira Code'; text-transform: uppercase; }
        input, select, textarea { width: 100%; background: #000; border: 1px solid var(--border); padding: 8px; color: var(--neon); font-family: 'Fira Code'; margin-bottom: 12px; box-sizing: border-box; }
        .btn { border: none; padding: 12px; cursor: pointer; font-family: 'Orbitron'; width: 100%; transition: 0.3s; font-size: 11px; font-weight: bold; }
        .btn-save { background: var(--admin-red); color: white; }
        .btn-edit { background: var(--neon); color: #000; }
        table { width: 100%; border-collapse: collapse; font-family: 'Fira Code'; font-size: 11px; }
        th { background: #1e293b; text-align: left; padding: 12px; color: var(--admin-red); border-bottom: 2px solid var(--admin-red); }
        td { padding: 10px; border-bottom: 1px solid var(--border); }
        .action-link { text-decoration: none; font-size: 10px; margin-right: 5px; color: #94a3b8; border: 1px solid #334155; padding: 4px 8px; display: inline-block; }
        .btn-del { border-color: #ef4444; color: #ef4444; }
        .msg-box { background: rgba(16, 185, 129, 0.1); border-left: 4px solid var(--neon); color: var(--neon); padding: 15px; margin-bottom: 20px; font-family: 'Fira Code'; }
        .badge { padding: 2px 6px; border-radius: 3px; font-size: 9px; }
        .badge-admin { background: var(--admin-red); color: white; }
        .badge-user { background: #334155; color: #94a3b8; }

        /* --- 📱 RESPONSIVE ADAPTATION --- */

        /* ปรับ Grid จาก 2 คอลัมน์ เป็นคอลัมน์เดียวบนมือถือ */
        @media (max-width: 992px) {
            .grid {
                grid-template-columns: 1fr; /* ให้ Side Panel มาอยู่ข้างบน Main Panel */
            }
            
            body {
                padding: 10px;
            }

            .header h1 {
                font-size: 18px;
            }
        }

        /* จัดการกับตาราง (Tables) บนหน้าจอเล็ก */
        @media (max-width: 600px) {
            /* ทำให้ตารางเลื่อนซ้ายขวาได้ ไม่ให้ดันหน้าจอจนเบี้ยว */
            .card {
                padding: 15px;
                overflow-x: auto; 
            }

            table {
                min-width: 500px; /* บังคับความกว้างขั้นต่ำเพื่อให้ข้อมูลไม่เบียดกันจนอ่านไม่ออก */
            }

            /* ปรับปุ่ม Action ให้กดง่ายขึ้นบนนิ้วมือ */
            .action-link {
                padding: 6px 10px;
                margin-bottom: 5px;
                display: inline-block;
            }

            /* ซ่อนบางคอลัมน์ที่ไม่จำเป็นมากบนมือถือเพื่อประหยัดพื้นที่ (ทางเลือก) */
            .mobile-hide {
                display: none;
            }
        }

/* ปรับแต่ง Form Input ให้เต็มความกว้างเสมอ */
input, select, textarea {
    font-size: 14px; /* ป้องกัน iOS Auto-zoom เมื่อ Focus input */
}
    </style>
</head>
<body>

<div class="admin-container">
    <div class="header">
        <h1>SUPER_ADMIN_CONSOLE</h1>
        <div class="nav-links">
            <a href="dashboard.php" style="color:#64748b; text-decoration:none; font-family:'Fira Code'; border: 1px solid #334155; padding: 5px 15px;">EXIT_ROOT</a>
        </div>
    </div>

    <?php if($msg): ?>
        <div class="msg-box">> <?php echo $msg; ?></div>
    <?php endif; ?>

    <div class="grid">
        <div class="side-panel">
            <div class="card">
                <h2><?php echo isset($_GET['edit_lvl']) ? 'UPDATE_CHALLENGE' : 'CREATE_CHALLENGE'; ?></h2>
                <form method="POST">
                    <label>LVL_NUM (Primary Key)</label>
                    <input type="number" name="level_num" value="<?php echo $edit_data['level_num']; ?>" required <?php echo isset($_GET['edit_lvl']) ? 'readonly style="opacity:0.5"' : ''; ?>>
                    
                    <label>TITLE</label>
                    <input type="text" name="title" value="<?php echo htmlspecialchars($edit_data['title']); ?>" required>
                    
                    <label>DESCRIPTION</label>
                    <textarea name="description" rows="2"><?php echo htmlspecialchars($edit_data['description']); ?></textarea>
                    
                    <label>SQL_LOGIC</label>
                    <select name="sql_logic">
                        <option value="string" <?php if($edit_data['sql_logic']=='string') echo 'selected'; ?>>' OR '1'='1' (String)</option>
                        <option value="numeric" <?php if($edit_data['sql_logic']=='numeric') echo 'selected'; ?>>OR 1=1 (Numeric)</option>
                        <option value="blind" <?php if($edit_data['sql_logic']=='blind') echo 'selected'; ?>>Blind Injection</option>
                    </select>
                    
                    <label style="color:var(--gold);">TARGET_IDENTIFIER</label>
                    <input type="text" name="target_identifier" value="<?php echo htmlspecialchars($edit_data['target_identifier']); ?>" required>
                    
                    <label style="color:var(--gold);">ACCESS_KEY (Payload)</label>
                    <input type="text" name="access_key" value="<?php echo htmlspecialchars($edit_data['access_key']); ?>">

                    <label>HINT_1</label>
                    <input type="text" name="hint_1" value="<?php echo htmlspecialchars($edit_data['hint_1']); ?>">
                    <label>HINT_2</label>
                    <input type="text" name="hint_2" value="<?php echo htmlspecialchars($edit_data['hint_2']); ?>">

                    <button type="submit" name="save_challenge" class="btn btn-save">DEPLOY_MISSION</button>
                </form>
            </div>

            <div class="card">
                <h2>PLAYER_OVERRIDE</h2>
                <form method="POST">
                    <label>PLAYER_ID</label>
                    <input type="number" name="user_id" required>
                    <label>NEW_CODENAME</label>
                    <input type="text" name="new_username" required>
                    <label>NEW_ACCESS_KEY</label>
                    <input type="text" name="new_password">
                    <button type="submit" name="update_user" class="btn btn-edit">UPDATE_CREDENTIALS</button>
                </form>
            </div>
        </div>

        <div class="main-panel">
            <div class="card">
                <h2>MISSION_DATA_CORE</h2>
                <table>
                    <thead>
                        <tr><th width="40">LVL</th><th>TITLE</th><th>IDENTIFIER</th><th>ACTIONS</th></tr>
                    </thead>
                    <tbody>
                        <?php while($c = pg_fetch_assoc($challenges_res)): ?>
                        <tr>
                            <td><strong><?php echo $c['level_num']; ?></strong></td>
                            <td style="color:var(--gold);"><?php echo htmlspecialchars($c['title']); ?></td>
                            <td style="color:var(--neon); font-size:10px;"><code><?php echo htmlspecialchars($c['target_identifier']); ?></code></td>
                            <td>
                                <a href="?edit_lvl=<?php echo $c['level_num']; ?>" class="action-link">EDIT</a>
                                <a href="?action=del_challenge&id=<?php echo $c['level_num']; ?>" class="action-link btn-del">DEL</a>
                            </td>
                        </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <h2>OPERATOR_REGISTRY</h2>
                <table>
                    <thead>
                        <tr><th>ID</th><th>CODENAME</th><th>ROLE</th><th>SCORE</th><th>OPERATIONS</th></tr>
                    </thead>
                    <tbody>
                        <?php while($p = pg_fetch_assoc($players_res)): ?>
                        <tr>
                            <td>#<?php echo $p['id']; ?></td>
                            <td style="color:#fff;"><?php echo htmlspecialchars($p['username']); ?></td>
                            <td><span class="badge <?php echo $p['role'] == 1 ? 'badge-admin' : 'badge-user'; ?>"><?php echo $p['role'] == 1 ? 'ADMIN' : 'PLAYER'; ?></span></td>
                            <td style="color:var(--gold);"><?php echo number_format($p['score']); ?></td>
                            <td>
                                <?php if($p['role'] != 1): ?>
                                    <a href="?action=make_admin&id=<?php echo $p['id']; ?>" class="action-link">+ADMIN</a>
                                    <a href="?action=reset&id=<?php echo $p['id']; ?>" class="action-link">RESET</a>
                                    <a href="?action=ban&id=<?php echo $p['id']; ?>" class="action-link btn-del">BAN</a>
                                <?php else: ?>
                                    <span style="color:#334155;">[ROOT_PROTECTED]</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

</body>
</html>