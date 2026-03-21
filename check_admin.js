const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({ role: 'admin' });
    console.log('Admin Users Found:', users.length);
    users.forEach(u => {
      console.log(`ID: ${u._id}, Email: ${u.email}, Role: ${u.role}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkAdmin();
