const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:\\Users\\Lenovo\\Desktop\\Apna Swad\\backend\\.env' });

const Category = require('c:\\Users\\Lenovo\\Desktop\\Apna Swad\\backend\\models\\Category');
const Product = require('c:\\Users\\Lenovo\\Desktop\\Apna Swad\\backend\\models\\Product');

async function inspect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const categories = await Category.find();
    console.log('Categories in DB:');
    categories.forEach(c => {
      console.log(`- Name: ${c.name}, Slug: ${c.slug}, ID: ${c._id}`);
    });

    const products = await Product.find().populate('category');
    console.log('\nProduct category stats:');
    const stats = {};
    products.forEach(p => {
      const catName = p.category ? p.category.name : 'No Category';
      stats[catName] = (stats[catName] || 0) + 1;
    });
    console.log(stats);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspect();
