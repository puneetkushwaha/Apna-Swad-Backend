const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: String,
    required: true,
    index: true // Can be UserID or 'admin'
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    required: true,
    enum: ['order_placed', 'status_update', 'new_user', 'new_review', 'low_stock', 'system']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String // Frontend route to navigate to
  },
  isRead: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Object // For additional info like orderId, productId, etc.
  }
}, { timestamps: true });

// Add index for fast retrieval of unread notifications
NotificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
