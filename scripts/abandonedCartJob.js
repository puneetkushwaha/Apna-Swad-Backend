const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Order = require('../models/Order');
const { sendAbandonedCartEmail } = require('../services/emailService');

dotenv.config();

const runAbandonedCartCheck = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB for Abandoned Cart Check');

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    // Find users who updated their cart 2-6 hours ago and haven't checked out
    const usersWithAbandonedCarts = await User.find({
      'cart.0': { $exists: true }, // Not empty
      lastCartUpdate: { $gte: sixHoursAgo, $lte: twoHoursAgo }
    });

    console.log(`Found ${usersWithAbandonedCarts.length} potential abandoned carts.`);

    for (const user of usersWithAbandonedCarts) {
      // Check if user placed an order after lastCartUpdate
      const recentOrder = await Order.findOne({
        user: user._id,
        createdAt: { $gt: user.lastCartUpdate }
      });

      if (!recentOrder) {
        console.log(`Sending recovery email to ${user.email}`);
        await sendAbandonedCartEmail(user);
        // Mark as emailed to avoid duplicates (optional: add a field to User)
        await User.findByIdAndUpdate(user._id, { lastCartUpdate: new Date(0) }); // Reset to avoid re-triggering
      }
    }

    await mongoose.disconnect();
    console.log('Abandoned Cart Check Completed.');
  } catch (err) {
    console.error('Error in Abandoned Cart Job:', err);
    process.exit(1);
  }
};

runAbandonedCartCheck();
