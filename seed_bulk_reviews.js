const mongoose = require('mongoose');
require('dotenv').config();
const Review = require('./models/Review');

const seedBulk = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MONGODB for bulk seeding...');

        const workingUrl = 'https://res.cloudinary.com/demo/video/upload/c_fill,w_300,h_400/v1/dog.mp4';
        
        const patrons = [
            'Rahul Mehra', 'Sanjay Gupta', 'Priya Das', 'Amitabh B.', 
            'Kiran K.', 'Arjun Singh', 'Nisha Verma', 'Deepak J.',
            'Swati R.', 'Kabir L.'
        ];

        const newReviews = patrons.map(name => ({
            name: name,
            videoUrl: workingUrl,
            type: "video",
            active: true
        }));

        const result = await Review.insertMany(newReviews);
        console.log(`Successfully added ${result.length} cinematic reviews.`);

        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedBulk();
