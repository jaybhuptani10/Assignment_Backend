import "dotenv/config"; // Load env vars before anything else
import connectDB from "./db/index.js";
import app from "./app.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { initializeSocket } from "./sockets/index.js";

const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 8000;

    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: [
          "http://localhost:5173",
          "https://assignment-frontend-omega-flame.vercel.app", // Your deployed frontend
          process.env.CORS_ORIGIN,
        ].filter(Boolean),
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      },
    });

    app.set("io", io); // Make io accessible in controllers
    initializeSocket(io);

    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server: ", error);
    process.exit(1); // Exit with a failure code
  }
};

startServer();
