// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for:', email); // Log incoming request

  try {
    const user = await User.findOne({ email });
    console.log('Found user:', user); // Log the found user

    if (!user) {
      console.log('No user found with this email');
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
console.log(password)
    console.log('Comparing passwords...');
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = {
      user: { id: user.id }
    };

    console.log('Generating JWT...');
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: '24h' },
      (err, token) => {
        if (err) {
          console.error('JWT generation error:', err);
          throw err;
        }
        console.log('Token generated successfully');
        res.json({ token, user: { id: user.id, email: user.email } }); // Return more user info
      }
    );
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/user
// @desc    Get user by token
// @access  Private
// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }
  
      const hashedPassword = await bcrypt.hash(password,10);
  
      user = new User({
        email,
        password: hashedPassword
      });
      console.log(password);
      await user.save();
  
      // Return JWT
      const payload = {
        user: { id: user.id }
      };
  
      jwt.sign(
        payload,
        process.env.JWT_SECRET || 'defaultsecret',
        { expiresIn: '24h' },
        (err, token) => {
          if (err) throw err;
          res.status(201).json({ token ,user:{id: user.id, email: user.email}});
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
  
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/seed
// @desc    Seed default user
// @access  Public (for testing only)
router.get('/seed', async (req, res) => {
  try {
    const email = 'intern@dacoid.com';
    const existing = await User.findOne({ email });

    if (existing) {
      return res.json({ msg: 'Test user already exists' });
    }

    const hashedPassword = await bcrypt.hash('Test123', 10);

    const newUser = new User({
      email,
      password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ msg: 'Test user created' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
