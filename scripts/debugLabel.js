const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();
const Order = require('../models/Order');
const shiprocketService = require('../services/shiprocketService');
const fs = require('fs');

async function debugLabel() {
    let debugInfo = {};
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const orderId = '69b7f87f5bf48a22cff15ee6';
        const order = await Order.findById(orderId);
        if (!order) {
            console.log('Order not found');
            return;
        }
        debugInfo.trackingId = order.trackingId;

        const token = await shiprocketService.authenticate();
        
        // Check current status in Shiprocket
        const shipmentDetails = await axios.get(`https://apiv2.shiprocket.in/v1/external/shipments/${order.trackingId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        debugInfo.shipmentDetails = shipmentDetails.data;

        const labelResponse = await shiprocketService.generateLabel(order.trackingId);
        if (labelResponse && labelResponse.label_url) {
            debugInfo.labelResponse = labelResponse;
        } else {
            console.log('Label URL missing, attempting direct AWB assignment...');
            debugInfo.initialLabelResponse = labelResponse;
            
            try {
                console.log('Assigning AWB via default courier...');
                const awbResult = await shiprocketService.assignAWB(order.trackingId);
                debugInfo.awbResult = awbResult;
                
                console.log('Retrying label generation...');
                const retryLabel = await shiprocketService.generateLabel(order.trackingId);
                debugInfo.retryLabelResponse = retryLabel;
            } catch (awbErr) {
                console.error('Direct AWB Assignment Failed:', awbErr.response?.data || awbErr.message);
                debugInfo.awbError = awbErr.response?.data || awbErr.message;
            }
        }

        fs.writeFileSync('scripts/debug_label_output.json', JSON.stringify(debugInfo, null, 2));
        console.log('Debug info saved to scripts/debug_label_output.json');

    } catch (err) {
        console.error('Debug Label Script Failed:', err.response?.data || err.message);
        fs.writeFileSync('scripts/debug_label_output.json', JSON.stringify({ error: err.response?.data || err.message, debugInfo }, null, 2));
    } finally {
        await mongoose.disconnect();
    }
}

debugLabel();
