const Coupon = require('../models/Coupon');
const Order = require('../models/Order');

/**
 * Calculates the total amount after applying B2G1 across all items in the cart.
 * Strategy: Collect all items into a list, sort by price, and every 3rd item is free.
 * @param {Array} items - Cart items [{price, quantity, ...}]
 * @param {Object} promoSettings - Global promo settings
 * @returns {Number} - Total amount after item-level promos
 */
const calculateItemPromos = (items, promoSettings) => {
  if (!promoSettings.b2g1 || !promoSettings.b2g1.isEnabled) {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  // Create a flat list of all individual units
  const allUnits = [];
  items.forEach(item => {
    for (let i = 0; i < item.quantity; i++) {
      allUnits.push(item.price);
    }
  });

  // Sort by price high to low
  allUnits.sort((a, b) => b - a);

  let total = 0;
  // Every 3rd item (the cheapest in each group of 3) is free
  for (let i = 0; i < allUnits.length; i++) {
    // If it's the 3rd, 6th, 9th... item, price is 0 (it's free)
    // 0-indexed: i=2, i=5, i=8...
    if ((i + 1) % 3 === 0) {
      total += 0;
    } else {
      total += allUnits[i];
    }
  }

  return total;
};

/**
 * Applies global discounts like First 100 Orders or Coupons.
 * @param {Number} currentTotal - Total after item promos
 * @param {Object} promoSettings - Global promo settings
 * @param {String} couponCode - Optional coupon code
 * @param {String} userId - The current user ID for single-use check
 * @returns {Object} { finalTotal, discountApplied, couponUsed }
 */
const applyGlobalPromos = async (currentTotal, promoSettings, couponCode = null, userId = null) => {
  let discountApplied = 0;
  let finalTotal = currentTotal;
  let couponUsed = null;

  // 1. Check First 100 Orders
  if (promoSettings.firstOrders && promoSettings.firstOrders.isEnabled) {
    const orderCount = await Order.countDocuments({ paymentStatus: 'completed' });
    if (orderCount < promoSettings.firstOrders.orderLimit) {
      discountApplied += promoSettings.firstOrders.discountValue;
    }
  }

  // 2. Check Coupon
  if (couponCode) {
    const coupon = await Coupon.findOne({ 
      code: couponCode.toUpperCase(), 
      isActive: true,
      $or: [{ expiryDate: { $gte: new Date() } }, { expiryDate: null }]
    });

    if (coupon && coupon.usedCount < coupon.maxUses) {
      // Check if user has already used this coupon
      // We check for completed orders by this user with this coupon code
      if (userId) {
        const hasUsed = await Order.findOne({ 
          user: userId, 
          couponCode: couponCode.toUpperCase(),
          paymentStatus: { $ne: 'failed' } // Count all except failed
        });
        
        if (hasUsed) {
          return { finalTotal: currentTotal, discountApplied, couponUsed: null, error: 'You have already used this coupon' };
        }
      }

      let couponDiscount = 0;
      if (coupon.discountType === 'flat') {
        couponDiscount = coupon.discountValue;
      } else if (coupon.discountType === 'percentage') {
        couponDiscount = (currentTotal * coupon.discountValue) / 100;
      }
      
      discountApplied += couponDiscount;
      couponUsed = coupon;
    }
  }

  finalTotal = Math.max(0, currentTotal - discountApplied);
  
  return {
    finalTotal,
    discountApplied,
    couponUsed
  };
};

module.exports = {
  calculateItemPromos,
  applyGlobalPromos
};
