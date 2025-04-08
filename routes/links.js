// routes/links.js
const express = require('express');
const router = express.Router();
const shortid = require('shortid');
const auth = require('../middleware/auth');
const Link = require('../models/Link');

// @route   POST api/links
// @desc    Create a short link
// @access  Private
router.post('/', auth, async (req, res) => {
  const { originalUrl, customAlias, expiresAt } = req.body;
  
  try {
    // Validate URL
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    if (!originalUrl || !urlPattern.test(originalUrl)) {
      return res.status(400).json({ msg: 'Please include a valid URL' });
    }
    
    const linkData = {
      originalUrl,
      userId: req.user.id
    };

    // Handle custom alias
    if (customAlias) {
      // Check if custom alias already exists
      const existingLink = await Link.findOne({ 
        shortCode: customAlias 
      });
      
      if (existingLink) {
        return res.status(400).json({ msg: 'Custom alias already in use' });
      }
      
      linkData.shortCode = customAlias;
    } else {
      linkData.shortCode = shortid.generate();
    }

    // Handle expiration date
    if (expiresAt) {
      linkData.expiresAt = new Date(expiresAt);
    }

    const link = new Link(linkData);
    await link.save();

    res.json(link);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/links
// @desc    Get all links for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const links = await Link.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(links);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/links/:id
// @desc    Delete a link
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    let link = await Link.findById(req.params.id);

    if (!link) {
      return res.status(404).json({ msg: 'Link not found' });
    }

    // Check user
    if (link.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await Link.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Link removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;