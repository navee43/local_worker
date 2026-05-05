require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const passport = require("passport");
require("./config/passport");

const { connectToMongoDB } = require("./config/dbconnect");
const authRouter = require("./routers/Authrouter");
const workerRouter = require("./routers/Workerrouter");
const employerRouter = require("./routers/Employerrouter");

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  },
});

app.use((req, _res, next) => {
  req.io = io;
  next();
});

// Track connected sockets by userId
const connectedWorkers = {};
const connectedEmployers = {};

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("register_worker", (userId) => {
    if (userId) {
      connectedWorkers[userId] = socket.id;
      console.log(`Worker ${userId} registered on socket ${socket.id}`);
    }
  });

  socket.on("register_employer", (userId) => {
    if (userId) {
      connectedEmployers[userId] = socket.id;
      console.log(`Employer ${userId} registered on socket ${socket.id}`);
    }
  });

  socket.on("disconnect", () => {
    for (const [uid, sid] of Object.entries(connectedWorkers)) {
      if (sid === socket.id) delete connectedWorkers[uid];
    }
    for (const [uid, sid] of Object.entries(connectedEmployers)) {
      if (sid === socket.id) delete connectedEmployers[uid];
    }
    console.log("Socket disconnected:", socket.id);
  });
});

// Export so controllers can use
module.exports.emitToWorker = (userId, event, data) => {
  const sid = connectedWorkers[userId?.toString()];
  if (sid) io.to(sid).emit(event, data);
};

module.exports.emitToEmployer = (userId, event, data) => {
  const sid = connectedEmployers[userId?.toString()];
  if (sid) io.to(sid).emit(event, data);
};

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  }),
);
// app.options("*", cors());

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/worker", workerRouter);
app.use("/api/employer", employerRouter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ status: "✅ KaamSetu API running" });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `${req.method} ${req.path} not found` });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Server Error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
connectToMongoDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`\n🚀 KaamSetu API → http://localhost:${PORT}`);
      console.log(`⚡ Socket.IO enabled\n`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
