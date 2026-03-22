const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { protect, admin } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');

// Get active announcement
router.get('/', async (req, res) => {
  try {
    const announcement = await Announcement.findOne({ isActive: true }).sort({ createdAt: -1 });
    res.json(announcement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create/Update announcement
router.post('/', protect, admin, async (req, res) => {
  const { text, isActive } = req.body;
  try {
    // For simplicity, we just keep one active announcement or update the latest
    let announcement = await Announcement.findOne().sort({ createdAt: -1 });
    if (announcement) {
      announcement.text = text;
      announcement.isActive = isActive !== undefined ? isActive : true;
      await announcement.save();
    } else {
      announcement = new Announcement({ text, isActive });
      await announcement.save();
    }
    res.json(announcement);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
