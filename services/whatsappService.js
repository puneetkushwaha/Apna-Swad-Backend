/**
 * WhatsApp Service for Apna Swad
 * Integrates with WhatsApp Business API (e.g., Cloud API or Interakt)
 */

exports.sendWhatsAppUpdate = async (phone, message) => {
  try {
    const cleanPhone = phone.replace(/\D/g, ''); // Remove non-numeric
    const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    console.log(`[WhatsApp LOG] Sending to ${formattedPhone}: ${message}`);
    
    // TEMPLATE: Implementation for a real provider (e.g., Interakt)
    /*
    const axios = require('axios');
    await axios.post('https://api.interakt.ai/v1/public/message/', {
      full_number: formattedPhone,
      type: 'Template',
      template: {
        name: 'order_update',
        languageCode: 'en',
        headerValues: ['Apna Swad'],
        bodyValues: [message]
      }
    }, {
      headers: { 'Authorization': `Basic ${process.env.WHATSAPP_API_KEY}` }
    });
    */
    
    return { success: true, logged: true };
  } catch (err) {
    console.error('WhatsApp Service Error:', err);
    return { success: false, error: err.message };
  }
};
