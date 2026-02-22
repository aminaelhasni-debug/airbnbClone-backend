const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
require('dotenv').config();
const cors = require('cors');
const userController = require("./controllers/userController");
const listingController = require("./controllers/listingContorller");
const bookingController = require("./controllers/bookingController");
const path = require('path');

const app = express();

// Helmet with CSP configuration to allow Vercel scripts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://vercel.live"],
      connectSrc: ["'self'", "https://vercel.live", "mongodb+srv:"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Middleware
app.use(cors());
app.use(express.json());

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection with error handling
mongoose.connect(process.env.MONGODB_URI || process.env.dbconnect)
  .then(() => console.log("✓ MongoDB connected successfully"))
  .catch((error) => {
    console.error("✗ MongoDB connection error:", error.message);
    // Don't exit process - let Vercel handle retries
  });

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Routes
app.use("/", userController);
app.use("/", listingController);
app.use("/", bookingController);

// Health check endpoint
app.get("/test", (req, res) => {
  res.json({ 
    message: "hello test page",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ 
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === 'development' && { error: err })
  });
});

// Local development server (not used on Vercel)
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export app for Vercel serverless
module.exports = app;