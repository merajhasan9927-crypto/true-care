import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
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

const corsOptions = {
  origin: true, // Allows localhost:5173 and any deployed Netlify/Vercel frontend URL
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
};

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: corsOptions,
});

app.set("io", io);

io.on("connection", socket => {
  console.log(`⚡ Live Socket Connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`🔌 Socket Disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection (Supports MONGO_URI or Railway's MONGO_URL)
const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGO_URL ||
  "mongodb://127.0.0.1:27017/truecare";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err.message));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/diagnosis", aiRoutes);
app.use("/api/maps", mapsRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dispatch", dispatchRoutes);
app.use("/api/ehr", ehrRoutes);

// Health Check Endpoint
app.get("/", (req, res) => {
  res.status(200).json({ status: "TrueCare API & WebSocket Server Active" });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server & Real-Time Socket Engine running on port ${PORT}`);
});
