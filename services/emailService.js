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
            <img src="https://apna-swad-self.vercel.app/mascot_logo.png" alt="Apna Swad Logo">
            <h1>APNA SWAD</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Apna Swad. Authentic Bihari Delicacies.</p>
            <p>Lucknow, Uttar Pradesh, India</p>
            <p>Visit us: <a href="${process.env.FRONTEND_URL || 'https://apna-swad-self.vercel.app'}" style="color: ${BRAND_COLORS.secondary};">apnaswad.in</a></p>
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
    <a href="${process.env.FRONTEND_URL || 'https://apna-swad-self.vercel.app'}/profile" class="button">Explore Products</a>
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

    <a href="${process.env.FRONTEND_URL || 'https://apna-swad-self.vercel.app'}/${isAdmin ? 'admin/orders/' + order._id : 'profile'}" class="button">${isAdmin ? 'Process Order' : 'Track Your Order'}</a>
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
    <a href="${process.env.FRONTEND_URL || 'https://apna-swad-self.vercel.app'}/profile" class="button">View Order Details</a>
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
    <a href="${process.env.FRONTEND_URL || 'https://apna-swad-self.vercel.app'}" class="button">Shop Now</a>
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
/**
 * Send Abandoned Cart Email
 */
exports.sendAbandonedCartEmail = async (user) => {
  const itemsHtml = user.cart.map(item => `
    <tr>
        <td>${item.name} x ${item.quantity}</td>
        <td style="text-align: right;">Rs. ${item.price * item.quantity}</td>
    </tr>
  `).join('');

  const content = `
    <h2>You Left Something Delicious! 🥟✨</h2>
    <p>Hi ${user.name || 'Foodie'}, we noticed you left some authentic heritage snacks in your cart. They are waiting for you!</p>
    
    <table class="order-table">
        <thead>
            <tr>
                <th>Items</th>
                <th style="text-align: right;">Price</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
    </table>

    <p style="font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">
        Complete your order now and use code <span style="background: #fff; padding: 2px 8px; border: 1px dashed ${BRAND_COLORS.secondary};">SAVE5</span> for an extra 5% OFF!
    </p>
    
    <p>Treat yourself to the heritage taste you deserve.</p>
    <a href="${process.env.FRONTEND_URL || 'https://apna-swad-self.vercel.app'}/cart" class="button">Return to Cart</a>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: 'Your snacks are waiting for you! (5% OFF inside) 🥟',
      html: getBaseTemplate(content, 'Complete your order and enjoy a special gift from Apna Swad!')
    });
    console.log('Abandoned Cart Email Sent Successfully:', data);
    return data;
  } catch (error) {
    console.error('Abandoned Cart Email Error:', error);
    throw error;
  }
};
/**
 * Send Referral Reward Email
 */
exports.sendReferralRewardEmail = async (email, name, couponCode) => {
  const content = `
    <h2>You've Earned a Free Heritage Pack! 🎁✨</h2>
    <p>Congratulations ${name}! You've successfully referred 5 friends to Apna Swad, and as a token of our appreciation, we're gifting you a free pack of our finest heritage snacks.</p>
    
    <div style="background: ${BRAND_COLORS.bg}; border: 2px dashed ${BRAND_COLORS.secondary}; padding: 30px; border-radius: 20px; text-align: center; margin: 30px 0;">
        <p style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: ${BRAND_COLORS.text}; opacity: 0.7;">Your Unique Reward Code</p>
        <h1 style="margin: 10px 0; font-size: 42px; color: ${BRAND_COLORS.primary}; letter-spacing: 5px;">${couponCode}</h1>
        <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.secondary}; font-weight: bold;">100% OFF ON YOUR NEXT ORDER</p>
    </div>

    <p>Simply enter this code at checkout to claim your complimentary gift. Thank you for being a part of our heritage family and sharing the taste of Bihar!</p>
    
    <a href="${process.env.FRONTEND_URL || 'https://apna-swad-self.vercel.app'}" class="button">Claim Your Free Pack</a>
    
    <p style="margin-top: 30px; font-size: 12px; color: #999;">This code is valid for one-time use only. Terms & conditions apply.</p>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your Free Pack Reward is Here! 🥟🎁',
      html: getBaseTemplate(content, 'Congratulations! You have earned a free heritage pack reward from Apna Swad.')
    });
    console.log('Referral Reward Email Sent Successfully:', data);
    return data;
  } catch (error) {
    console.error('Referral Reward Email Error:', error);
    throw error;
  }
};
