const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Link = require('../models/Link');
const ClickEvent = require('../models/ClickEvent');

// @route   GET api/analytics/link/:id
// @desc    Get analytics for a specific link
// @access  Private
router.get('/link/:id', auth, async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);

    if (!link) {
      return res.status(404).json({ msg: 'Link not found' });
    }

    // Check user
    if (link.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Get click events for this link
    const clickEvents = await ClickEvent.find({ linkId: link._id });

    // Process data for charts
    const clicksByDate = {};
    const deviceCounts = {};
    const browserCounts = {};
    const countryCount = {};
    const referrerCount = {};

    clickEvents.forEach(event => {
      // Format date as YYYY-MM-DD
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      
      // Count clicks by date
      if (clicksByDate[date]) {
        clicksByDate[date]++;
      } else {
        clicksByDate[date] = 1;
      }
      
      // Count devices
      const device = event.device || 'unknown';
      if (deviceCounts[device]) {
        deviceCounts[device]++;
      } else {
        deviceCounts[device] = 1;
      }
      
      // Count browsers
      const browser = event.browser || 'unknown';
      if (browserCounts[browser]) {
        browserCounts[browser]++;
      } else {
        browserCounts[browser] = 1;
      }

      // Count countries
      if (event.country) {
        if (countryCount[event.country]) {
          countryCount[event.country]++;
        } else {
          countryCount[event.country] = 1;
        }
      }

      // Count referrers
      const referrer = event.referrer || 'Direct';
      if (referrerCount[referrer]) {
        referrerCount[referrer]++;
      } else {
        referrerCount[referrer] = 1;
      }
    });

    // Format for chart.js or recharts
    const clicksOverTime = Object.keys(clicksByDate).map(date => ({
      date,
      clicks: clicksByDate[date]
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    const deviceData = Object.keys(deviceCounts).map(device => ({
      device,
      count: deviceCounts[device]
    })).sort((a, b) => b.count - a.count);

    const browserData = Object.keys(browserCounts).map(browser => ({
      browser,
      count: browserCounts[browser]
    })).sort((a, b) => b.count - a.count);

    // Format countries data
    const countries = Object.keys(countryCount).map(country => ({
      name: country,
      count: countryCount[country]
    })).sort((a, b) => b.count - a.count);

    // Format referrers data
    const referrers = Object.keys(referrerCount).map(source => ({
      source,
      count: referrerCount[source]
    })).sort((a, b) => b.count - a.count);

    // Add the country and referrer data to the link object
    link.countries = countries;
    link.referrers = referrers;

    res.json({
      link,
      clicksOverTime,
      deviceData,
      browserData,
      totalClicks: link.clicks
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


router.get('/dashboard', auth, async (req, res) => {
  try {
    const links = await Link.find({ userId: req.user.id });
    const linkIds = links.map(link => link._id);
    
    // Get total clicks for all user's links
    const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
    
    // Get recent clicks
    const recentClicks = await ClickEvent.find({
      linkId: { $in: linkIds }
    }).sort({ timestamp: -1 }).limit(50);
    
    // Get clicks by date for all links
    const allClickEvents = await ClickEvent.find({
      linkId: { $in: linkIds }
    });
    
    const clicksByDate = {};
    allClickEvents.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      if (clicksByDate[date]) {
        clicksByDate[date]++;
      } else {
        clicksByDate[date] = 1;
      }
    });
    
    const clicksOverTime = Object.keys(clicksByDate).map(date => ({
      date,
      clicks: clicksByDate[date]
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Get top performing links
    const topLinks = [...links]
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5)
      .map(link => ({
        id: link._id,
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
        clicks: link.clicks
      }));
    
    res.json({
      totalLinks: links.length,
      totalClicks,
      clicksOverTime,
      topLinks,
      recentClicks: recentClicks.map(click => ({
        id: click._id,
        linkId: click.linkId,
        timestamp: click.timestamp,
        device: click.device,
        browser: click.browser,
        country: click.country,
        referrer: click.referrer || 'Direct'
      }))
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;