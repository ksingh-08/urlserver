// controllers/redirect.js
const Link = require('../models/Link');
const ClickEvent = require('../models/ClickEvent');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');

module.exports = async (req, res) => {
  try {
    // Here's the key fix - using req.params.code instead of shortCode
    const link = await Link.findOne({ shortCode: req.params.code });

    if (!link) {
      return res.status(404).json({ msg: 'Link not found' });
    }

    // Check if link has expired
    if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
      return res.status(410).json({ msg: 'Link has expired' });
    }

    // Increment click count
    link.clicks++;
    await link.save();

    // Log click event asynchronously
    const parser = new UAParser(req.headers['user-agent']);
    const parsedUA = parser.getResult();
    
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // Make the geoip lookup safe in case of invalid IPs
    let geo = null;
    try {
      geo = geoip.lookup(ip);
    } catch (geoErr) {
      console.error('GeoIP lookup error:', geoErr);
    }

    const clickEvent = new ClickEvent({
      linkId: link._id,
      ipAddress: ip,
      device: parsedUA.device.type || 'desktop',
      browser: parsedUA.browser.name,
      os: parsedUA.os.name,
      location: geo ? {
        country: geo.country,
        city: geo.city
      } : null
    });

    // Don't wait for save to complete before redirecting
    clickEvent.save().catch(err => console.error('Error saving click event:', err));

    // Add safety check for the URL before redirecting
    try {
      new URL(link.originalUrl); // This will throw if the URL is invalid
      return res.redirect(link.originalUrl);
    } catch (urlError) {
      console.error('Invalid URL in database:', link.originalUrl);
      return res.status(400).json({ msg: 'Invalid destination URL' });
    }
  } catch (err) {
    console.error('Redirect error:', err.message);
    res.status(500).send('Server error');
  }
};