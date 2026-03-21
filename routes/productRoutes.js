const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, isBestSeller, sortBy, limit } = req.query;
    let query = {};
    if (category) query.category = category;
    if (isBestSeller === 'true') query.isBestSeller = true;

    let productsQuery = Product.find(query).populate('category');
    
    if (sortBy === 'salesCount') {
      productsQuery = productsQuery.sort({ salesCount: -1 });
    } else if (sortBy === 'newest') {
      productsQuery = productsQuery.sort({ createdAt: -1 });
    }

    if (limit) {
      productsQuery = productsQuery.limit(parseInt(limit));
    }

    if (req.query.skip) {
      productsQuery = productsQuery.skip(parseInt(req.query.skip));
    }

    const products = await productsQuery;
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
