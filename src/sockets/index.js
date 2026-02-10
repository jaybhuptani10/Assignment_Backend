import cookie from "cookie";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

// Authenticated Socket Logic
export const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");
      const token = cookies.accessToken || socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      if (!decoded) {
        return next(new Error("Authentication error: Invalid token"));
      }

      const user = await User.findById(decoded._id).select(
        "-password -refreshToken",
      );
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user; // Attach user to socket
      next();
    } catch (err) {
      console.error("Socket Auth Error:", err.message);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Join personal room automatically
    socket.join(socket.user._id.toString());
    console.log(`User ${socket.user.username} joined room ${socket.user._id}`);

    // Join Admin room if admin
    if (socket.user.role === "Admin") {
      socket.join("Admin");
      console.log(`User ${socket.user.username} joined Admin room`);
    }

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.username}`);
    });
  });
};
