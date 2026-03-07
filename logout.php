<?php
session_start();
session_destroy();
header("Location: login_real.php");
?>

<?php
session_start();
session_destroy();
header("Location: login_real.php");
exit();
?>