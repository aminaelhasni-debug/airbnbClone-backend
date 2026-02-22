const express = require("express");
const Booking = require("../models/booking");
const protect = require("../middleware/auth");

const router = express.Router();

// CREATE booking
router.post("/create/booking", protect, async (req, res) => {
  try {
    const { listingId, startDate, endDate } = req.body;

    const booking = new Booking({
      user: req.user.id,
      listing: listingId,
      startDate,
      endDate,
    });

    await booking.save();
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET my bookings
router.get("/my/bookings", protect, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email")
      .populate({
        path: "listing",
        match: { owner: req.user.id },
        select: "title city pricePerNight image",
      });

    const result = bookings.filter(b => b.listing);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ DELETE booking (NOW REGISTERED)
router.delete("/booking/:id", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await booking.deleteOne();
    res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
