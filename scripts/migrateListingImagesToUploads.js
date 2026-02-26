const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();
const Listing = require("../models/listing");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const extByMime = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/bmp": ".bmp",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
};

const persistDataUrl = (dataUrl) => {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return "";

  const mimeType = match[1];
  const base64Payload = match[2];
  const extension = extByMime[mimeType] || "";
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
  const absolutePath = path.join(uploadDir, fileName);
  fs.writeFileSync(absolutePath, Buffer.from(base64Payload, "base64"));
  return `/uploads/${fileName}`;
};

const run = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.dbconnect;
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI or dbconnect in environment.");
  }

  await mongoose.connect(mongoUri);

  const listings = await Listing.find({ image: { $regex: "^data:image/" } });
  let migratedCount = 0;

  for (const listing of listings) {
    const nextImagePath = persistDataUrl(listing.image);
    if (!nextImagePath) continue;

    listing.image = nextImagePath;
    listing.imagePublicId = "";
    await listing.save();
    migratedCount += 1;
  }

  console.log(`Migrated ${migratedCount} listing image(s) to /uploads paths.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Migration failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
