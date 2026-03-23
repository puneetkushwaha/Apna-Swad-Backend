const Coupon = require('../models/Coupon');
const Order = require('../models/Order');

/**
 * Calculates the total amount after applying B2G1 and any other item-level promos.
 * @param {Array} items - Cart items
 * @param {Object} promoSettings - Global promo settings
 * @returns {Number} - New total amount
 */
const calculateItemPromos = (items, promoSettings) => {
  let total = 0;
  
  items.forEach(item => {
    let quantity = item.quantity;
    let price = item.price;
    
    if (promoSettings.b2g1 && promoSettings.b2g1.isEnabled) {
      // B2G1: For every 3 items, pay for 2
      let payableQuantity = Math.floor(quantity / 3) * 2 + (quantity % 3);
      total += payableQuantity * price;
    } else {
      total += quantity * price;
    }
  });
  
  return total;
};

/**
 * Applies global discounts like First 100 Orders or Coupons.
 * @param {Number} currentTotal - Total after item promos
 * @param {Object} promoSettings - Global promo settings
 * @param {String} couponCode - Optional coupon code
 * @returns {Object} { finalTotal, discountApplied, couponUsed }
 */
const applyGlobalPromos = async (currentTotal, promoSettings, couponCode = null) => {
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
