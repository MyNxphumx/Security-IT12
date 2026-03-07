<?php
session_start();
$db = new SQLite3('game.db');

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
            $db->exec("UPDATE players SET score = 0, level_reached = 1 WHERE id = $target_id");
            $msg = "SYSTEM: User #$target_id has been reset.";
            break;
        case 'ban':
            $db->exec("DELETE FROM players WHERE id = $target_id");
            $msg = "SYSTEM: User #$target_id terminated.";
            break;
        case 'make_admin':
            $db->exec("UPDATE players SET role = 1 WHERE id = $target_id");
            $msg = "SYSTEM: User #$target_id promoted to ADMIN.";
            break;
        case 'del_challenge':
            $db->exec("DELETE FROM challenges WHERE level_num = $target_id");
            $msg = "CHALLENGE_DELETED: Level $target_id has been removed.";
            break;
    }
}

// --- 📝 LOGIC: เพิ่ม/แก้ไขโจทย์ (ปรับปรุงคอลัมน์ใหม่) ---
if (isset($_POST['save_challenge'])) {
    $stmt = $db->prepare("INSERT OR REPLACE INTO challenges 
        (level_num, title, description, sql_logic, target_identifier, access_key, hint_1, hint_2) 
        VALUES (:lvl, :title, :desc, :logic, :target, :access, :h1, :h2)");
    $stmt->bindValue(':lvl', (int)$_POST['level_num']);
    $stmt->bindValue(':title', $_POST['title']);
    $stmt->bindValue(':desc', $_POST['description']);
    $stmt->bindValue(':logic', $_POST['sql_logic']);
    $stmt->bindValue(':target', $_POST['target_identifier']);
    $stmt->bindValue(':access', $_POST['access_key']);
    $stmt->bindValue(':h1', $_POST['hint_1']);
    $stmt->bindValue(':h2', $_POST['hint_2']);
    $stmt->execute();
    $msg = "CHALLENGE_SYNC: Level " . $_POST['level_num'] . " is updated.";
}

// --- 📝 LOGIC: แก้ไขชื่อ/รหัสผ่านผู้เล่น ---
if (isset($_POST['update_user'])) {
    $uid = (int)$_POST['user_id'];
    $new_user = $_POST['new_username'];
    
    if (!empty($_POST['new_password'])) {
        $new_pass = password_hash($_POST['new_password'], PASSWORD_DEFAULT);
        $stmt = $db->prepare("UPDATE players SET username = :u, password = :p WHERE id = :id");
        $stmt->bindValue(':p', $new_pass);
    } else {
        $stmt = $db->prepare("UPDATE players SET username = :u WHERE id = :id");
    }
    $stmt->bindValue(':u', $new_user);
    $stmt->bindValue(':id', $uid);
    $stmt->execute();
    $msg = "CREDENTIALS_UPDATED: Operator $new_user updated.";
}

// ดึงข้อมูลสำหรับ Edit
$edit_data = ['level_num'=>'','title'=>'','description'=>'','sql_logic'=>'','target_identifier'=>'','access_key'=>'','hint_1'=>'','hint_2'=>''];
if(isset($_GET['edit_lvl'])) {
    $target_lvl = (int)$_GET['edit_lvl'];
    $res = $db->querySingle("SELECT * FROM challenges WHERE level_num = $target_lvl", true);
    if($res) $edit_data = $res;
}

// ดึงข้อมูลตารางทั้งหมด
$players = $db->query("SELECT * FROM players ORDER BY role DESC, id ASC");
$challenges = $db->query("SELECT * FROM challenges ORDER BY level_num ASC");
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>Hacker King | Super Admin Console</title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code&family=Orbitron:wght@700&family=Sarabun:wght@400;600&display=swap" rel="stylesheet">
    <style>
        :root { 
            --admin-red: #ef4444; 
            --dark: #020617; 
            --border: #1e293b; 
            --neon: #10b981; 
            --gold: #fbbf24; 
            --cyan: #22d3ee;
        }
        body { background: var(--dark); color: #e2e8f0; font-family: 'Sarabun', sans-serif; margin: 0; padding: 20px; }
        .admin-container { max-width: 1400px; margin: 0 auto; }
        .header { border-bottom: 2px solid var(--admin-red); padding-bottom: 10px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;}
        .header h1 { font-family: 'Orbitron'; color: var(--admin-red); margin: 0; font-size: 24px;}
        .nav-links { display: flex; gap: 10px; align-items: center; }
        .grid { display: grid; grid-template-columns: 380px 1fr; gap: 25px; }
        .card { background: rgba(15, 23, 42, 0.9); border: 1px solid var(--border); padding: 20px; border-radius: 4px; margin-bottom: 25px; }
        h2 { font-family: 'Orbitron'; font-size: 13px; color: var(--neon); border-left: 3px solid var(--neon); padding-left: 10px; margin-top: 0; margin-bottom: 20px; }
        label { display: block; font-size: 10px; color: #64748b; margin-bottom: 3px; font-family: 'Fira Code'; text-transform: uppercase; }
        input, select, textarea { width: 100%; background: #000; border: 1px solid var(--border); padding: 8px; color: var(--neon); font-family: 'Fira Code'; margin-bottom: 12px; box-sizing: border-box; outline: none; }
        .btn { border: none; padding: 12px; cursor: pointer; font-family: 'Orbitron'; width: 100%; transition: 0.3s; font-size: 11px; font-weight: bold; }
        .btn-save { background: var(--admin-red); color: white; }
        .btn-edit { background: var(--neon); color: #000; }
        
        /* ปุ่ม View DB Style */
        .btn-view-db { 
            color: var(--cyan); 
            text-decoration: none; 
            font-family: 'Fira Code'; 
            font-size: 12px; 
            border: 1px solid var(--cyan); 
            padding: 5px 15px; 
            transition: 0.3s;
        }
        .btn-view-db:hover { background: rgba(34, 211, 238, 0.1); box-shadow: 0 0 10px rgba(34, 211, 238, 0.3); }

        table { width: 100%; border-collapse: collapse; font-family: 'Fira Code'; font-size: 11px; }
        th { background: #1e293b; text-align: left; padding: 12px; color: var(--admin-red); border-bottom: 2px solid var(--admin-red); }
        td { padding: 10px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .action-link { text-decoration: none; font-size: 10px; margin-right: 5px; color: #94a3b8; border: 1px solid #334155; padding: 4px 8px; display: inline-block; transition: 0.2s; }
        .btn-del { border-color: #ef4444; color: #ef4444; }
        .msg-box { background: rgba(16, 185, 129, 0.1); border-left: 4px solid var(--neon); color: var(--neon); padding: 15px; margin-bottom: 20px; font-family: 'Fira Code'; }
    </style>
</head>
<body>

<div class="admin-container">
    <div class="header">
        <h1>SUPER_ADMIN_CONSOLE</h1>
        <div class="nav-links">
            <span style="color: var(--gold); font-family: 'Fira Code'; font-size: 12px; margin-right: 10px;">[ ROOT_ACTIVE ]</span>
            <a href="view_db.php" class="btn-view-db">DATABASE_EXPLORER</a>
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
                    
                    <div style="border: 1px solid #1e293b; padding: 10px; margin-bottom: 12px; background: rgba(0,0,0,0.3);">
                        <label style="color:var(--gold);">TARGET_IDENTIFIER (Payload)</label>
                        <input type="text" name="target_identifier" value="<?php echo htmlspecialchars($edit_data['target_identifier']); ?>" required>
                        <label style="color:var(--gold);">ACCESS_KEY (Optional)</label>
                        <input type="text" name="access_key" value="<?php echo htmlspecialchars($edit_data['access_key']); ?>">
                    </div>

                    <label>HINT_1 (30s)</label>
                    <input type="text" name="hint_1" value="<?php echo htmlspecialchars($edit_data['hint_1']); ?>">
                    <label>HINT_2 (180s)</label>
                    <input type="text" name="hint_2" value="<?php echo htmlspecialchars($edit_data['hint_2']); ?>">

                    <button type="submit" name="save_challenge" class="btn btn-save">
                        <?php echo isset($_GET['edit_lvl']) ? 'OVERWRITE_MISSION' : 'DEPLOY_MISSION'; ?>
                    </button>
                    <?php if(isset($_GET['edit_lvl'])): ?>
                        <a href="admin.php" style="display:block; text-align:center; color:#64748b; font-size:10px; margin-top:10px; text-decoration:none;">[ CANCEL_EDIT ]</a>
                    <?php endif; ?>
                </form>
            </div>

            <div class="card">
                <h2>PLAYER_CREDENTIAL_OVERRIDE</h2>
                <form method="POST">
                    <label>TARGET_PLAYER_ID</label>
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
                        <tr>
                            <th width="40">LVL</th><th width="140">TITLE</th><th>IDENTIFIER</th><th>ACCESS_KEY</th><th width="110">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while($c = $challenges->fetchArray(SQLITE3_ASSOC)): ?>
                        <tr>
                            <td><strong><?php echo $c['level_num']; ?></strong></td>
                            <td style="color:var(--gold);"><?php echo htmlspecialchars($c['title']); ?></td>
                            <td style="color:var(--neon); font-size:10px;"><code><?php echo htmlspecialchars($c['target_identifier']); ?></code></td>
                            <td style="color:var(--neon); font-size:10px;"><code><?php echo htmlspecialchars($c['access_key'] ?: '-'); ?></code></td>
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
                        <tr>
                            <th>ID</th><th>CODENAME</th><th>ROLE</th><th>LVL</th><th>SCORE</th><th>OPERATIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while($p = $players->fetchArray(SQLITE3_ASSOC)): ?>
                        <tr>
                            <td>#<?php echo $p['id']; ?></td>
                            <td style="color:#fff;"><?php echo htmlspecialchars($p['username']); ?></td>
                            <td><span class="badge <?php echo $p['role'] == 1 ? 'badge-admin' : 'badge-user'; ?>"><?php echo $p['role'] == 1 ? 'ADMIN' : 'PLAYER'; ?></span></td>
                            <td><?php echo $p['level_reached']; ?></td>
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