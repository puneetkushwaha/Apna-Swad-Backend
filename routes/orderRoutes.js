const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect } = require('../middleware/authMiddleware');
const { createNotification } = require('../controllers/notificationController');
const { sendOrderConfirmation, sendStatusUpdate } = require('../services/emailService');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { items, totalAmount, shippingAddress } = req.body;

    if (items && items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }

    const order = new Order({
      user: req.user._id,
      items,
      totalAmount,
      shippingAddress,
      paymentMethod: req.body.paymentMethod || 'Razorpay',
      paymentStatus: req.body.paymentStatus || 'pending',
      razorpayOrderId: req.body.razorpayOrderId,
      razorpayPaymentId: req.body.razorpayPaymentId
    });

    const createdOrder = await order.save();

    // Notify Admin
    await createNotification({
      recipient: 'admin',
      type: 'order_placed',
      title: 'New Order Received',
      message: `A new order has been placed by ${req.user.name}. Total amount: Rs. ${totalAmount}`,
      link: `/admin/orders/${createdOrder._id}`,
      metadata: { orderId: createdOrder._id }
    });

    // Send Order Confirmation Email to User
    try {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);
      await sendOrderConfirmation(user.email, createdOrder);
      
      // Also notify Admin via email
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await sendOrderConfirmation(admin.email, createdOrder, true);
      }
    } catch (emailError) {
      console.error('Email sending failed during order confirmation:', emailError);
    }
    if (createdOrder.paymentMethod === 'COD' || createdOrder.paymentStatus === 'completed') {
      const shiprocketService = require('../services/shiprocketService');
      const User = require('../models/User');
      try {
        const user = await User.findById(req.user._id);
        await shiprocketService.syncOrder(createdOrder, user);
      } catch (syncError) {
        console.error('Shiprocket Sync Error during order creation:', syncError);
      }
    }

    res.status(201).json(createdOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
router.get('/myorders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (order) {
      // Check if user is order owner or admin
      if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(401).json({ message: 'Not authorized' });
      }
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  PrivateAdmin
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
    const orders = await Order.find({}).populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Update order status and tracking (Admin only)
// @route   PUT /api/orders/:id/status
// @access  PrivateAdmin
router.put('/:id/status', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
    const { orderStatus, trackingId, carrierName } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
      order.orderStatus = orderStatus || order.orderStatus;
      order.trackingId = trackingId || order.trackingId;
      order.carrierName = carrierName || order.carrierName;

      const updatedOrder = await order.save();

      // Notify User
      await createNotification({
        recipient: order.user.toString(),
        type: 'status_update',
        title: 'Order Status Updated',
        message: `Your order #${order._id.toString().slice(-6)} status has been updated to: ${orderStatus}`,
        link: `/profile`,
        metadata: { orderId: order._id }
      });

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Cancel order (User only, within 24h)
// @route   PUT /api/orders/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check ownership
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Check 24h limit
    const orderDate = new Date(order.createdAt);
    const now = new Date();
    const hoursDiff = Math.abs(now - orderDate) / 36e5;

    if (hoursDiff > 24 && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'Order cannot be cancelled after 24 hours' });
    }

    if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
      return res.status(400).json({ message: 'Already shipped or delivered orders cannot be cancelled' });
    }

    order.orderStatus = 'cancelled';
    const updatedOrder = await order.save();

    // Notify Admin regarding cancellation
    await createNotification({
      recipient: 'admin',
      type: 'system',
      title: 'Order Cancelled',
      message: `Order #${order._id.toString().slice(-6)} has been cancelled by ${req.user.role === 'admin' ? 'Admin' : 'Customer'}.`,
      link: `/admin/orders/${order._id}`,
      metadata: { orderId: order._id }
    });

    // Notify User and Send Email if Admin cancelled
    if (req.user.role === 'admin') {
      try {
        const User = require('../models/User');
        const user = await User.findById(order.user);
        await sendStatusUpdate(user.email, order, 'cancelled');
      } catch (emailError) {
        console.error('Email sending failed during cancellation:', emailError);
      }

      await createNotification({
        recipient: order.user.toString(),
        type: 'status_update',
        title: 'Order Cancelled',
        message: `Your order #${order._id.toString().slice(-6)} has been cancelled by the administrator.`,
        link: `/profile`,
        metadata: { orderId: order._id }
      });
    }

    // Sync with Shiprocket if it was synced
    if (order.carrierName === 'Shiprocket') {
      const shiprocketService = require('../services/shiprocketService');
      try {
        const srOrderId = order.shiprocketOrderId || await shiprocketService.getSROrderIdByCustomId(order._id.toString());
        if (srOrderId) {
          await shiprocketService.cancelShiprocketOrder(srOrderId);
        }
      } catch (srError) {
        console.error('Failed to cancel order on Shiprocket:', srError.response?.data || srError.message);
        // We still allow the local cancellation to proceed, or we could block it.
        // For now, let's just log it.
      }
    }

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Update order shipping address (User only, within 24h)
// @route   PUT /api/orders/:id/update-shipping
// @access  Private
router.put('/:id/update-shipping', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Check 24h limit
    const orderDate = new Date(order.createdAt);
    const now = new Date();
    const hoursDiff = Math.abs(now - orderDate) / 36e5;

    if (hoursDiff > 24) {
      return res.status(400).json({ message: 'Order details cannot be updated after 24 hours' });
    }

    if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
      return res.status(400).json({ message: 'Already shipped or delivered orders cannot be updated' });
    }

    const { shippingAddress } = req.body;
    if (shippingAddress) {
      order.shippingAddress = { ...order.shippingAddress, ...shippingAddress };
      const updatedOrder = await order.save();

      // Sync with Shiprocket
      if (order.carrierName === 'Shiprocket') {
        const shiprocketService = require('../services/shiprocketService');
        try {
          const srOrderId = order.shiprocketOrderId || await shiprocketService.getSROrderIdByCustomId(order._id.toString());
          if (srOrderId) {
            await shiprocketService.updateShiprocketOrderAddress(srOrderId, {
              billing_address: shippingAddress.street,
              billing_city: shippingAddress.city,
              billing_state: shippingAddress.state,
              billing_pincode: shippingAddress.zipCode,
              billing_phone: shippingAddress.phone
            });
          }
        } catch (srError) {
          console.error('Failed to update order address on Shiprocket:', srError.response?.data || srError.message);
        }
      }

      res.json(updatedOrder);
    } else {
      res.status(400).json({ message: 'No update data provided' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Generate Shiprocket Label (Admin only)
// @route   GET /api/orders/:id/label
// @access  PrivateAdmin
router.get('/:id/label', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
    const order = await Order.findById(req.params.id);
    if (!order || !order.trackingId) {
      return res.status(404).json({ message: 'Order or Shipment ID not found. Ensure order is synced with Shiprocket.' });
    }

    const shiprocketService = require('../services/shiprocketService');
    
    const tryGenerateLabel = async () => {
      try {
        const labelData = await shiprocketService.generateLabel(order.trackingId);
        if (labelData && labelData.label_url) {
          return res.json(labelData);
        }
        
        console.log('Label URL missing in response, attempting AWB assignment flow...');
        const serviceability = await shiprocketService.getServiceability(order);
        
        if (serviceability && serviceability.status === 200 && serviceability.data && serviceability.data.available_courier_companies.length > 0) {
          const courier = serviceability.data.available_courier_companies[0];
          console.log(`Assigning AWB using courier: ${courier.courier_name}`);
          
          await shiprocketService.assignAWB(order.trackingId, courier.courier_company_id);
          
          // Retry label generation
          const retryLabelData = await shiprocketService.generateLabel(order.trackingId);
          if (retryLabelData && retryLabelData.label_url) {
            return res.json(retryLabelData);
          } else {
            return res.status(400).json({ 
              message: 'AWB assigned but label generation still returned no URL. Please check Shiprocket dashboard.',
              details: retryLabelData 
            });
          }
        } else {
          return res.status(400).json({ message: 'No serviceable couriers found for this location.' });
        }
      } catch (err) {
        console.error('Label/AWB Flow Error:', err.response?.data || err.message);
        return res.status(500).json({ message: err.response?.data?.message || 'Failed to process label generation flow.' });
      }
    };

    await tryGenerateLabel();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Generate Shiprocket Invoice (Admin only)
// @route   GET /api/orders/:id/invoice
// @access  PrivateAdmin
router.get('/:id/invoice', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const shiprocketService = require('../services/shiprocketService');
    let srOrderId = order.shiprocketOrderId;
    
    if (!srOrderId) {
      // Fallback: search SR by custom order ID
      srOrderId = await shiprocketService.getSROrderIdByCustomId(order._id.toString());
      if (srOrderId) {
        order.shiprocketOrderId = srOrderId;
        await order.save();
      }
    }

    if (!srOrderId) {
      return res.status(400).json({ message: 'This order is not yet synced or processed in Shiprocket.' });
    }

    const invoiceData = await shiprocketService.generateInvoice([srOrderId]);
    res.json(invoiceData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Manual Shiprocket Sync (Admin only)
// @route   POST /api/orders/:id/sync
// @access  PrivateAdmin
router.post('/:id/sync', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const User = require('../models/User');
    const user = await User.findById(order.user);
    const shiprocketService = require('../services/shiprocketService');
    
    const result = await shiprocketService.syncOrder(order, user);
    if (result && result.shipment_id) {
      res.json({ message: 'Sync successful', result });
    } else {
      res.status(400).json({ message: 'Sync failed. Check logs for details.' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
