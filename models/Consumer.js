const mongoose = require('mongoose');

const consumerSchema = new mongoose.Schema({
  consumerId: {
    type: String,
    required: [true, 'Consumer ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Consumer name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  connectionType: {
    type: String,
    enum: ['Electricity', 'Water'],
    default: 'Electricity'
  },
  meterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meter',
    default: null
  },
  tariffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tariff',
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  role: {
    type: String,
    default: 'consumer'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Consumer', consumerSchema);
