<?php

$conn = pg_connect("
host=aws-1-ap-northeast-1.pooler.supabase.com
port=6543
dbname=postgres
user=postgres.vspweliwshzsdllrdkrq
password=Myphumx0193
sslmode=require
");

if (!$conn) {
    die("Database connection failed");
}

?>