import { io } from 'socket.io-client';

// URL ของ Backend (สมมติว่าเป็น port 3000)
const SOCKET_URL = 'http://localhost:3000'; 

export const socket = io(SOCKET_URL, {
    autoConnect: true,
});