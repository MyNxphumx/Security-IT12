<?php


session_start();
// เปลี่ยนจาก error_reporting(0); เป็น 3 บรรทัดนี้
error_reporting(E_ALL);
ini_set('display_errors', 1);

if (isset($_POST['login'])) {
    $db = new SQLite3('game.db');
    
    // ดึงข้อมูลผู้เล่น
    $stmt = $db->prepare("SELECT id, username, password, role FROM players WHERE username = :user");
    $stmt->bindValue(':user', $_POST['username']);
    $res = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

    // ตรวจสอบรหัสผ่าน
    if ($res && password_verify($_POST['password'], $res['password'])) {
        
        // บันทึกค่าลง Session ให้ครบ
        $_SESSION['player_id'] = $res['id'];
        $_SESSION['player_name'] = $res['username'];
        $_SESSION['role'] = (int)$res['role']; // สำคัญ: ต้องเก็บค่า 0 หรือ 1 ไว้

        // --- แยกเส้นทาง (Redirect Logic) ---
        if ($_SESSION['role'] === 1) {
            // ถ้าเป็น Admin ส่งไปหน้าจัดการ
            header("Location: admin_manage.php");
        } else {
            // ถ้าเป็นผู้เล่นทั่วไป ส่งไปหน้าเล่นเกม (ปรับเป็น index.php ได้ตามต้องการ)
            header("Location: dashboard.php"); 
        }
        exit();

    } else {
        $error = "CRITICAL_ERROR: INVALID_AUTHORIZATION_KEY";
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hacker King | Secure Login</title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Orbitron:wght@400;700&family=Sarabun:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #a855f7;
            --primary-glow: rgba(168, 85, 247, 0.6);
            --secondary: #22d3ee;
            --danger: #ff4757;
            --dark-bg: #020617;
            --card-bg: rgba(15, 23, 42, 0.9);
            --border: #334155;
        }

        body {
            font-family: 'Sarabun', sans-serif;
            background: var(--dark-bg);
            color: #e2e8f0;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            overflow: hidden;
            background-image: radial-gradient(circle at 50% 50%, #1e1b4b 0%, #020617 100%);
        }

        /* Scanline Effect */
        body::before {
            content: " ";
            position: fixed;
            top: 0; left: 0; bottom: 0; right: 0;
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), 
                        linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
            z-index: 1000;
            background-size: 100% 2px, 3px 100%;
            pointer-events: none;
        }

        .login-container {
            width: 400px;
            background: var(--card-bg);
            border: 1px solid var(--border);
            padding: 40px;
            position: relative;
            box-shadow: 0 0 40px rgba(0,0,0,0.5);
            backdrop-filter: blur(10px);
        }

        .login-container::after {
            content: "";
            position: absolute;
            top: -2px; left: -2px; right: -2px; bottom: -2px;
            background: linear-gradient(45deg, var(--primary), transparent, var(--secondary));
            z-index: -1;
            opacity: 0.5;
        }

        .header-area {
            text-align: center;
            margin-bottom: 30px;
        }

        .logo-text {
            font-family: 'Orbitron', sans-serif;
            font-size: 20px;
            font-weight: 700;
            color: var(--primary);
            text-shadow: 0 0 10px var(--primary);
            letter-spacing: 2px;
        }

        .subtitle {
            font-family: 'Fira Code', monospace;
            font-size: 10px;
            color: var(--secondary);
            margin-top: 5px;
            text-transform: uppercase;
        }

        .input-group {
            margin-bottom: 20px;
            position: relative;
        }

        label {
            display: block;
            font-family: 'Fira Code', monospace;
            font-size: 11px;
            color: #94a3b8;
            margin-bottom: 8px;
            text-transform: uppercase;
        }

        input {
            width: 100%;
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid var(--border);
            padding: 12px 15px;
            color: #fff;
            font-family: 'Fira Code', monospace;
            box-sizing: border-box;
            outline: none;
            transition: 0.3s;
        }

        input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 10px var(--primary-glow);
        }

        .btn-login {
            width: 100%;
            padding: 15px;
            background: transparent;
            border: 1px solid var(--primary);
            color: var(--primary);
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            cursor: pointer;
            transition: 0.3s;
            letter-spacing: 2px;
            margin-top: 10px;
        }

        .btn-login:hover {
            background: var(--primary);
            color: #fff;
            box-shadow: 0 0 20px var(--primary-glow);
        }

        .error-box {
            background: rgba(255, 71, 87, 0.1);
            border-left: 3px solid var(--danger);
            color: var(--danger);
            padding: 10px;
            font-family: 'Fira Code', monospace;
            font-size: 12px;
            margin-top: 20px;
            text-align: center;
        }

        .footer-links {
            margin-top: 25px;
            text-align: center;
            font-size: 12px;
        }

        .footer-links a {
            color: var(--secondary);
            text-decoration: none;
            font-family: 'Fira Code', monospace;
        }

        .corner {
            position: absolute;
            width: 15px;
            height: 15px;
            border: 2px solid var(--primary);
        }
        .top-left { top: -5px; left: -5px; border-right: 0; border-bottom: 0; }
        .bottom-right { bottom: -5px; right: -5px; border-left: 0; border-top: 0; }
    </style>
</head>
<body>

<div class="login-container">
    <div class="corner top-left"></div>
    <div class="corner bottom-right"></div>

    <div class="header-area">
        <div class="logo-text">HACKER_KING</div>
        <div class="subtitle">Secure_Auth_Terminal_v3.0</div>
    </div>

    <form method="POST">
        <div class="input-group">
            <label>IDENTIFIER_ID</label>
            <input type="text" name="username" placeholder="Username..." required autofocus>
        </div>
        <div class="input-group">
            <label>ENCRYPTED_KEY</label>
            <input type="password" name="password" placeholder="Password..." required>
        </div>
        
        <button type="submit" name="login" class="btn-login">INITIATE_AUTH()</button>
    </form>

    <?php if(isset($error)): ?>
        <div class="error-box">
            > <?php echo $error; ?>
        </div>
    <?php endif; ?>

    <div class="footer-links">
        <a href="register.php">[ CREATE_NEW_OPERATOR ]</a>
    </div>
</div>

</body>
</html>