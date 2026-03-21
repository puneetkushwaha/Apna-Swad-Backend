const mongoose = require('mongoose');
require('dotenv').config();
const BrandStory = require('./models/BrandStory');
const Review = require('./models/Review');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // 1. Seed Brand Story
    const storyCount = await BrandStory.countDocuments();
    if (storyCount === 0) {
      const defaultStory = new BrandStory({
        title: "From Grandma's Kitchen to Your Doorstep",
        subtitle: 'OUR STORY',
        paragraphs: [
          "Apna Swad was born from a simple desire: to bring back the authentic taste of traditional Indian snacks that we all grew up with. We believe that snacking should be a celebration of flavors, not a compromise on health.",
          "Our recipes are passed down through generations, using only the finest ingredients. We've replaced palm oil with healthier alternatives and eliminated preservatives, ensuring every bite is as wholesome as it is delicious."
        ],
        imageUrl: 'https://images.unsplash.com/photo-1505253149613-112d21d9f6a9?auto=format&fit=crop&w=800&q=80'
      });
      await defaultStory.save();
      console.log('Default Brand Story seeded.');
    }

    // 2. Seed some Reviews/Testimonials
    const reviewCount = await Review.countDocuments();
    if (reviewCount === 0) {
      const mockReviews = [
        {
          name: "Anita Sharma",
          text: "The Bhujia took me straight back to my childhood summers in Bikaner. Truly authentic!",
          type: "text",
          active: true
        },
        {
          name: "Rajesh Iyer",
          text: "Finally, a brand that doesn't use palm oil. The taste is clean and nostalgic.",
          type: "text",
          active: true
        },
        {
          name: "Sonia Verma",
          text: "Their Masala Peanuts are addictive! Perfect crunch without the heavy feeling.",
          type: "text",
          active: true
        },
        {
          name: "Vikram Mehta",
          videoUrl: "https://res.cloudinary.com/demo/video/upload/c_fill,w_300,h_400/v1/dog.mp4",
          type: "video",
          active: true
        }
      ];
      await Review.insertMany(mockReviews);
      console.log('Mock Reviews seeded.');
    }

    console.log('Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedData();
