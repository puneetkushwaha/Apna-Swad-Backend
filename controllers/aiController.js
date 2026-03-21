const Groq = require('groq-sdk');
const Product = require('../models/Product');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

exports.chatWithAI = async (req, res) => {
  try {
    const { message, chatHistory } = req.body;
    
    // Fetch all products to give context to AI
    const products = await Product.find({}, 'name price description category weight').populate('category', 'name');
    
    const productContext = products.map(p => 
      `Product: ${p.name}, Price: Rs. ${p.price}, Category: ${p.category?.name}, Description: ${p.description.substring(0, 100)}...`
    ).join('\n');

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are the "Apna Swad AI Assistant", an elite concierge for a premium Indian heritage snack brand. 
          Your goal is to help customers find the perfect snack.
          
          Guidelines:
          1. Be polite, premium, and helpful. Use a "Namaste" tone.
          2. Recommend specific products from the catalog based on their needs (spicy, sweet, tea-time, healthy, etc.).
          3. If they ask for something not in the catalog, politely suggest the closest alternative we have.
          4. Keep responses concise and engaging.
          5. Mention prices if relevant.
          
          Here is our current product catalog context:
          ${productContext}`
        },
        ...(chatHistory || []).map(msg => ({
          role: msg.isAdmin ? "assistant" : "user",
          content: msg.message
        })),
        {
          role: "user",
          content: message
        }
      ],
      model: "llama-3.3-70b-versatile",
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "Namaste! I am currently reflecting on our recipes. How can I assist you otherwise?";

    res.json({ message: responseText, isAdmin: true, isAI: true });
  } catch (err) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ message: 'The AI concierge is temporarily resting. Please try again later.' });
  }
};
