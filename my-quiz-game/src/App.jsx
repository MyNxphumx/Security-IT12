import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login/Login'; // ตรวจสอบว่า Path ตรงกับที่คุณวางไฟล์ไว้
import Dashboard from './views/Dashboard';
import AdminConsole from './views/AdminConsole';
import Handbook from './views/Handbook';
import DBExplorer from './views/DBExplorer';
import Challenge from './views/Challenge';
import Leaderboard from './views/Leaderboard';
import Register from './views/Register';
import TournamentRoom from './views/TournamentRoom';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. ถ้าเข้าหน้าเว็บเปล่าๆ (/) ให้กระโดดไปหน้า /login ทันที */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* 2. เส้นทางสำหรับหน้า Login */}
        <Route path="/login" element={<Login />} />
        <Route path="/Register" element={<Register />} />




        {/* 3. หน้า Dashboard (สร้าง Mockup ไว้ก่อน เพื่อให้กด Login แล้วไม่พัง) */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* 4. หน้า 404 กรณีพิมพ์ URL ผิด */}
        <Route path="*" element={<h1 style={{color: 'white'}}>404_NOT_FOUND</h1>} />

        <Route path="/admin" element={<AdminConsole />} />


        <Route path="/handbook" element={<Handbook />} />

        <Route path="/db-explorer" element={<DBExplorer />} />
        

        <Route path="/challenge/:level" element={<Challenge />} /> {/* :level คือ parameter */}
        <Route path="*" element={<div>404 NOT FOUND</div>} />

        <Route path="/leaderboard" element={<Leaderboard />} />

        <Route path="/challenge/:id" element={<Challenge />} />

      <Route path="/TournamentRoom/:roomId" element={<TournamentRoom />} />

      </Routes>
    </Router>
  );
}

export default App;