require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const updateThekua = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const thekuaId = '69b81ce1f30a3be5e9037219';
        
        const description1 = "Elaichi Thekua is a flavorful traditional delicacy inspired by the rich culinary heritage of Bihar and Jharkhand. Often prepared during festivals like Chhath Puja, this crispy snack carries the essence of devotion, celebration, and authentic homemade taste.";
        
        const description2 = "Made with whole wheat flour, aromatic cardamom (elaichi), jaggery, and a touch of ghee, Elaichi Thekua delivers a perfect balance of sweetness and fragrance. The warm aroma of cardamom enhances every crunchy bite, creating a delightful snack that blends tradition with irresistible flavor.";
        
        const description3 = "Available Packs: 250g\nShipping: Door delivery across India";
        
        const fullDescription = `${description1}\n\n${description2}\n\n${description3}`;

        const updatedProduct = await Product.findByIdAndUpdate(thekuaId, {
            description: fullDescription,
            shelfLife: "40 days",
            storageInstructions: "Store in a cool, dry place in an airtight container to retain freshness."
        }, { new: true });

        if (updatedProduct) {
            console.log('Elaichi Thekua updated successfully!');
            console.log('New Description Preview:', updatedProduct.description.substring(0, 50) + '...');
        } else {
            console.log('Product not found.');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error updating product:', err);
    }
};

updateThekua();
