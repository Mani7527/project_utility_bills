require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();

// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/utilityBilling';
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'utility_billing_secret_super_secure',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUrl,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE === 'true'
    }
  })
);

// Global Template Variables (User context, Flash message handling, Current path)
app.use((req, res, next) => {
  res.locals.user = req.session?.user || null;
  res.locals.successMessage = req.session?.successMessage || null;
  res.locals.errorMessage = req.session?.errorMessage || null;

  if (req.session) {
    delete req.session.successMessage;
    delete req.session.errorMessage;
  }

  res.locals.currentPath = req.path;
  next();
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const consumerRoutes = require('./routes/consumerRoutes');
const meterRoutes = require('./routes/meterRoutes');
const readingRoutes = require('./routes/readingRoutes');
const billRoutes = require('./routes/billRoutes');

// Root Route - Smart Redirect based on authentication & role
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === 'admin') return res.redirect('/admin/dashboard');
    if (role === 'meter_reader') return res.redirect('/meter-reader/dashboard');
    return res.redirect('/consumer/dashboard');
  }
  res.redirect('/auth/login');
});

// Mount Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/consumer', consumerRoutes);
app.use('/meter-reader', readingRoutes);
app.use('/meters', meterRoutes);
app.use('/bills', billRoutes);

// 404 Error Handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Page Not Found',
    statusCode: 404,
    message: 'The page you are looking for does not exist.',
    user: req.session?.user || null
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err.stack);
  res.status(500).render('error', {
    title: '500 - Server Error',
    statusCode: 500,
    message: 'Something went wrong on the server. Please try again later.',
    user: req.session?.user || null
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(` Smart Utility Billing & Meter Management System`);
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=======================================================`);
});
