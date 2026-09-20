const User = require('../models/User');
const Consumer = require('../models/Consumer');

// GET /auth/login
exports.getLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Login - Smart Utility Billing',
    user: null
  });
};

// POST /auth/login
exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      req.session.errorMessage = 'Please provide both email and password.';
      return res.redirect('/auth/login');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      req.session.errorMessage = 'Invalid email or password.';
      return res.redirect('/auth/login');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      req.session.errorMessage = 'Invalid email or password.';
      return res.redirect('/auth/login');
    }

    // Set user in session (exclude password hash)
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      consumerRef: user.consumerRef
    };

    req.session.successMessage = `Welcome back, ${user.name}!`;

    // Role-based redirect
    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else if (user.role === 'meter_reader') {
      return res.redirect('/meter-reader/dashboard');
    } else {
      return res.redirect('/consumer/dashboard');
    }
  } catch (error) {
    console.error('Login error:', error);
    req.session.errorMessage = 'An error occurred during login. Please try again.';
    res.redirect('/auth/login');
  }
};

// GET /auth/register
exports.getRegister = (req, res) => {
  res.render('auth/register', {
    title: 'Consumer Registration - Smart Utility Billing',
    user: null
  });
};

// POST /auth/register
exports.postRegister = async (req, res) => {
  try {
    const { name, email, password, phone, address, connectionType } = req.body;

    if (!name || !email || !password || !phone || !address) {
      req.session.errorMessage = 'All fields are required for registration.';
      return res.redirect('/auth/register');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      req.session.errorMessage = 'An account with this email already exists.';
      return res.redirect('/auth/register');
    }

    // Generate unique consumerId e.g. CON001
    const count = await Consumer.countDocuments();
    const consumerId = `CON${(count + 1).toString().padStart(3, '0')}`;

    // Create Consumer document
    const consumer = await Consumer.create({
      consumerId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      address: address.trim(),
      connectionType: connectionType || 'Electricity',
      role: 'consumer'
    });

    // Create User document linked to Consumer
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'consumer',
      consumerRef: consumer._id
    });

    // Link user back to consumer
    consumer.userId = newUser._id;
    await consumer.save();

    req.session.successMessage = `Registration successful! Your Consumer ID is ${consumerId}. Please log in.`;
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.session.errorMessage = 'Registration failed. ' + error.message;
    res.redirect('/auth/register');
  }
};

// GET /auth/logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/auth/login');
  });
};
