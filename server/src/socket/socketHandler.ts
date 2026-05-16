import type { Server, Socket } from "socket.io";

/**
 * Wires Socket.IO event handlers used by the frontend for low-latency events:
 * - GPS updates from client
 * - Obstacle alerts (relayed across tabs of the same user, e.g. companion screen)
 * - Navigation state broadcasts
 */
export const registerSocketHandlers = (io: Server): void => {
  io.on("connection", (socket: Socket) => {
    const room = `client:${socket.handshake.auth?.clientId ?? socket.id}`;
    socket.join(room);

    if (process.env.NODE_ENV !== "test") {
      console.log(`[socket] connected ${socket.id} -> ${room}`);
    }

    socket.on("gps_update", (payload) => {
      socket.to(room).emit("gps_update", payload);
    });

    socket.on("obstacle_alert", (payload) => {
      socket.to(room).emit("obstacle_alert", payload);
    });

    socket.on("navigation_update", (payload) => {
      socket.to(room).emit("navigation_update", payload);
    });

    socket.on("disconnect", (reason) => {
      if (process.env.NODE_ENV !== "test") {
        console.log(`[socket] disconnected ${socket.id} (${reason})`);
      }
    });
  });
};
