const express = require('express');
const router = express.Router();
const ProductReview = require('../models/ProductReview');
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');

// Auth middleware
const auth = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'No authentication token, access denied' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// GET all reviews for a product
router.get('/:productId', async (req, res) => {
  try {
    const reviews = await ProductReview.find({ 
      product: req.params.productId,
      active: true 
    }).populate('user', 'name avatar');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new review
router.post('/', auth, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.id;

    // Check if user has a delivered order containing this product
    const deliveredOrder = await Order.findOne({
      user: userId,
      orderStatus: 'delivered',
      'items.product': productId
    });

    if (!deliveredOrder) {
      return res.status(403).json({ 
        message: 'You can only review products you have purchased and received.' 
      });
    }

    // Check if user already reviewed this product
    const existingReview = await ProductReview.findOne({
      product: productId,
      user: userId
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product.' });
    }

    const newReview = new ProductReview({
      product: productId,
      user: userId,
      rating,
      comment
    });

    await newReview.save();
    res.status(201).json(newReview);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
