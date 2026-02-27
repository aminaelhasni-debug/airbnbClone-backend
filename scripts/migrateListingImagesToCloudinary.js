require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Listing = require("../models/listing");
const { cloudinary, hasCloudinaryConfig, missingCloudinaryEnvVars } = require("../config/cloudinary");
const { uploadsDir } = require("../config/uploadPaths");

const getMongoUri = () => process.env.MONGODB_URI || process.env.dbconnect;

const resolveLocalImagePath = (imageValue) => {
  if (!imageValue || typeof imageValue !== "string") return "";
  const value = imageValue.trim();
  if (!value) return "";

  const filename = path.basename(value);
  const candidates = [
    path.join(uploadsDir, filename),
    path.join(__dirname, "..", "uploads", filename),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return "";
};

const isLocalImageRef = (imageValue) => {
  if (!imageValue || typeof imageValue !== "string") return false;
  const value = imageValue.trim();
  if (!value) return false;
  if (value.startsWith("http://") || value.startsWith("https://")) return false;
  if (value.startsWith("data:image/")) return false;
  if (value.startsWith("/uploads/") || value.startsWith("uploads/")) return true;
  return /^[^/\\]+\.(jpg|jpeg|png|webp|gif|bmp|svg|avif)$/i.test(value);
};

const uploadToCloudinary = async (filePath) => {
  return cloudinary.uploader.upload(filePath, {
    folder: "aibnb/listings",
    resource_type: "image",
  });
};

const run = async () => {
  const mongoUri = getMongoUri();
  if (!mongoUri) {
    throw new Error("Missing MongoDB URI. Set MONGODB_URI or dbconnect in .env");
  }

  if (!hasCloudinaryConfig) {
    throw new Error(
      `Missing Cloudinary env vars: ${missingCloudinaryEnvVars.join(", ")}`
    );
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  });

  const listings = await Listing.find({
    image: { $exists: true, $ne: null, $ne: "" },
  });

  let scanned = 0;
  let migrated = 0;
  let skipped = 0;
  let missing = 0;
  let failed = 0;

  for (const listing of listings) {
    scanned += 1;
    const currentImage = String(listing.image || "").trim();

    if (!isLocalImageRef(currentImage)) {
      skipped += 1;
      continue;
    }

    const localPath = resolveLocalImagePath(currentImage);
    if (!localPath) {
      missing += 1;
      console.warn(`[missing] Listing ${listing._id}: file not found for "${currentImage}"`);
      continue;
    }

    try {
      const uploaded = await uploadToCloudinary(localPath);
      listing.image = uploaded.secure_url;
      listing.imagePublicId = uploaded.public_id || listing.imagePublicId || "";
      await listing.save();
      migrated += 1;
      console.log(`[migrated] Listing ${listing._id} -> ${uploaded.secure_url}`);
    } catch (error) {
      failed += 1;
      console.error(`[failed] Listing ${listing._id}: ${error.message}`);
    }
  }

  console.log("Migration complete");
  console.log(
    JSON.stringify(
      { scanned, migrated, skipped, missing, failed },
      null,
      2
    )
  );
};

run()
  .catch((error) => {
    console.error("Migration error:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
