const express = require("express");
const Listing = require("../models/listing");
const protect = require("../middleware/auth");
const router = express.Router();
const upload = require("../config/multerConfig");
const { cloudinary, hasCloudinaryConfig } = require("../config/cloudinary");
const { buildImageUrl } = require("../utils/imageUrl");

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId || !hasCloudinaryConfig) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error.message);
  }
};

const toDataUrl = (file) => {
  if (!file || !file.buffer || !file.mimetype) return "";
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
};

const uploadImageToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.buffer) return resolve(null);

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "aibnb/listings",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(file.buffer);
  });
};

const extractIncomingImage = (req) => {
  const rawImage = typeof req.body?.image === "string" ? req.body.image.trim() : "";
  if (
    rawImage.startsWith("data:image/") ||
    rawImage.startsWith("https://") ||
    rawImage.startsWith("http://") ||
    rawImage.startsWith("/uploads/")
  ) {
    return rawImage;
  }

  return "";
};

const formatListing = (listingDoc) => {
  const listing = listingDoc.toObject ? listingDoc.toObject() : listingDoc;
  listing.image = buildImageUrl(listing.image);
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

      let image = extractIncomingImage(req);
      let imagePublicId = "";

      if (req.file) {
        if (hasCloudinaryConfig) {
          try {
            const uploadedImage = await uploadImageToCloudinary(req.file);
            image = uploadedImage?.secure_url || image;
            imagePublicId = uploadedImage?.public_id || "";
          } catch (uploadError) {
            console.error("Cloudinary upload failed, falling back to data URL:", uploadError.message);
            image = toDataUrl(req.file);
          }
        } else {
          image = toDataUrl(req.file);
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
      res.status(201).json(formatListing(listing));
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
    res.json(listings.map(formatListing));
  } catch (err) {
    console.error("Error fetching listings:", err);
    res.status(500).json({ message: "Failed to fetch listings", error: err.message });
  }
});

// GET my listings
router.get("/my/listings", protect, async (req, res) => {
  const listings = await Listing.find({ owner: req.user.id });
  res.json(listings.map(formatListing));
});

// GET single listing by id
router.get("/listing/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("owner", "name email");
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.json(formatListing(listing));
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
      if (hasCloudinaryConfig) {
        try {
          const uploadedImage = await uploadImageToCloudinary(req.file);
          if (uploadedImage?.secure_url) {
            await deleteCloudinaryImage(listing.imagePublicId);
            listing.image = uploadedImage.secure_url;
            listing.imagePublicId = uploadedImage.public_id || listing.imagePublicId;
          }
        } catch (uploadError) {
          console.error("Cloudinary upload failed, falling back to data URL:", uploadError.message);
          listing.image = toDataUrl(req.file);
          listing.imagePublicId = "";
        }
      } else {
        listing.image = toDataUrl(req.file);
        listing.imagePublicId = "";
      }
    } else if (incomingImage) {
      listing.image = incomingImage;
    }

    await listing.save();
    res.json(formatListing(listing));
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
    await Listing.deleteOne({ _id: req.params.id });
    res.json({ message: "Listing deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;


