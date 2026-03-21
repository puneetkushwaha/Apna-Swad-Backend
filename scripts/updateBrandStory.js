const mongoose = require('mongoose');
const dotenv = require('dotenv');
const BrandStory = require('../models/BrandStory');

dotenv.config();

const updateBrandStory = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const newCaption = `The term 'Apna Swad' is now being searched 1000 times on Google every month, which is testimony to the increasing awareness of sustainable snacking without palm oil and Preservatives 🌿`;
        
        const story = await BrandStory.findOneAndUpdate(
            {}, 
            { caption: newCaption },
            { new: true, upsert: true }
        );

        console.log('Brand Story updated successfully:');
        console.log(story.caption);

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error updating brand story:', err);
        process.exit(1);
    }
};

updateBrandStory();
