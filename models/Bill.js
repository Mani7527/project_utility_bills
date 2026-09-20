const mongoose = require('mongoose');

const slabBreakdownSchema = new mongoose.Schema({
  slabRange: String,
  unitsBilled: Number,
  rate: Number,
  amount: Number
}, { _id: false });

const billSchema = new mongoose.Schema({
  billId: {
    type: String,
    required: [true, 'Bill ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  consumerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consumer',
    required: [true, 'Consumer reference is required']
  },
  meterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meter',
    required: [true, 'Meter reference is required']
  },
  readingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reading',
    required: [true, 'Reading reference is required']
  },
  billingMonth: {
    type: String,
    required: [true, 'Billing month is required']
  },
  billingYear: {
    type: Number,
    required: [true, 'Billing year is required']
  },
  previousReading: {
    type: Number,
    required: true,
    min: 0
  },
  currentReading: {
    type: Number,
    required: true,
    min: 0
  },
  unitsConsumed: {
    type: Number,
    required: true,
    min: 0
  },
  energyCharge: {
    type: Number,
    required: true,
    min: 0
  },
  fixedCharge: {
    type: Number,
    required: true,
    min: 0
  },
  surcharge: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['UNPAID', 'PAID'],
    default: 'UNPAID'
  },
  paymentDate: {
    type: Date,
    default: null
  },
  breakdown: [slabBreakdownSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Bill', billSchema);
