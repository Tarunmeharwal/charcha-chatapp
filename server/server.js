const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const socketHandler = require("./socket/socketHandler");

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    pingTimeout: 60000,
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        credentials: true,
    },
});

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/chats", require("./routes/chatRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/status", require("./routes/statusRoutes"));

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "Charcha server is running 🗣️" });
});

// Socket.io handler
socketHandler(io);

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("❌ GLOBAL ERROR:", err.stack);

    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Image is too large. Max size is 5MB." });
    }

    if (err.message === "Only image files are allowed") {
        return res.status(400).json({ message: err.message });
    }

    res.status(500).json({
        message: err.message || "An unexpected error occurred",
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`\n🗣️  Charcha Server running on port ${PORT}`);
    console.log(`📡 Socket.io ready for connections`);
    console.log(`🌐 API: http://localhost:${PORT}/api\n`);
});
