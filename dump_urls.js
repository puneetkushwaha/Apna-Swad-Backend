const mongoose = require('mongoose');
require('dotenv').config();
const Review = require('./models/Review');

const dumpUrls = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const reviews = await Review.find({});
        console.log(`Dumping ${reviews.length} reviews:`);
        reviews.forEach(r => {
            if (r.videoUrl) console.log(`[VIDEO] ${r.name}: ${r.videoUrl}`);
            if (r.imageUrl) console.log(`[IMAGE] ${r.name}: ${r.imageUrl}`);
        });
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
};
dumpUrls();
