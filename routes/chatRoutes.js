const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// @desc    Send a message
// @route   POST /api/chat
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    
    // If user is sending, receiver is admin. If admin is sending, receiverId is required.
    let receiver = receiverId;
    if (req.user.role !== 'admin') {
      const admin = await User.findOne({ role: 'admin' });
      if (!admin) return res.status(404).json({ message: 'Admin not found' });
      receiver = admin._id;
    }

    const chat = new Chat({
      sender: req.user._id,
      receiver,
      message,
      isAdmin: req.user.role === 'admin'
    });

    const savedChat = await chat.save();
    res.json(savedChat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Get messages for a conversation
// @route   GET /api/chat/:userId
// @access  Private
router.get('/:userId', protect, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    // Users can only see their own chats with admin. Admin can see anyone's chats.
    if (req.user.role !== 'admin' && targetUserId !== currentUserId.toString()) {
      // Logic for user: they are always chatting with admin. 
      // targetUserId here would be the adminId.
    }

    const messages = await Chat.find({
      $or: [
        { sender: currentUserId, receiver: targetUserId },
        { sender: targetUserId, receiver: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Get all unique conversations for admin
// @route   GET /api/chat/conversations
// @access  PrivateAdmin
router.get('/admin/conversations', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
    
    // Find all unique users who have messaged admin
    const conversations = await Chat.aggregate([
      { $match: { isAdmin: false } },
      { $group: { _id: "$sender", lastMessage: { $last: "$message" }, lastUpdate: { $last: "$createdAt" } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: "$user" },
      { $project: { "user.password": 0 } }
    ]);

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
