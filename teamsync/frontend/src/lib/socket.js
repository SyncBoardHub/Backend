import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || '';
const socket = io(API_BASE || window.location.origin);

export default socket;
