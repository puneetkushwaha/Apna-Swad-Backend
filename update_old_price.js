const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load .env
dotenv.config();

// Define the Schema directly
const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.models.Product || mongoose.model('Product', productSchema, 'products');

async function updateProduct() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI not found in .env');
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const result = await Product.findByIdAndUpdate(
      '69b81ce1f30a3be5e9037219',
      { 
        $set: { 
          oldPrice: 599,
          price: 299
        } 
      },
      { new: true }
    );

    if (result) {
        console.log('Updated Product:', result.get('name'), '| Old Price:', result.get('oldPrice'), '| Current Price:', result.get('price'));
    } else {
        console.log('Product not found');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

updateProduct();
