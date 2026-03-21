const mongoose = require('mongoose');
require('dotenv').config();
const Review = require('./models/Review');

const resetVideos = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for final video reset...');

        // Delete ALL video reviews to be absolutely sure
        const deleteResult = await Review.deleteMany({ type: 'video' });
        console.log(`Deleted ${deleteResult.deletedCount} legacy video reviews.`);

        // Seed one CLEAN video review
        const workingUrl = 'https://res.cloudinary.com/demo/video/upload/c_fill,w_300,h_400/v1/dog.mp4';
        const cleanReview = new Review({
            name: "Vikram Mehta",
            videoUrl: workingUrl,
            type: "video",
            active: true
        });
        await cleanReview.save();
        console.log('Seeded a clean video review with a working URL.');

        process.exit(0);
    } catch (err) {
        process.error('Reset error:', err);
        process.exit(1);
    }
};

resetVideos();
