const mongoose = require('mongoose');
require('dotenv').config();

const deepSearch = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for deep search...');

        const collections = await mongoose.connection.db.listCollections().toArray();
        const targetStr = 'sample_video.mp4';

        for (const colInfo of collections) {
            const collection = mongoose.connection.db.collection(colInfo.name);
            const documents = await collection.find({}).toArray();
            
            for (const doc of documents) {
                const docStr = JSON.stringify(doc);
                if (docStr.includes(targetStr)) {
                    console.log(`FOUND MATCH in collection: ${colInfo.name}`);
                    console.log(`Document ID: ${doc._id}`);
                    console.log(`Content: ${docStr}`);
                }
            }
        }

        console.log('Search complete.');
        process.exit(0);
    } catch (err) {
        console.error('Search error:', err);
        process.exit(1);
    }
};

deepSearch();
