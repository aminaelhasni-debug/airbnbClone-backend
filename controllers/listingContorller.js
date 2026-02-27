const express = require("express");
const fs = require("fs");
const path = require("path");
const Listing = require("../models/listing");
const protect = require("../middleware/auth");
const router = express.Router();
const upload = require("../config/multerConfig");
const { cloudinary, hasCloudinaryConfig } = require("../config/cloudinary");
const { buildImageUrl } = require("../utils/imageUrl");
const { uploadsDir, ensureUploadsDir } = require("../config/uploadPaths");

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId || !hasCloudinaryConfig) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error.message);
  }
};

const uploadImageToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.path) return resolve(null);

    cloudinary.uploader
      .upload(file.path, {
        folder: "aibnb/listings",
        resource_type: "image",
      })
      .then(resolve)
      .catch(reject);
  });
};

const removeLocalUpload = (storedImagePath) => {
  if (!storedImagePath || typeof storedImagePath !== "string") return;
  if (!storedImagePath.startsWith("/uploads/")) return;

  const filename = path.basename(storedImagePath);
  const absolutePath = path.join(uploadsDir, filename);
  fs.unlink(absolutePath, () => {});
};

const storeDataUrlImage = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== "string") return "";
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return "";

  const mimeType = match[1];
  const base64Payload = match[2];
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

  try {
    ensureUploadsDir();
    const extension = extByMime[mimeType] || "";
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    const uploadPath = path.join(uploadsDir, fileName);
    fs.writeFileSync(uploadPath, Buffer.from(base64Payload, "base64"));
    return `/uploads/${fileName}`;
  } catch (error) {
    console.error("Failed to persist data URL image:", error.message);
    return "";
  }
};

const normalizeIncomingImage = (incomingImage) => {
  if (!incomingImage) return "";
  if (incomingImage.startsWith("data:image/")) {
    return storeDataUrlImage(incomingImage);
  }
  return incomingImage;
};

const extractIncomingImage = (req) => {
  const rawImage = typeof req.body?.image === "string" ? req.body.image.trim() : "";
  if (
    rawImage.startsWith("data:image/") ||
    rawImage.startsWith("https://") ||
    rawImage.startsWith("http://") ||
    rawImage.startsWith("/uploads/") ||
    rawImage.startsWith("uploads/")
  ) {
    return rawImage;
  }

  return "";
};

const formatListing = (listingDoc, req) => {
  const listing = listingDoc.toObject ? listingDoc.toObject() : listingDoc;
  listing.image = buildImageUrl(listing.image, req);
  return listing;
};

// CREATE listing with image
router.post(
  "/create/listing",
  protect,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, description, city, pricePerNight } = req.body;

      let image = normalizeIncomingImage(extractIncomingImage(req));
      let imagePublicId = "";

      if (req.file) {
        const newLocalImage = `/uploads/${req.file.filename}`;
        image = newLocalImage;
        if (hasCloudinaryConfig) {
          try {
            const uploadedImage = await uploadImageToCloudinary(req.file);
            if (uploadedImage?.secure_url) {
              image = uploadedImage.secure_url;
              imagePublicId = uploadedImage?.public_id || "";
              removeLocalUpload(newLocalImage);
            }
          } catch (uploadError) {
            console.error("Cloudinary upload failed, falling back to local file:", uploadError.message);
          }
        }
      }

      const listing = new Listing({
        title,
        description,
        city,
        pricePerNight,
        image,
        imagePublicId,
        owner: req.user.id,
      });
      await listing.save();
      res.status(201).json(formatListing(listing, req));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// GET all listings
router.get("/listings", async (req, res) => {
  try {
    const listings = await Listing.find().populate("owner", "name email");
    res.json(listings.map((listing) => formatListing(listing, req)));
  } catch (err) {
    console.error("Error fetching listings:", err);
    res.status(500).json({ message: "Failed to fetch listings", error: err.message });
  }
});

// GET my listings
router.get("/my/listings", protect, async (req, res) => {
  const listings = await Listing.find({ owner: req.user.id });
  res.json(listings.map((listing) => formatListing(listing, req)));
});

// GET single listing by id
router.get("/listing/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("owner", "name email");
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.json(formatListing(listing, req));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// UPDATE listing (optional: handle image)
router.put("/update/listing/:id", protect, upload.single("image"), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    const updateData = { ...req.body };
    delete updateData.image;
    Object.assign(listing, updateData);

    const incomingImage = extractIncomingImage(req);
    if (req.file) {
      const newLocalImage = `/uploads/${req.file.filename}`;
      if (hasCloudinaryConfig) {
        try {
          const uploadedImage = await uploadImageToCloudinary(req.file);
          if (uploadedImage?.secure_url) {
            await deleteCloudinaryImage(listing.imagePublicId);
            removeLocalUpload(newLocalImage);
            removeLocalUpload(listing.image);
            listing.image = uploadedImage.secure_url;
            listing.imagePublicId = uploadedImage.public_id || listing.imagePublicId;
          } else {
            await deleteCloudinaryImage(listing.imagePublicId);
            removeLocalUpload(listing.image);
            listing.image = newLocalImage;
            listing.imagePublicId = "";
          }
        } catch (uploadError) {
          console.error("Cloudinary upload failed, falling back to local file:", uploadError.message);
          await deleteCloudinaryImage(listing.imagePublicId);
          removeLocalUpload(listing.image);
          listing.image = newLocalImage;
          listing.imagePublicId = "";
        }
      } else {
        await deleteCloudinaryImage(listing.imagePublicId);
        removeLocalUpload(listing.image);
        listing.image = newLocalImage;
        listing.imagePublicId = "";
      }
    } else if (incomingImage) {
      const normalizedIncomingImage = normalizeIncomingImage(incomingImage);
      if (!normalizedIncomingImage) {
        return res.status(400).json({ message: "Invalid image payload" });
      }

      if (normalizedIncomingImage !== listing.image) {
        await deleteCloudinaryImage(listing.imagePublicId);
        removeLocalUpload(listing.image);
        listing.imagePublicId = "";
      }
      listing.image = normalizedIncomingImage;
    }

    await listing.save();
    res.json(formatListing(listing, req));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DELETE listing
router.delete("/delete/listing/:id", protect, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    await deleteCloudinaryImage(listing.imagePublicId);
    removeLocalUpload(listing.image);
    await Listing.deleteOne({ _id: req.params.id });
    res.json({ message: "Listing deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
