const express = require('express');
const router = express.Router();
const BrandStory = require('../models/BrandStory');
const { upload } = require('../middleware/cloudinaryConfig');
const jwt = require('jsonwebtoken');

// Auth middleware
const auth = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// GET Brand Story
router.get('/', async (req, res) => {
  try {
    let story = await BrandStory.findOne();
    if (!story) {
      story = new BrandStory({
        title: "From Grandma's Kitchen to Your Doorstep",
        subtitle: "OUR STORY",
        videoUrl: '/video.mp4',
        videoTag: 'ZERO PRESERVATIVES',
        caption: `The term 'Apna Swad' is now being searched 1000 times on Google every month, which is testimony to the increasing awareness of sustainable snacking without palm oil and Preservatives 🌿`,
        paragraphs: [
          "Apna Swad was born from a simple desire: to bring back the authentic taste of traditional Indian snacks that we all grew up with. We believe that snacking should be a celebration of flavors, not a compromise on health.",
          "Our recipes are passed down through generations, using only the finest ingredients. We've replaced palm oil with healthier alternatives and eliminated preservatives, ensuring every bite is as wholesome as it is delicious."
        ],
        founders: [
          { name: 'Aditya Raj', title: 'Founder', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop', linkedin: '#' },
          { name: 'Priyanka Singh', title: 'Co-Founder', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop', linkedin: '#' }
        ]
      });
      await story.save();
    }
    res.json(story);
  } catch (err) {
    console.error("GET /api/brand-story error:", err);
    res.status(500).json({ message: err.message });
  }
});

// UPDATE Brand Story
router.post('/', auth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'founder0Image', maxCount: 1 },
  { name: 'founder1Image', maxCount: 1 }
]), async (req, res) => {
  try {
    let story = await BrandStory.findOne();
    const updateData = {
      title: req.body.title,
      subtitle: req.body.subtitle,
      videoTag: req.body.videoTag,
      caption: req.body.caption,
      videoUrl: req.body.videoUrl, // Can be manual URL or /video.mp4
      paragraphs: JSON.parse(req.body.paragraphs || '[]'),
      founders: JSON.parse(req.body.founders || '[]')
    };

    if (req.files) {
      if (req.files.image) updateData.imageUrl = req.files.image[0].path;
      if (req.files.video) updateData.videoUrl = req.files.video[0].path;
      if (req.files.founder0Image) updateData.founders[0].image = req.files.founder0Image[0].path;
      if (req.files.founder1Image) updateData.founders[1].image = req.files.founder1Image[0].path;
    }

    if (story) {
      story = await BrandStory.findByIdAndUpdate(story._id, updateData, { new: true });
    } else {
      story = new BrandStory(updateData);
      await story.save();
    }
    res.json(story);
  } catch (err) {
    console.error("POST /api/brand-story error:", err);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
