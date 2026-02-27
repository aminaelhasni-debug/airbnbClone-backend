const fs = require("fs");
const os = require("os");
const path = require("path");

const configuredDir = String(process.env.UPLOAD_DIR || "").trim();

const uploadsDir = configuredDir
  ? path.resolve(configuredDir)
  : process.env.NODE_ENV === "production"
    ? path.join(os.tmpdir(), "aibnb-uploads")
    : path.join(__dirname, "..", "uploads");

const ensureUploadsDir = () => {
  fs.mkdirSync(uploadsDir, { recursive: true });
};

module.exports = { uploadsDir, ensureUploadsDir };
