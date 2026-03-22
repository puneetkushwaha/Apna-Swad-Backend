const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' });

async function promote(email) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    const user = await User.findOneAndUpdate(
      { email: email },
      { role: 'admin' },
      { new: true }
    );
    
    if (user) {
      console.log(`Success: ${email} is now an admin.`);
    } else {
      console.log(`User with email ${email} not found. They will be auto-promoted when they log in.`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

const targetEmail = process.argv[2] || 'apnaswad9452@gmail.com';
promote(targetEmail);
