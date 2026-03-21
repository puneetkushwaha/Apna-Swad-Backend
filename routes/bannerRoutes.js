const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const { upload } = require('../middleware/cloudinaryConfig');
const jwt = require('jsonwebtoken');

// Auth middleware (simplified here, but should use the shared one)
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

// Public: Get all active banners
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({ active: true });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Add banner
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const banner = new Banner({
      imageUrl: req.file.path,
      title: req.body.title
    });
    await banner.save();
    res.json(banner);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Admin: Delete banner
router.delete('/:id', auth, async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Banner deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
