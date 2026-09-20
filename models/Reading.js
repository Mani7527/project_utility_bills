const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  meterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meter',
    required: [true, 'Meter ID is required']
  },
  consumerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consumer',
    required: [true, 'Consumer ID is required']
  },
  previousReading: {
    type: Number,
    required: [true, 'Previous reading is required'],
    min: 0
  },
  currentReading: {
    type: Number,
    required: [true, 'Current reading is required'],
    min: 0
  },
  unitsConsumed: {
    type: Number,
    required: [true, 'Units consumed is required'],
    min: 0
  },
  readingDate: {
    type: Date,
    default: Date.now
  },
  month: {
    type: String,
    required: [true, 'Billing month is required']
  },
  year: {
    type: Number,
    required: [true, 'Billing year is required']
  },
  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Entered by user ID is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Reading', readingSchema);
