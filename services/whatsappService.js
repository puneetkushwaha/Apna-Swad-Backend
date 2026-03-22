const axios = require('axios');

exports.sendWhatsAppUpdate = async (phone, message) => {
  try {
    const cleanPhone = phone.replace(/\D/g, ''); // Remove non-numeric
    const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    console.log(`[WhatsApp API] Sending to ${formattedPhone} with template: order_update`);
    
    // Interakt API Implementation
    const response = await axios.post('https://api.interakt.ai/v1/public/message/', {
      full_number: formattedPhone,
      type: 'Template',
      template: {
        name: 'order_update', 
        languageCode: 'en',
        headerValues: ['Apna Swad Heritage'],
        bodyValues: [message]
      }
    }, {
      headers: { 
        'Authorization': `Basic ${process.env.WHATSAPP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[WhatsApp API] Success Response:', response.data);
    return { success: true, providerRes: response.data };
  } catch (err) {
    console.error('WhatsApp Service Error Details:', {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message
    });
    return { success: false, error: err.message };
  }
};
