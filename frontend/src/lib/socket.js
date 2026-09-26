import { io } from 'socket.io-client';

// In dev, Vite proxy handles /socket.io -> localhost:3000.
// The dashboard supplies the Supabase access token before connecting.
const socket = io(import.meta.env.VITE_SOCKET_URL || undefined, { autoConnect: false });

export default socket;
