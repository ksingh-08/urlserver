// models/ClickEvent.js
const mongoose = require('mongoose');

const ClickEventSchema = new mongoose.Schema({
  linkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Link',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  },
  device: {
    type: String
  },
  browser: {
    type: String
  },
  os: {
    type: String
  },
  location: {
    country: String,
    city: String
  }
});

module.exports = mongoose.model('ClickEvent', ClickEventSchema);