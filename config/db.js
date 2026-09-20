const mongoose = require('mongoose');

/**
 * Connect to MongoDB database (MongoDB Atlas or Local MongoDB)
 * Loads URI from environment variable MONGODB_URI
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/utilityBilling');
    console.log('MongoDB connected successfully: ' + conn.connection.host);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // Don't crash immediately in dev, but log error clearly
    process.exit(1);
  }
};

module.exports = connectDB;
