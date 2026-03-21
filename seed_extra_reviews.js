const mongoose = require('mongoose');
require('dotenv').config();
const Review = require('./models/Review');

const seedExtra = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MONGODB for extra seeding...');

        const workingUrl = 'https://res.cloudinary.com/demo/video/upload/c_fill,w_300,h_400/v1/dog.mp4';
        
        const patrons = [
            'Vikram Sethi', 'Neha Kapoor', 'Arnav Jha', 'Sneha Reddy', 
            'Manish Paul', 'Isha Kundra', 'Rohan Vats', 'Dimple K.',
            'Zoya Khan', 'Sameer D.'
        ];

        const newReviews = patrons.map(name => ({
            name: name,
            videoUrl: workingUrl,
            type: "video",
            active: true
        }));

        const result = await Review.insertMany(newReviews);
        console.log(`Successfully added ${result.length} more cinematic reviews.`);

        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedExtra();
