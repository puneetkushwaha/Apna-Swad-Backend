const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { createNotification } = require('../controllers/notificationController');

// Submit contact form
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const contact = new Contact({ name, email, subject, message });
    await contact.save();

    // Create a notification for the admin (optional, assuming we have a way to notify admin)
    // For now, we'll just log or use existing notification system if applicable
    
    res.status(201).json({ success: true, message: 'Message received' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
