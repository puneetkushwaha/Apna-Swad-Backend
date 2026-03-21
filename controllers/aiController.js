const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.chatWithAI = async (req, res) => {
  try {
    const { message, chatHistory } = req.body;
    
    // Fetch all products to give context to AI (limit fields for token efficiency)
    const products = await Product.find({}, 'name price description category weight').populate('category', 'name');
    
    const productContext = products.map(p => 
      `Product: ${p.name}, Price: Rs. ${p.price}, Category: ${p.category?.name}, Description: ${p.description.substring(0, 100)}...`
    ).join('\n');

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are the "Apna Swad AI Assistant", an elite concierge for a premium Indian heritage snack brand.
      Your goal is to help customers find the perfect snack.
      
      Here is our current product catalog:
      ${productContext}
      
      User says: "${message}"
      
      Guidelines:
      1. Be polite, premium, and helpful. Use a "Namaste" tone.
      2. Recommend specific products from the catalog based on their needs (spicy, sweet, tea-time, healthy, etc.).
      3. If they ask for something not in the catalog, politely suggest the closest alternative we have.
      4. Keep responses concise and engaging.
      5. Mention prices if relevant.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.json({ message: responseText, isAdmin: true, isAI: true });
  } catch (err) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ message: 'The AI concierge is temporarily resting. Please try again later.' });
  }
};
