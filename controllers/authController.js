const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { createNotification } = require('./notificationController');
const { sendWelcomeEmail } = require('../services/emailService');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

exports.signup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    user = new User({ name, email, phone, password });
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
    if (!user) {
      user = new User({ name, email, googleId, avatar });
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
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.avatar = avatar;
      await user.save();
    }

    const token = generateToken(user);
    res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
