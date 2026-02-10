import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "https://assignment-frontend-omega-flame.vercel.app", // Your deployed frontend
  process.env.CORS_ORIGIN,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

import userRouter from "./routes/user.routes.js";
import taskRouter from "./routes/task.routes.js";
import inviteRouter from "./routes/invite.routes.js";
import logRouter from "./routes/log.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/tasks", taskRouter);
app.use("/api/v1/invites", inviteRouter);
app.use("/api/v1/logs", logRouter);

app.use("/", (req, res) => {
  res.json("API is running");
});

export default app;
