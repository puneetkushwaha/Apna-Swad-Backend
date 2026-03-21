const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const dotenv = require('dotenv');
dotenv.config();

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  // Delete all admins except the one in .env
  const result = await Admin.deleteMany({ username: { $ne: process.env.ADMIN_USERNAME } });
  console.log(`Deleted ${result.deletedCount} old admin accounts.`);
  process.exit(0);
}

cleanup();
