const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  city: { type: String, required: true },
  pricePerNight: { type: Number, required: true },
  image: { type: String }, // URL to the image
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Listing', listingSchema);