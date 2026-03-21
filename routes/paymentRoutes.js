const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Order
router.post('/create-order', async (req, res) => {
  const { amount, currency } = req.body;
  console.log('Payment Create Order Request:', { amount, currency });
  try {
    const options = {
      amount: Math.round(amount * 100), // amount in the smallest currency unit
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error('Razorpay Order Creation Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Verify Payment
router.post('/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generated_signature = hmac.digest('hex');

  if (generated_signature === razorpay_signature) {
    // If orderId is provided, update payment status and sync with Shiprocket
    if (req.body.orderId) {
      const Order = require('../models/Order');
      const User = require('../models/User');
      const shiprocketService = require('../services/shiprocketService');

      try {
        const order = await Order.findById(req.body.orderId);
        if (order) {
          order.paymentStatus = 'completed';
          order.razorpayPaymentId = razorpay_payment_id;
          await order.save();

          const user = await User.findById(order.user);
          await shiprocketService.syncOrder(order, user);
        }
      } catch (err) {
        console.error('Error during payment verification post-processing:', err);
      }
    }
    res.json({ status: 'success' });
  } else {
    res.status(400).json({ status: 'failure' });
  }
});

module.exports = router;
