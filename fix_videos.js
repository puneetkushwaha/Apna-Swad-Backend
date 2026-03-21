const mongoose = require('mongoose');
require('dotenv').config();
const Review = require('./models/Review');

const fixVideos = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for fixing videos...');

        // Fuzzy search for any URL containing sample_video.mp4
        const brokenReviews = await Review.find({ videoUrl: /sample_video\.mp4/ });
        console.log(`Found ${brokenReviews.length} reviews with sample_video.mp4`);

        if (brokenReviews.length > 0) {
            const workingUrl = 'https://res.cloudinary.com/demo/video/upload/c_fill,w_300,h_400/v1/dog.mp4';
            for (const review of brokenReviews) {
                console.log(`Fixing review for ${review.name}: ${review.videoUrl}`);
                review.videoUrl = workingUrl;
                await review.save();
            }
            console.log('Successfully updated all broken video links.');
        } else {
            console.log('No matches found for sample_video.mp4 in the database.');
            
            // Let's see what IS in the database
            const allVideos = await Review.find({ type: 'video' });
            allVideos.forEach(v => console.log(`Video Review: ${v.name} -> ${v.videoUrl}`));
        }

        process.exit(0);
    } catch (err) {
        console.error('Error fixing videos:', err);
        process.exit(1);
    }
};

fixVideos();
