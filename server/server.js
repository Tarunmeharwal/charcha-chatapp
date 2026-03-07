const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const socketHandler = require("./socket/socketHandler");

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Production security settings
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

// Socket.io setup
const io = new Server(server, {
    pingTimeout: 60000,
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        credentials: true,
    },
});

// Helmet for security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting strictly for Auth
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: "Too many attempts from this IP, please try again after 15 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiter
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);

// CORS setup
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
}));

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
