const mongoose = require('mongoose');

/**
 * Connect to MongoDB database (MongoDB Atlas or Local MongoDB)
 * Loads URI from environment variable MONGODB_URI
 */
const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/utilityBilling';

  if (primaryUri) {
    try {
      const conn = await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 4000
      });
      console.log('MongoDB connected successfully: ' + conn.connection.host);
      return conn;
    } catch (error) {
      console.error('-------------------------------------------------------');
      console.error('❌ Primary MongoDB Connection Failed:', error.message);
      if (error.message.includes('Authentication failed') || error.message.includes('bad auth')) {
        console.error('💡 Atlas Troubleshooting:');
        console.error('  1. Open MongoDB Atlas -> "Database Access"');
        console.error('  2. Verify database user "project" exists with password "mani123"');
        console.error('  3. Open "Network Access" -> Ensure IP 0.0.0.0/0 (allow from anywhere) is active');
      }
      console.error('-------------------------------------------------------');

      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }

      await mongoose.disconnect().catch(() => {});
    }
  }

  // Fallback to local MongoDB
  console.log('🔄 Attempting fallback connection to local MongoDB...');
  try {
    const localConn = await mongoose.connect(fallbackUri);
    console.log('✅ Local MongoDB connected successfully: ' + localConn.connection.host);
    return localConn;
  } catch (localErr) {
    console.error('Local MongoDB fallback also failed:', localErr.message);
    process.exit(1);
  }
};

module.exports = connectDB;
