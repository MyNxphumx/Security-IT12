<?php
$db = new SQLite3('game.db');

$missions = [
    [
        'lvl' => 1,
        'title' => 'Basic String Bypass',
        'desc' => 'เป้าหมายคือการข้ามการตรวจสอบ Username โดยใช้ Single Quote เพื่อปิดสตริง',
        'logic' => 'string',
        'ans' => "' OR '1'='1",
        'hint' => "ลองใช้ ' OR '1'='1 เพื่อทำให้เงื่อนไขเป็นจริงเสมอ"
    ],
    [
        'lvl' => 2,
        'title' => 'Numeric Logic Error',
        'desc' => 'ด่านนี้ระบบรับค่า ID เป็นตัวเลข ลองทำให้ Query คืนค่า User ทั้งหมดออกมา',
        'logic' => 'numeric',
        'ans' => "1 OR 1=1",
        'hint' => "ด่านนี้ไม่ต้องใช้ Quote (') เพราะระบบมองว่าเป็นตัวเลข"
    ],
    [
        'lvl' => 3,
        'title' => 'Comment Out Technique',
        'desc' => 'ลองตัดส่วนที่เหลือของ Query ทิ้งโดยใช้สัญลักษณ์ Comment (-- )',
        'logic' => 'string',
        'ans' => "admin' --",
        'hint' => "ใช้ -- (ตามด้วยช่องว่าง) เพื่อหลอกให้ระบบไม่สนใจคำสั่งที่ตามมา"
    ]
];

foreach ($missions as $m) {
    $stmt = $db->prepare("INSERT OR IGNORE INTO challenges (level_num, title, description, sql_logic, correct_answer, hint_1) 
                          VALUES (:lvl, :title, :desc, :logic, :ans, :hint)");
    $stmt->bindValue(':lvl', $m['lvl']);
    $stmt->bindValue(':title', $m['title']);
    $stmt->bindValue(':desc', $m['desc']);
    $stmt->bindValue(':logic', $m['logic']);
    $stmt->bindValue(':ans', $m['ans']);
    $stmt->bindValue(':hint', $m['hint']);
    $stmt->execute();
}

echo "✅ 3_MISSIONS_LOADED: โจทย์พร้อมใช้งานแล้ว!";
?>