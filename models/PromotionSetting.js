const mongoose = require('mongoose');

const PromotionSettingSchema = new mongoose.Schema({
  // Singleton pattern id
  settingId: { type: String, default: 'global_promo_config', unique: true },
  
  b2g1: {
    isEnabled: { type: Boolean, default: false },
    minQty: { type: Number, default: 3 }
  },
  
  firstOrders: {
    isEnabled: { type: Boolean, default: false },
    discountValue: { type: Number, default: 50 },
    orderLimit: { type: Number, default: 100 }
  },
  
  referral: {
    isEnabled: { type: Boolean, default: true },
    targetCount: { type: Number, default: 5 },
    rewardPackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' } // Optional: specific product for free pack
  }
}, { timestamps: true });

module.exports = mongoose.model('PromotionSetting', PromotionSettingSchema);
