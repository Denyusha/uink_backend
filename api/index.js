const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const serverless = require("serverless-http");

dotenv.config();

const app = express();

// CORS setup: Allow localhost frontend during development
// and fallback to allowing all origins in production
const allowedOrigins = [
  "http://localhost:3000",           // React dev server
  "https://unfold-ink2-0.vercel.app", // Add your real frontend URL here
];

// Use CORS middleware with dynamic origin based on request origin
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like Postman) or from allowedOrigins list
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies/auth headers
}));

app.use(express.json());

// MongoDB connection setup
let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false,
    });

    isConnected = db.connections[0].readyState === 1;
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}

// Middleware to ensure MongoDB connection per request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ message: "MongoDB connection failed", error: err.message });
  }
});

// Routes
app.get("/", (req, res) => {
  res.send("✅ Backend is running on Vercel");
});

app.get("/favicon.ico", (req, res) => res.status(204).end());

// Import route handlers
const authRoutes = require("../routes/authRoutes");
const blogRoutes = require("../routes/blogRoutes");
const userRoutes = require("../routes/userRoutes");

// Use route handlers
app.use("/api/auth", authRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/users", userRoutes);

// Export for Vercel
module.exports = app;
module.exports.handler = serverless(app);
