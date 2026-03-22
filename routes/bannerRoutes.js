const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const { protect, admin } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/cloudinaryConfig');

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
router.post('/', protect, admin, upload.single('image'), async (req, res) => {
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
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Banner deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
