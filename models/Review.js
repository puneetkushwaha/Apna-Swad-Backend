const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  profileIcon: { type: String },
  text: { type: String },
  videoUrl: { type: String },
  type: { type: String, enum: ['text', 'video'], default: 'text' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);
