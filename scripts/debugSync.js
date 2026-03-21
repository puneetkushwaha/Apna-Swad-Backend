const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();
const Order = require('../models/Order');
const User = require('../models/User');
const shiprocketService = require('../services/shiprocketService');

async function testSync() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const orderId = '69b7f87f5bf48a22cff15ee6';
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('Order not found');
      return;
    }

    const user = await User.findById(order.user);
    if (!user) {
      console.log('User not found');
      return;
    }

    let pickupData = null;
    try {
      const locations = await axios.get('https://apiv2.shiprocket.in/v1/external/settings/company/pickup', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      pickupData = locations.data;
      console.log('Pickup Locations fetched');
    } catch (locErr) {
      console.error('Failed to fetch pickup locations:', locErr.response?.data || locErr.message);
      pickupData = { error: locErr.response?.data || locErr.message };
    }

    const result = await shiprocketService.syncOrder(order, user);
    console.log('Sync Result obtained');

    const fs = require('fs');
    fs.writeFileSync('scripts/debug_output.json', JSON.stringify({
      orderId,
      pickupData,
      result: result
    }, null, 2));
    console.log('Results saved to scripts/debug_output.json');

  } catch (err) {
    console.error('Test Failed:', err.response?.data || err.message);
    const fs = require('fs');
    fs.writeFileSync('scripts/debug_output.json', JSON.stringify({ error: err.response?.data || err.message }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

testSync();
