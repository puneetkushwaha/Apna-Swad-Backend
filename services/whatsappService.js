const axios = require('axios');

exports.sendWhatsAppUpdate = async (phone, message) => {
  try {
    const cleanPhone = phone.replace(/\D/g, ''); // Remove non-numeric
    const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    console.log(`[WhatsApp API] Sending to ${formattedPhone}: ${message}`);
    
    // Interakt API Implementation
    // Note: This assumes a generic template or a WhatsApp Session message.
    // If you have a specific template name (e.g., 'order_status'), update the 'template' field.
    const response = await axios.post('https://api.interakt.ai/v1/public/message/', {
      full_number: formattedPhone,
      type: 'Template',
      template: {
        name: 'order_update', // Default premium template name
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
    
    return { success: true, providerRes: response.data };
  } catch (err) {
    console.error('WhatsApp Service Error:', err.response?.data || err.message);
    // Log the error but don't crash the order flow
    return { success: false, error: err.message };
  }
};
