const express = require("express");
const Listing = require("../models/listing");
const protect = require("../middleware/auth");
const router = express.Router();
const upload = require("../config/multerConfig");
const { buildImageUrl } = require("../utils/imageUrl");

const toDataUrl = (file) => {
  if (!file || !file.buffer || !file.mimetype) return "";
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
};

const extractIncomingImage = (req) => {
  if (req.file) return toDataUrl(req.file);

  if (Array.isArray(req.files) && req.files.length > 0) {
    return toDataUrl(req.files[0]);
  }

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
  upload.any(),
  async (req, res) => {
    try {
      const { title, description, city, pricePerNight } = req.body;
      const image = extractIncomingImage(req);

      const listing = new Listing({
        title,
        description,
        city,
        pricePerNight,
        image,
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
router.put("/update/listing/:id", protect, upload.any(), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    const updateData = { ...req.body };
    delete updateData.image;
    Object.assign(listing, updateData);

    const incomingImage = extractIncomingImage(req);
    if (incomingImage) listing.image = incomingImage;

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

    await Listing.deleteOne({ _id: req.params.id });
    res.json({ message: "Listing deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;


