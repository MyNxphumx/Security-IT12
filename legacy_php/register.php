<?php
require_once "connect.php";

session_start();
error_reporting(0);

if (isset($_POST['register'])) {

    $user = trim($_POST['username']);
    $pass = $_POST['password'];
    $confirm_pass = $_POST['confirm_password'];

    // ---------- VALIDATION ----------
    if ($user === "" || $pass === "" || $confirm_pass === "") {

        $error = "ERROR: EMPTY_INPUT";

    } elseif (strlen($user) < 3 || strlen($user) > 20) {

        $error = "ERROR: INVALID_USERNAME_LENGTH";

    } elseif (strlen($pass) < 6) {

        $error = "ERROR: WEAK_PASSWORD";

    } elseif ($pass !== $confirm_pass) {

        $error = "ERROR: PASSWORD_MISMATCH";

    } else {

        // ตรวจสอบว่าชื่อผู้ใช้ซ้ำไหม
        $checkUser = pg_query_params(
            $conn,
            "SELECT * FROM players WHERE username = $1",
            array($user)
        );

        $res = pg_fetch_assoc($checkUser);

        if ($res) {
            $error = "ERROR: USERNAME_ALREADY_EXISTS";
        } else {

            $hashed_pass = password_hash($pass, PASSWORD_DEFAULT);

            $insert = pg_query_params(
                $conn,
                "INSERT INTO players (username, password, level_reached) VALUES ($1,$2,1)",
                array($user,$hashed_pass)
            );

            if ($insert) {
                header("Location: login_real.php?registered=success");
                exit();
            } else {
                $error = "SYSTEM_FAILURE: DATABASE_WRITE_ERROR";
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hacker King | Operator Registration</title>
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
            background-image: radial-gradient(circle at 50% 50%, #1e1b4b 0%, #020617 100%);
        }

        .reg-container {
            width:90%;
            max-width:420px;
            background: var(--card-bg);
            border: 1px solid var(--border);
            padding: 40px;
            position: relative;
            box-shadow: 0 0 40px rgba(0,0,0,0.5);
            backdrop-filter: blur(10px);
        }

        .header-area { text-align: center; margin-bottom: 25px; }
        .logo-text {
            font-family: 'Orbitron', sans-serif;
            font-size: 20px;
            font-weight: 700;
            color: var(--secondary);
            text-shadow: 0 0 10px var(--secondary);
            letter-spacing: 2px;
        }

        .input-group { margin-bottom: 15px; }
        label {
            display: block;
            font-family: 'Fira Code', monospace;
            font-size: 10px;
            color: #94a3b8;
            margin-bottom: 5px;
        }

        input {
            width: 100%;
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid var(--border);
            padding: 10px 15px;
            color: #fff;
            font-family: 'Fira Code', monospace;
            box-sizing: border-box;
            outline: none;
        }

        input:focus {
            border-color: var(--secondary);
            box-shadow: 0 0 10px rgba(34, 211, 238, 0.3);
        }

        .btn-reg {
            width: 100%;
            padding: 15px;
            background: transparent;
            border: 1px solid var(--secondary);
            color: var(--secondary);
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            cursor: pointer;
            transition: 0.3s;
            margin-top: 10px;
        }

        .btn-reg:hover {
            background: var(--secondary);
            color: #000;
            box-shadow: 0 0 20px rgba(34, 211, 238, 0.5);
        }

        .error-box {
            background: rgba(255, 71, 87, 0.1);
            border-left: 3px solid var(--danger);
            color: var(--danger);
            padding: 10px;
            font-family: 'Fira Code', monospace;
            font-size: 11px;
            margin-top: 15px;
        }

        .back-link {
            display: block;
            text-align: center;
            margin-top: 20px;
            color: var(--primary);
            text-decoration: none;
            font-family: 'Fira Code', monospace;
            font-size: 12px;
        }

        @media (max-width:480px){

        .reg-container{
            padding:25px;
            }

            .logo-text{
            font-size:18px;
            }

            input{
            font-size:14px;
            }

            .btn-reg{
            padding:12px;
            }

        }
    </style>
</head>
<body>

<div class="reg-container">
    <div class="header-area">
        <div class="logo-text">NEW_OPERATOR</div>
        <div style="font-family: 'Fira Code'; font-size: 10px; color: var(--primary);">CREATE_RECRUIT_PROFILE</div>
    </div>

    <form method="POST">
        <div class="input-group">
            <label>CODENAME (Username)</label>
            <input type="text" name="username" placeholder="Min 3 characters..." required>
        </div>
        <div class="input-group">
            <label>ACCESS_PHRASE (Password)</label>
            <input type="password" name="password" required>
        </div>
        <div class="input-group">
            <label>CONFIRM_PHRASE</label>
            <input type="password" name="confirm_password" required>
        </div>
        
        <button type="submit" name="register" class="btn-reg">CREATE_ACCOUNT.EXE</button>
    </form>

    <?php if(isset($error)): ?>
        <div class="error-box">><?php echo htmlspecialchars($error); ?></div>
    <?php endif; ?>

    <a href="login_real.php" class="back-link">[ BACK_TO_LOGIN ]</a>
</div>

</body>
</html>