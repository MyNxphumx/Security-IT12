<?php
session_start();
if (!isset($_SESSION['player_id'])) { 
    header("Location: login_real.php"); 
    exit(); 
}

require_once "connect.php";

// ดึงอันดับ
$results = pg_query(
    $conn,
    "SELECT username, level_reached, score
     FROM players
     ORDER BY score DESC, level_reached DESC
     LIMIT 10"
);
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hacker King | Hall of Fame</title>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Orbitron:wght@400;700&family=Sarabun:wght@300;400;600&display=swap" rel="stylesheet">
<style>

:root{
--primary:#a855f7;
--secondary:#22d3ee;
--warning:#fbbf24;
--dark-bg:#020617;
--card-bg:rgba(15,23,42,0.95);
--border:#334155;
}

body{
font-family:'Sarabun',sans-serif;
background:var(--dark-bg);
color:#e2e8f0;
margin:0;
min-height:100vh;

background-image:
radial-gradient(circle at 50% 50%, #1e1b4b 0%, #020617 100%);
}

.navbar{
height:70px;
background:rgba(2,6,23,0.8);
backdrop-filter:blur(10px);
border-bottom:1px solid var(--primary);

display:flex;
align-items:center;
justify-content:space-between;

padding:0 40px;
}

.brand{
font-family:'Orbitron';
color:var(--primary);
font-weight:bold;
text-shadow:0 0 10px var(--primary);
}

.container{
max-width:900px;
margin:50px auto;
padding:20px;
}

h1{
font-family:'Orbitron';
text-align:center;
color:var(--secondary);
text-shadow:0 0 15px var(--secondary);
margin-bottom:40px;
}

.table-wrapper{
overflow-x:auto;
}

.rank-table{
width:100%;
border-collapse:collapse;
background:var(--card-bg);
border:1px solid var(--border);
}

.rank-table th{
font-family:'Orbitron';
background:rgba(168,85,247,0.2);
color:var(--primary);
padding:15px;
text-align:left;
font-size:14px;
border-bottom:2px solid var(--primary);
}

.rank-table td{
padding:15px;
border-bottom:1px solid var(--border);
font-family:'Fira Code';
font-size:14px;
}

.rank-table tr{
transition:0.2s;
}

.rank-table tr:hover{
background:rgba(255,255,255,0.05);
transform:scale(1.01);
}

.rank-badge{
display:inline-block;
width:32px;
height:32px;
line-height:32px;
text-align:center;
border-radius:50%;
background:#1e293b;
font-weight:bold;
}

.top-1{
color:var(--warning);
font-weight:bold;
text-shadow:0 0 8px var(--warning);
}

.top-2{
color:#e5e7eb;
}

.top-3{
color:#cd7f32;
}

.btn-back{
display:inline-block;
margin-top:30px;
color:var(--secondary);
text-decoration:none;
font-family:'Fira Code';
font-size:13px;
}

.btn-back:hover{
text-shadow:0 0 10px var(--secondary);
}

@media (max-width:600px){

.navbar{
flex-direction:column;
height:auto;
padding:15px;
gap:10px;
}

.container{
margin:20px auto;
}

.rank-table th,
.rank-table td{
padding:10px;
font-size:12px;
}

}

</style>
</head>
<body>

<nav class="navbar">
    <div style="font-family: 'Orbitron'; color: var(--primary); font-weight: bold;">HACKER_KING://RANKING</div>
    <a href="dashboard.php" style="color: #fff; text-decoration: none; font-family: 'Fira Code'; font-size: 12px;">[ EXIT_LEADERBOARD ]</a>
</nav>

<div class="container">
    <h1>TOP_10_OPERATORS</h1>

    <table class="rank-table">
        <thead>
            <tr>
                <th>RANK</th>
                <th>CODENAME</th>
                <th>LEVEL</th>
                <th>SCORE</th>
            </tr>
        </thead>
        <tbody>
            <?php 
            $rank = 1;
        while ($row = pg_fetch_assoc($results)):
                $class = "";
                if($rank == 1) $class = "top-1";
                elseif($rank == 2) $class = "top-2";
                elseif($rank == 3) $class = "top-3";
            ?>
            <tr class="<?php echo $class; ?>">
                <td><span class="rank-badge"><?php echo $rank; ?></span></td>
                <td><?php echo htmlspecialchars($row['username']); ?></td>
                <td>LV.<?php echo $row['level_reached']; ?></td>
                <td><?php echo number_format($row['score']); ?> PTS</td>
            </tr>
            <?php 
                $rank++;
            endwhile; 
            ?>
        </tbody>
    </table>

    <a href="dashboard.php" class="btn-back">< RETURN_TO_DASHBOARD</a>
</div>

</body>
</html>