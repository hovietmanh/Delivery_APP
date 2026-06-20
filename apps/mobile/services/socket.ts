import { io, Socket } from 'socket.io-client';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/v1')
  .replace('/v1', '');

let socket: Socket | null = null;

export function getTrackingSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = io(`${BASE_URL}/tracking`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
