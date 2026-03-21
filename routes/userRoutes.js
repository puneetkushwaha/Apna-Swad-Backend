const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { upload } = require('../middleware/cloudinaryConfig');

// Middleware for user auth
const userAuth = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Update User Pincode (Quick update)
router.post('/pincode', userAuth, async (req, res) => {
  const { pincode } = req.body;
  try {
    const user = await User.findByIdAndUpdate(req.userId, { pincode }, { returnDocument: 'after' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update Full Profile
router.put('/profile', userAuth, async (req, res) => {
  try {
    const updateData = req.body;
    // Don't allow updating sensitive fields here
    delete updateData.password;
    delete updateData.role;
    delete updateData.email;

    const user = await User.findByIdAndUpdate(req.userId, updateData, { returnDocument: 'after' }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update Avatar
router.post('/avatar', userAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const user = await User.findByIdAndUpdate(req.userId, { avatar: req.file.path }, { returnDocument: 'after' }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get User Profile
router.get('/profile', userAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Sync Cart for Abandoned Cart recovery
router.post('/sync-cart', userAuth, async (req, res) => {
  try {
    const { cartItems } = req.body;
    // Map frontend items to backend structure
    const cart = cartItems.map(item => ({
      productId: item._id,
      quantity: item.quantity,
      name: item.name,
      price: item.price,
      image: item.image
    }));
    
    const user = await User.findByIdAndUpdate(
      req.userId, 
      { cart, lastCartUpdate: new Date() }, 
      { returnDocument: 'after' }
    );
    res.json({ success: true, cartCount: user.cart.length });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
