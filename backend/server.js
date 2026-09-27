import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import mapsRoutes from "./routes/mapsRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import dispatchRoutes from "./routes/dispatchRoutes.js";
import ehrRoutes from "./routes/ehrRoutes.js";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// 1. Socket.IO Configuration (permits WebSocket connections from any frontend origin)
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", socket => {
  console.log(`⚡ Live Socket Connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`🔌 Socket Disconnected: ${socket.id}`);
  });
});

// 2. Explicit CORS & Preflight Handling Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );

  // Instantly resolve browser preflight OPTIONS checks
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// 3. Body Parsing Middleware
app.use(express.json());

// 4. MongoDB Database Connection (Supports Railway MONGO_URL and local MONGO_URI)
const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGO_URL ||
  "mongodb://127.0.0.1:27017/truecare";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err.message));

// 5. Application Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/diagnosis", aiRoutes);
app.use("/api/maps", mapsRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dispatch", dispatchRoutes);
app.use("/api/ehr", ehrRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({ status: "TrueCare API & WebSocket Server Active" });
});

// 6. Server Initialization
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server & Real-Time Socket Engine running on port ${PORT}`);
});
