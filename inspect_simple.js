const mongoose = require('mongoose');

const MONGODB_URI="mongodb+srv://puneetkushwaha9452_db_user:U6GcCd3SYBPvMTiT@kitchen.pai6oil.mongodb.net/?appName=kitchen";

const Category = require('c:\\Users\\Lenovo\\Desktop\\Apna Swad\\backend\\models\\Category');
const Product = require('c:\\Users\\Lenovo\\Desktop\\Apna Swad\\backend\\models\\Product');

async function inspect() {
  try {
    console.log('Connecting...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected.');
    
    const categories = await Category.find();
    console.log('--- Categories ---');
    categories.forEach(c => {
      console.log(`Slug: "${c.slug}" | Name: "${c.name}" | ID: ${c._id}`);
    });

    const products = await Product.find().limit(5).populate('category');
    console.log('\n--- Sample Products & Cat Slugs ---');
    products.forEach(p => {
      console.log(`Product: "${p.name}" | CatSlug: "${p.category ? p.category.slug : 'NONE'}"`);
    });

    mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Inspector Error:', err.message);
    process.exit(1);
  }
}

inspect();
