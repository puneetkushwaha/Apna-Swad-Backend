const axios = require('axios');

const testAuth = async (label, headers) => {
  const phone = '8810905170'; 
  const templateName = 'order_update';
  const apiKey = 'a0NteUlyWWFyaG5aQThCNlFfNlQtanh0a041WnJ4ZWpCM042RmpVThkaG0zczo=';

  console.log(`Testing [${label}]:`);
  try {
    const formattedPhone = `91${phone.replace(/\D/g, '').slice(-10)}`;
    const response = await axios.post('https://api.interakt.ai/v1/public/message/', {
      full_number: formattedPhone,
      type: 'Template',
      template: {
        name: templateName,
        languageCode: 'en',
        headerValues: ['Apna Swad Heritage'],
        bodyValues: [`Auth Test: ${label}`]
      }
    }, { headers });
    console.log(`SUCCESS! [${label}]`);
    return true;
  } catch (err) {
    console.log(`FAILED! [${label}] - Status: ${err.response?.status} - ${JSON.stringify(err.response?.data)}`);
    return false;
  }
};

const run = async () => {
    const key = 'a0NteUlyWWFyaG5aQThCNlFfNlQtanh0a041WnJ4ZWpCM042RmpVThkaG0zczo=';
    
    // Attempt 1: Standard Basic
    await testAuth('Basic', { 'Authorization': `Basic ${key}` });
    
    // Attempt 2: Bearer
    await testAuth('Bearer', { 'Authorization': `Bearer ${key}` });
    
    // Attempt 3: No prefix
    await testAuth('NoPrefix', { 'Authorization': key });
    
    // Attempt 4: Base64 re-encoded (username:password style, where key is the username and password is empty)
    const reEncoded = Buffer.from(`${key}:`).toString('base64');
    await testAuth('ReEncodedBasic', { 'Authorization': `Basic ${reEncoded}` });
};

run();
