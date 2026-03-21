require('dotenv').config();
const shiprocketService = require('../services/shiprocketService');

async function testAuth() {
  console.log('--- Shiprocket Authentication Test ---');
  console.log(`Email from .env: ${process.env.SHIPROCKET_EMAIL ? 'PRESENT' : 'MISSING'}`);
  console.log(`Password from .env: ${process.env.SHIPROCKET_PASSWORD ? 'PRESENT' : 'MISSING'}`);

  try {
    const token = await shiprocketService.authenticate();
    if (token) {
      console.log('SUCCESS: Generated Shiprocket Token:', token.substring(0, 20) + '...');
    }
  } catch (error) {
    console.error('FAILED: Could not authenticate with Shiprocket.');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error Message:', error.message);
    }
  }
}

testAuth();
