const mongoose = require('mongoose');

const slabTierSchema = new mongoose.Schema({
  from: {
    type: Number,
    required: true,
    min: 0
  },
  to: {
    type: Number, // null or undefined means and above (infinity)
    default: null
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const tariffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tariff plan name is required'],
    trim: true
  },
  connectionType: {
    type: String,
    enum: ['Electricity', 'Water'],
    default: 'Electricity'
  },
  slabs: {
    type: [slabTierSchema],
    required: true,
    validate: {
      validator: function (v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Tariff must have at least one slab tier'
    }
  },
  fixedCharge: {
    type: Number,
    required: true,
    default: 100,
    min: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Tariff', tariffSchema);
