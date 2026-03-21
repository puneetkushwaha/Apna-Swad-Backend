const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();
const Order = require('../models/Order');
const shiprocketService = require('../services/shiprocketService');

async function debugCancel() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const orderId = '69b7f87f5bf48a22cff15ee6';
        const order = await Order.findById(orderId);
        
        console.log('Order Details:', {
            id: order._id,
            shiprocketOrderId: order.shiprocketOrderId,
            trackingId: order.trackingId
        });

        console.log('Attempting cancellation via shiprocketService...');
        try {
            // Let's try to search for the order first to be sure about the SR ID
            const srId = order.shiprocketOrderId || await shiprocketService.getSROrderIdByCustomId(order._id.toString());
            console.log('Found SR Order ID:', srId);
            
            if (!srId) {
                console.log('No SR ID found, skipping SR cancellation');
                return;
            }

            const result = await shiprocketService.cancelShiprocketOrder(srId);
            console.log('Cancellation Result:', JSON.stringify(result, null, 2));
        } catch (err) {
            console.error('Cancellation Attempt Failed:', err.response?.data || err.message);
        }

    } catch (err) {
        console.error('Debug Cancel Script Failed:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

debugCancel();
