const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const jwt = require('jsonwebtoken');

// Middleware for admin auth (simplified for this route)
const adminAuth = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Admin role required.' });
    }
    req.adminId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

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
router.post('/', adminAuth, async (req, res) => {
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
