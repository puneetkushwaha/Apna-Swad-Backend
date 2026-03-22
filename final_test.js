const axios = require('axios');
const fs = require('fs');

const testWhatsApp = async () => {
  const phone = '8810905170'; 
  const apiKey = 'a0NteUlyWWFyaG5aQThCNlFfNlQtanh0a041WnJ4ZWpCM042RmpVThkaG0zczo=';
  const templateName = 'order_update';

  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    const response = await axios.post('https://api.interakt.ai/v1/public/message/', {
      full_number: formattedPhone,
      type: 'Template',
      template: {
        name: templateName,
        languageCode: 'en',
        headerValues: ['Apna Swad Heritage'],
        bodyValues: ['FINAL TEST: Apna Swad notification is now LIVE!']
      }
    }, {
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('SUCCESS!');
    console.log('Response:', response.data);
  } catch (err) {
    console.error('FAILURE!');
    console.error('Status:', err.response?.status);
    console.error('Data:', err.response?.data);
  }
};

testWhatsApp();
