<?php
require_once "connect.php";

$missions = [
    [
        'lvl' => 1,
        'title' => 'Basic String Bypass',
        'desc' => 'เป้าหมายคือการข้ามการตรวจสอบ Username โดยใช้ Single Quote เพื่อปิดสตริง',
        'logic' => 'string',
        'target' => 'admin',
        'key' => "' OR '1'='1",
        'hint1' => "ลองใช้ ' OR '1'='1 เพื่อทำให้เงื่อนไขเป็นจริงเสมอ",
        'hint2' => "ช่องโหว่เกิดจากการไม่กรองเครื่องหมาย Single Quote"
    ],
    // ... เพิ่มด่านอื่นๆ ตามโครงสร้างใหม่ได้เลย
];

foreach ($missions as $m) {
    // ใช้ ON CONFLICT เพื่อป้องกันข้อมูลซ้ำ (Upsert)
    $sql = "INSERT INTO challenges (level_num, title, description, sql_logic, target_identifier, access_key, hint_1, hint_2) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (level_num) DO UPDATE SET 
            title = EXCLUDED.title, 
            description = EXCLUDED.description";
    
    $params = [
        $m['lvl'], $m['title'], $m['desc'], $m['logic'], 
        $m['target'], $m['key'], $m['hint1'], $m['hint2']
    ];

    $result = pg_query_params($conn, $sql, $params);

    if (!$result) {
        echo "❌ Error Level " . $m['lvl'] . ": " . pg_last_error($conn) . "<br>";
    }
}

echo "✅ DATA_SYNC_COMPLETE: ข้อมูลโหมดด่านใหม่ถูกบันทึกแล้ว!";
?>