import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import auctionRoutes from "./routes/auctionRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { protect } from "./middleware/authMiddleware.js";
import { checkAndEndAuctions } from "./controllers/auctionController.js";
import { Auction } from "./models/Auction.js";
import startBotService from "./services/botService.js";

/* ================= FIX __dirname FOR ES MODULE ================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= LOAD ENV FILE ================= */

dotenv.config({ path: path.join(__dirname, "../.env") });

/* ================= EXPRESS APP ================= */

const app = express();
const server = http.createServer(app);

/* ================= SOCKET.IO ================= */

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);
global.io = io;

/* ================= MIDDLEWARES ================= */

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);
app.use(express.json());
app.use("/images", express.static("public/auction-images"));

/* ================= ROUTES ================= */

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BidGenie API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/auctions", auctionRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/users", userRoutes);

app.get("/api/protected", protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Protected route accessed",
    user: req.user,
  });
});

/* ================= GLOBAL ERROR HANDLER ================= */

app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

/* ================= DATABASE + SERVER START ================= */

const PORT = process.env.PORT || 5000;
const connectedUsers = new Map();

io.on("connection", (socket) => {
  socket.on("registerUser", (userId) => {
    if (!userId) return;
    const key = String(userId);
    if (!connectedUsers.has(key)) {
      connectedUsers.set(key, new Set());
    }
    connectedUsers.get(key).add(socket.id);
  });

  socket.on("disconnect", () => {
    for (const [userId, sockets] of connectedUsers.entries()) {
      sockets.delete(socket.id);
      if (!sockets.size) {
        connectedUsers.delete(userId);
      }
    }
  });
});

const startBackgroundJobs = () => {
  setInterval(async () => {
    try {
      await checkAndEndAuctions({ io, connectedUsers });
    } catch (error) {
      console.error("Timer Emit Error:", error.message);
    }
  }, 15000); // Check for expired auctions every 15 seconds
};

connectDB()
  .then(() => {
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use`);
      } else {
        console.error("Server failed to start:", err.message);
      }
      process.exit(1);
    });

    server.listen(PORT, () => {
      console.log(`BidGenie Server running on port ${PORT}`);
      startBotService(io);
    });

    startBackgroundJobs();
  })
  .catch((err) => {
    console.error("DB Connection Failed:", err.message);
    process.exit(1);
  });
