const { Resend } = require('resend');
const dotenv = require('dotenv');
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'Apna Swad <onboarding@resend.dev>'; // Note: In production with custom domain, use support@apnaswad.in

const BRAND_COLORS = {
  primary: '#4a2c2a',
  secondary: '#c48c4e',
  bg: '#fdf8f4',
  text: '#333333'
};

const getBaseTemplate = (content, previewText) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apna Swad</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: ${BRAND_COLORS.bg}; color: ${BRAND_COLORS.text}; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .header { background: ${BRAND_COLORS.primary}; padding: 30px; text-align: center; }
        .header img { height: 80px; margin-bottom: 10px; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; }
        .content { padding: 40px 30px; line-height: 1.6; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        .button { display: inline-block; padding: 12px 30px; background-color: ${BRAND_COLORS.secondary}; color: #ffffff !important; text-decoration: none; border-radius: 50px; font-weight: bold; margin-top: 20px; }
        .highlight { color: ${BRAND_COLORS.secondary}; font-weight: bold; }
        .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .order-table th { text-align: left; border-bottom: 2px solid #eee; padding: 10px; }
        .order-table td { padding: 10px; border-bottom: 1px solid #eee; }
    </style>
</head>
<body>
    <div style="display: none; max-height: 0px; overflow: hidden;">${previewText}</div>
    <div class="container">
        <div class="header">
            <img src="https://res.cloudinary.com/dnzlgjs94/image/upload/v1710672000/logo_v2.png" alt="Apna Swad Logo">
            <h1>APNA SWAD</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Apna Swad. Authentic Bihari Delicacies.</p>
            <p>Lucknow, Uttar Pradesh, India</p>
            <p>Visit us: <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="color: ${BRAND_COLORS.secondary};">apnaswad.in</a></p>
        </div>
    </div>
</body>
</html>
`;

/**
 * Send Welcome Email
 */
exports.sendWelcomeEmail = async (email, name) => {
  const content = `
    <h2>Welcome to the Family, ${name}! 🥟</h2>
    <p>We are absolutely thrilled to have you with us. At <span class="highlight">Apna Swad</span>, we bring the authentic taste of Bihar's heritage right to your doorstep.</p>
    <p>From our signature <span class="highlight">Thekuas</span> to traditional snacks, everything is made with love and purity.</p>
    <p>Start exploring our collection and satisfy your cravings today!</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">Explore Products</a>
    <p style="margin-top: 30px;">Best Regards,<br>Team Apna Swad</p>
  `;
  
  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to Apna Swad - Taste of Heritage!',
      html: getBaseTemplate(content, 'Welcome to the world of authentic Bihari flavors!')
    });
    console.log('Welcome Email Sent Successfully:', data);
    return data;
  } catch (error) {
    console.error('Welcome Email Error:', error);
    throw error;
  }
};

exports.sendOrderConfirmation = async (email, order, isAdmin = false) => {
  const itemsHtml = order.items.map(item => `
    <tr>
        <td>${item.name} x ${item.quantity}</td>
        <td style="text-align: right;">Rs. ${item.price * item.quantity}</td>
    </tr>
  `).join('');

  const content = `
    <h2>${isAdmin ? 'New Order Received! 🛍️' : 'Order Confirmed! 🎉'}</h2>
    <p>${isAdmin ? 'Hey Admin, a new order has been placed.' : `Hi ${order.shippingAddress.phone || 'Foodie'}, thank you for your order! We\'ve received it and are preparing it with care.`}</p>
    <p><strong>Order ID:</strong> #${order._id.toString().slice(-6).toUpperCase()}</p>
    
    <table class="order-table">
        <thead>
            <tr>
                <th>Items</th>
                <th style="text-align: right;">Price</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
            <tr style="font-weight: bold;">
                <td>Total</td>
                <td style="text-align: right;">Rs. ${order.totalAmount}</td>
            </tr>
        </tbody>
    </table>

    <p><strong>Shipping to:</strong><br>
    ${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.zipCode}</p>

    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/${isAdmin ? 'admin/orders/' + order._id : 'profile'}" class="button">${isAdmin ? 'Process Order' : 'Track Your Order'}</a>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: isAdmin ? `New Order Alert: #${order._id.toString().slice(-6).toUpperCase()}` : `Order Confirmed: #${order._id.toString().slice(-6).toUpperCase()}`,
      html: getBaseTemplate(content, isAdmin ? 'A new customer order needs your attention!' : 'We have received your order and are starting to prepare it!')
    });
    console.log(`Order Confirmation Email (${isAdmin ? 'Admin' : 'User'}) Sent Successfully:`, data);
    return data;
  } catch (error) {
    console.error(`Order Confirmation Email (${isAdmin ? 'Admin' : 'User'}) Error:`, error);
    throw error;
  }
};

/**
 * Send Status Update
 */
exports.sendStatusUpdate = async (email, order, status) => {
  let statusMsg = '';
  let emoji = '';
  
  switch(status) {
    case 'shipped': 
        statusMsg = 'Your order has been shipped and is on its way to you!'; 
        emoji = '🚚';
        break;
    case 'delivered': 
        statusMsg = 'Yay! Your order has been successfully delivered. Enjoy your snacks!'; 
        emoji = '✅';
        break;
    case 'cancelled': 
        statusMsg = 'Your order has been cancelled as per request.'; 
        emoji = '❌';
        break;
    default: 
        statusMsg = `Your order status has been updated to: ${status}`;
        emoji = 'ℹ️';
  }

  const content = `
    <h2>Order Update ${emoji}</h2>
    <p>Hi there, we have an update on your order <strong>#${order._id.toString().slice(-6).toUpperCase()}</strong>.</p>
    <p style="font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${statusMsg}</p>
    
    <p>If you have any questions, feel free to chat with us on our website.</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile" class="button">View Order Details</a>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Update on your Order: ${status.toUpperCase()}`,
      html: getBaseTemplate(content, `Your order status has been updated to ${status}`)
    });
    console.log('Status Update Email Sent Successfully:', data);
    return data;
  } catch (error) {
    console.error('Status Update Email Error:', error);
    throw error;
  }
};

/**
 * Send Bulk/Marketing Email
 */
exports.sendBulkEmail = async (recipients, subject, title, body) => {
  const content = `
    <h2>${title}</h2>
    <div style="font-size: 16px; color: #444;">
        ${body.replace(/\n/g, '<br>')}
    </div>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">Shop Now</a>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipients, // Array of emails
      subject: subject,
      html: getBaseTemplate(content, title)
    });
    console.log('Bulk Email Sent Successfully:', data);
    return data;
  } catch (error) {
    console.error('Bulk Email Error:', error);
    throw error;
  }
};
