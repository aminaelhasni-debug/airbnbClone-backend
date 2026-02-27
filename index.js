const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
require("dotenv").config();
const cors = require("cors");
const userController = require("./controllers/userController");
const listingController = require("./controllers/listingContorller");
const bookingController = require("./controllers/bookingController");
const { uploadsDir, ensureUploadsDir } = require("./config/uploadPaths");

const app = express();
const MONGODB_URI = process.env.MONGODB_URI || process.env.dbconnect;
let dbConnectionPromise = null;

const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!MONGODB_URI) {
    throw new Error("Missing MongoDB connection string (MONGODB_URI or dbconnect).");
  }

  if (!dbConnectionPromise) {
    dbConnectionPromise = mongoose
      .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      })
      .catch((error) => {
        dbConnectionPromise = null;
        throw error;
      });
  }

  return dbConnectionPromise;
};

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://vercel.live"],
        connectSrc: ["'self'", "https://vercel.live", "mongodb+srv:"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

app.use(cors());
app.use(express.json());
ensureUploadsDir();
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(uploadsDir, {
    etag: false,
    lastModified: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

connectToDatabase()
  .then(() => console.log("MongoDB connected successfully"))
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

// Ensure DB is connected before route handlers run.
app.use(async (req, res, next) => {
  if (req.path === "/test") {
    return next();
  }

  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error("Database unavailable:", error.message);
    res.status(503).json({
      message: "Database unavailable. Please try again in a minute.",
      error: error.message,
    });
  }
});

app.use("/", userController);
app.use("/", listingController);
app.use("/", bookingController);

app.get("/test", (req, res) => {
  res.json({
    message: "hello test page",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { error: err }),
  });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
