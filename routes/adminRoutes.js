const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { sendBulkEmail } = require('../services/emailService');
const { createNotification } = require('../controllers/notificationController');

const PromotionSetting = require('../models/PromotionSetting');
const Coupon = require('../models/Coupon');
const { upload } = require('../middleware/cloudinaryConfig');

// Admin Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body; // username here is email
  try {
    const user = await User.findOne({ email: username, role: 'admin' });
    if (!user) return res.status(401).json({ message: 'Access denied. Admins only.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const { protect, admin } = require('../middleware/authMiddleware');

// Category CRUD
router.post('/categories', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const categoryData = req.body;
    if (req.file) {
      categoryData.image = req.file.path;
    }
    const category = new Category(categoryData);
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/categories/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const categoryData = req.body;
    if (req.file) {
      categoryData.image = req.file.path;
    }
    const category = await Category.findByIdAndUpdate(req.params.id, categoryData, { returnDocument: 'after' });
    res.json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/categories/:id', protect, admin, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Product CRUD - Added gallery support
router.post('/products', protect, admin, upload.fields([
  { name: 'image', maxCount: 1 }, 
  { name: 'hoverImage', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]), async (req, res) => {
  try {
    const productData = req.body;
    
    // Handle main images
    if (req.files) {
      if (req.files.image) productData.image = req.files.image[0].path;
      if (req.files.hoverImage) productData.hoverImage = req.files.hoverImage[0].path;
      
      // Handle gallery images
      if (req.files.gallery) {
        productData.images = req.files.gallery.map(file => file.path);
      }
    }

    // Handle tags if sent as string
    if (typeof productData.tags === 'string' && productData.tags.trim()) {
      productData.tags = productData.tags.split(',').map(t => t.trim());
    } else if (!productData.tags) {
      productData.tags = [];
    }

    const product = new Product(productData);
    await product.save();

    // Trigger Email if Best Seller
    if (product.tags && (product.tags.includes('Best Seller') || product.tags.includes('Bestseller'))) {
      try {
        const users = await User.find({ role: 'user' }).select('email');
        const emails = users.map(u => u.email).filter(e => e);
        if (emails.length > 0) {
          await sendBulkEmail(
            emails, 
            'New Best Seller Alert! 🔥', 
            `New Arrival: ${product.name}`, 
            `Our new ${product.name} has arrived and it's already a favorite! Grab yours before it's gone.`
          );
        }
      } catch (emailError) {
        console.error('Failed to send best seller email:', emailError);
      }
    }

    res.json(product);
  } catch (err) {
    console.error('Product POST Error:', err.message);
    res.status(400).json({ message: err.message });
  }
});

router.put('/products/:id', protect, admin, upload.fields([
  { name: 'image', maxCount: 1 }, 
  { name: 'hoverImage', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]), async (req, res) => {
  try {
    const productData = req.body;
    
    if (req.files) {
      if (req.files.image) productData.image = req.files.image[0].path;
      if (req.files.hoverImage) productData.hoverImage = req.files.hoverImage[0].path;
    }

    // Handle Gallery Merging (independent of req.files presence)
    if ((req.files && req.files.gallery) || req.body.existingImages) {
      let currentImages = [];
      
      // Add existing images from the body
      if (req.body.existingImages) {
        try {
          currentImages = typeof req.body.existingImages === 'string' 
            ? JSON.parse(req.body.existingImages) 
            : req.body.existingImages;
        } catch (e) {
          console.error('Error parsing existingImages:', e);
        }
      }

      // Add new images if any
      if (req.files && req.files.gallery) {
        const newImages = req.files.gallery.map(file => file.path);
        currentImages = [...currentImages, ...newImages];
      }

      productData.images = currentImages;
    }

    if (typeof productData.tags === 'string' && productData.tags.trim()) {
      productData.tags = productData.tags.split(',').map(t => t.trim());
    }

    const product = await Product.findByIdAndUpdate(req.params.id, productData, { returnDocument: 'after' });
    res.json(product);
  } catch (err) {
    console.error('Product PUT Error:', err.message);
    res.status(400).json({ message: err.message });
  }
});

router.delete('/products/:id', protect, admin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Bulk Email Endpoint
router.post('/bulk-email', protect, admin, async (req, res) => {
  const { subject, title, body } = req.body;
  if (!subject || !title || !body) {
    return res.status(400).json({ message: 'Subject, Title, and Body are required' });
  }

  try {
    const users = await User.find({ role: 'user' }).select('email');
    const emails = users.map(u => u.email).filter(e => e);
    
    if (emails.length === 0) {
      return res.status(400).json({ message: 'No users found to send email to' });
    }

    await sendBulkEmail(emails, subject, title, body);

    // Also create a system notification for all users
    for (const userEmail of emails) {
        const user = await User.findOne({ email: userEmail });
        if (user) {
            await createNotification({
                recipient: user._id.toString(),
                type: 'system',
                title: title,
                message: subject,
                link: '/'
            });
        }
    }

    res.json({ success: true, message: `Email sent to ${emails.length} users` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Get Promo Settings
// @route   GET /api/admin/promo-settings
// @access  PrivateAdmin
router.get('/promo-settings', protect, admin, async (req, res) => {
  try {
    let settings = await PromotionSetting.findOne({ settingId: 'global_promo_config' });
    if (!settings) {
      settings = await PromotionSetting.create({ settingId: 'global_promo_config' });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Update Promo Settings
// @route   PUT /api/admin/promo-settings
// @access  PrivateAdmin
router.put('/promo-settings', protect, admin, async (req, res) => {
  try {
    const settings = await PromotionSetting.findOneAndUpdate(
      { settingId: 'global_promo_config' },
      req.body,
      { upsert: true, new: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Get All Coupons (Recent)
// @route   GET /api/admin/coupons
// @access  PrivateAdmin
router.get('/coupons', protect, admin, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).limit(50);
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Bulk Generate Coupons
// @route   POST /api/admin/coupons/bulk
// @access  PrivateAdmin
router.post('/coupons/bulk', protect, admin, async (req, res) => {
  const { quantity, prefix, discountValue, discountType, expiryDate, maxUses } = req.body;
  if (!quantity || !discountValue) {
    return res.status(400).json({ message: 'Quantity and discountValue are required' });
  }

  try {
    const { quantity, prefix, discountType, discountValue, expiryDate, maxUses } = req.body;
    const coupons = [];

    if (quantity === 1) {
      // Create a single specific global code
      const existing = await Coupon.findOne({ code: prefix.toUpperCase() });
      if (existing) {
        return res.status(400).json({ message: `Coupon code '${prefix}' already exists. Please use a different name.` });
      }
      coupons.push({
        code: prefix.toUpperCase(),
        discountType,
        discountValue,
        expiryDate: expiryDate || null,
        maxUses: maxUses || 99999,
        createdBy: req.user._id
      });
    } else {
      // Bulk generation with random suffix
      for (let i = 0; i < quantity; i++) {
        const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
        const code = `${prefix || 'PROMO'}${randomPart}`;
        coupons.push({
          code,
          discountType,
          discountValue,
          expiryDate: expiryDate || null,
          maxUses: 1, // Individual codes usually mean single use
          createdBy: req.user._id
        });
      }
    }

    // Insert many but ignore duplicates if any random collisions occur (rare but good to handle)
    await Coupon.insertMany(coupons, { ordered: false }).catch(err => {
        // Log errors but continue if some failed (e.g. duplicate code)
        console.error('Some coupons failed to insert (possibly duplicates):', err.message);
    });

    res.json({ message: `Successfully activated ${quantity === 1 ? 'Global' : quantity} coupon(s).` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
