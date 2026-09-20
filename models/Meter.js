const mongoose = require('mongoose');

const meterSchema = new mongoose.Schema({
  meterNumber: {
    type: String,
    required: [true, 'Meter number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  consumerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consumer',
    default: null
  },
  connectionType: {
    type: String,
    enum: ['Electricity', 'Water'],
    default: 'Electricity'
  },
  installationDate: {
    type: Date,
    default: Date.now
  },
  lastReading: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Faulty'],
    default: 'Active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Meter', meterSchema);
