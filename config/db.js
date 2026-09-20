const mongoose = require('mongoose');

/**
 * Connect to MongoDB database (MongoDB Atlas or Local MongoDB)
 * Loads URI from environment variable MONGODB_URI
 */
const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/utilityBilling';

  // Prevent uncaught error crashes from handshake failures
  mongoose.connection.on('error', (err) => {
    // Handled in catch blocks
  });

  if (primaryUri) {
    try {
      await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 4000
      });

      // Verify authenticated database ping
      await mongoose.connection.db.admin().ping();
      console.log('✅ MongoDB Atlas connected successfully: ' + mongoose.connection.host);
      return mongoose.connection;
    } catch (error) {
      console.error('-------------------------------------------------------');
      console.error('❌ MongoDB Atlas Authentication Failed:', error.message);
      if (error.message.includes('Authentication failed') || error.message.includes('bad auth')) {
        console.error('💡 Atlas Troubleshooting (Takes 30 Seconds):');
        console.error('  1. Open https://cloud.mongodb.com -> Select your Project');
        console.error('  2. Click "Database Access" in the left sidebar');
        console.error('  3. Create/Edit user: username = "project", password = "mani123"');
        console.error('  4. Set Role to "Read and write to any database" -> Save');
        console.error('  5. In "Network Access" -> Ensure IP 0.0.0.0/0 is enabled');
      }
      console.error('-------------------------------------------------------');

      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }

      await mongoose.disconnect().catch(() => {});
    }
  }

  // Fallback to local MongoDB in development
  console.log('🔄 Connected to Local MongoDB fallback (127.0.0.1:27017) to keep app active...');
  try {
    await mongoose.connect(fallbackUri);
    console.log('✅ Local MongoDB connected successfully: ' + mongoose.connection.host);
    return mongoose.connection;
  } catch (localErr) {
    console.error('Local MongoDB fallback also failed:', localErr.message);
    process.exit(1);
  }
};

module.exports = connectDB;
