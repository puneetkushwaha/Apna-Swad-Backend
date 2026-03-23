const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { createNotification } = require('./notificationController');
const { sendWelcomeEmail } = require('../services/emailService');
const PromotionSetting = require('../models/PromotionSetting');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const getAdminEmails = () => {
  try {
    const filePath = path.join(__dirname, '../config/admins.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading admin emails:', err);
  }
  return [];
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

exports.signup = async (req, res) => {
  try {
    const { name, email, phone, password, referralCode: usedReferralCode } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    // Generate new unique referral code
    const newReferralCode = 'AS' + crypto.randomBytes(3).toString('hex').toUpperCase();

    user = new User({ name, email, phone, password, referralCode: newReferralCode });

    // Handle incoming referral
    if (usedReferralCode) {
      const settings = await PromotionSetting.findOne({ settingId: 'global_promo_config' });
      if (settings && settings.referral && settings.referral.isEnabled) {
        const referrer = await User.findOne({ referralCode: usedReferralCode.toUpperCase() });
        if (referrer) {
          user.referredBy = referrer._id;
          
          // Update referrer
          referrer.referralCount += 1;
          if (referrer.referralCount % settings.referral.targetCount === 0) {
            referrer.rewardsEarned += 1;
            
            // Notify Referrer
            await createNotification({
              recipient: referrer._id.toString(),
              type: 'system',
              title: 'Free Pack Earned! 🎉',
              message: `Congratulations! Your 5th referral just signed up. You've earned a free pack reward!`,
              link: '/profile'
            });
          }
          await referrer.save();
        }
      }
    }

    const createdUser = await user.save();

    // Send Welcome Email
    try {
      await sendWelcomeEmail(email, name);
    } catch (emailError) {
      console.error('Email sending failed during signup:', emailError);
    }

    // Notify Admin
    await createNotification({
      recipient: 'admin',
      type: 'new_user',
      title: 'New Customer Sign Up',
      message: `A new customer, ${name} (${email}), has just joined Apna Swad!`,
      link: '/admin/users'
    });

    const token = generateToken(user);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { name, email, sub: googleId, picture: avatar } = ticket.getPayload();

    let user = await User.findOne({ email });
    const adminEmails = getAdminEmails();

    if (!user) {
      const { referralCode: usedReferralCode } = req.body;
      const newReferralCode = 'AS' + crypto.randomBytes(3).toString('hex').toUpperCase();

      user = new User({ 
        name, 
        email, 
        googleId, 
        avatar,
        role: adminEmails.includes(email) ? 'admin' : 'user',
        referralCode: newReferralCode
      });

      // Handle referral for Google signup
      if (usedReferralCode) {
        const settings = await PromotionSetting.findOne({ settingId: 'global_promo_config' });
        if (settings && settings.referral && settings.referral.isEnabled) {
          const referrer = await User.findOne({ referralCode: usedReferralCode.toUpperCase() });
          if (referrer) {
            user.referredBy = referrer._id;
            referrer.referralCount += 1;
            if (referrer.referralCount % settings.referral.targetCount === 0) {
              referrer.rewardsEarned += 1;
            }
            await referrer.save();
          }
        }
      }

      await user.save();

      // Send Welcome Email
      try {
        await sendWelcomeEmail(email, name);
      } catch (emailError) {
        console.error('Email sending failed during Google auth:', emailError);
      }

      // Notify Admin
      await createNotification({
        recipient: 'admin',
        type: 'new_user',
        title: 'New Customer Sign Up (Google)',
        message: `A new customer, ${name} (${email}), has just joined via Google!`,
        link: '/admin/users'
      });
    } else {
      let isUpdated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        isUpdated = true;
      }
      if (user.avatar !== avatar) {
        user.avatar = avatar;
        isUpdated = true;
      }
      // Auto-promote if in the admins list and not already admin
      if (adminEmails.includes(email) && user.role !== 'admin') {
        user.role = 'admin';
        isUpdated = true;
      }
      
      if (isUpdated) await user.save();
    }

    const token = generateToken(user);
    res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
