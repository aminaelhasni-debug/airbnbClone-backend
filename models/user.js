const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed
}, { timestamps: true }); // automatically adds createdAt and updatedAt

module.exports = mongoose.model('User', userSchema);