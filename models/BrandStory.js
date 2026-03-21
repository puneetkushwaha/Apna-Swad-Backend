const mongoose = require('mongoose');

const brandStorySchema = new mongoose.Schema({
  title: { type: String, default: "From Grandma's Kitchen to Your Doorstep" },
  subtitle: { type: String, default: 'OUR STORY' },
  paragraphs: [{ type: String }],
  imageUrl: { type: String, default: 'https://images.unsplash.com/photo-1505253149613-112d21d9f6a9?auto=format&fit=crop&w=800&q=80' },
  videoUrl: { type: String, default: '/video.mp4' },
  videoTag: { type: String, default: 'ZERO PRESERVATIVES' },
  caption: { type: String, default: 'The term <strong>\'Sweet Karam Coffee\'</strong> is now being searched 40,000 times...' },
  founders: [
    {
      name: String,
      title: String,
      image: String,
      linkedin: String
    }
  ],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BrandStory', brandStorySchema);
