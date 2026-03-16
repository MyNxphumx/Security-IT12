import { io } from "socket.io-client";
import { API } from "./config";

const socket = io(API, {
  autoConnect: true,
  reconnection: true
});

export default socket;