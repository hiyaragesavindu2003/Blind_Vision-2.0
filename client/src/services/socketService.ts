import { io, type Socket } from "socket.io-client";

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ??
  import.meta.env.VITE_BACKEND_URL ??
  "http://localhost:3001";

let socket: Socket | null = null;

/**
 * Returns a singleton Socket.IO client. Lazy-creates on first call.
 */
export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(socketUrl, {
      path: "/socket",
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
