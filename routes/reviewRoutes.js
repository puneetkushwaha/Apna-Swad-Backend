const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { upload } = require('../middleware/cloudinaryConfig');
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Public: Get all active reviews
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find({ active: true });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Add review (supports image for profile icon OR video file)
// Note: Multer field names must match frontend
router.post('/', auth, upload.fields([{ name: 'profileIcon', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const reviewData = {
      name: req.body.name,
      text: req.body.text,
      type: req.body.type
    };
    if (req.files['profileIcon']) {
      reviewData.profileIcon = req.files['profileIcon'][0].path;
    }
    if (req.files['video']) {
      reviewData.videoUrl = req.files['video'][0].path;
    }
    const review = new Review(reviewData);
    await review.save();
    res.json(review);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Admin: Delete review
router.delete('/:id', auth, async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
