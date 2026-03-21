const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  oldPrice: { type: Number },
  weight: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  image: { type: String, required: true },
  images: [String], // Gallery images
  hoverImage: { type: String },
  tags: [String],
  rating: { type: Number, default: 5 },
  reviews: { type: Number, default: 0 },
  salesCount: { type: Number, default: 0 },
  isBestSeller: { type: Boolean, default: false },
  shelfLife: { type: String }, // e.g., "90 days"
  storageInstructions: { type: String }, // e.g., "Store in a cool, dry place"
  hasPreservatives: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
