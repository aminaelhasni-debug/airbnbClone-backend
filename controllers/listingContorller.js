const express = require("express");
const Listing = require("../models/listing");
const protect = require("../middleware/auth");
const router = express.Router();
const upload = require("../config/multerConfig");
const fs = require("fs");
const path = require("path");


// Helper to delete old image
const deleteImageFile = (imagePath) => {
  if (!imagePath) return;
  try {
    const fullPath = path.join(__dirname, "..", imagePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (err) {
    console.error("Error deleting image:", err);
  }
};

// CREATE listing with image
router.post(
  "/create/listing",
  protect,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, description, city, pricePerNight } = req.body;
      const listing = new Listing({
        title,
        description,
        city,
        pricePerNight,
        image: req.file ? `/uploads/${req.file.filename}` : "",
        owner: req.user.id,
      });
      await listing.save();
      res.status(201).json(listing);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// GET all listings
router.get("/listings", async (req, res) => {
  const listings = await Listing.find().populate("owner", "name email");
  res.json(listings);
});

// GET my listings
router.get("/my/listings", protect, async (req, res) => {
  const listings = await Listing.find({ owner: req.user.id });
  res.json(listings);
});

// GET single listing by id
router.get("/listing/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("owner", "name email");
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.json(listing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE listing (optional: handle image)
router.put("/update/listing/:id", protect, upload.single("image"), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    // delete old image if new one uploaded
    if (req.file && listing.image) deleteImageFile(listing.image);

    Object.assign(listing, req.body);
    if (req.file) listing.image = `/uploads/${req.file.filename}`;

    await listing.save();
    res.json(listing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE listing
router.delete("/delete/listing/:id", protect, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    // delete image file
    if (listing.image) deleteImageFile(listing.image);

    await listing.remove();
    res.json({ message: "Listing deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;


