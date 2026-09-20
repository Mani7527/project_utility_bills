/**
 * Authentication Middleware
 * Ensures user is authenticated via express-session.
 */

// Require logged-in user
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    if (req.session) {
      req.session.errorMessage = 'Please log in to access this page.';
    }
    return res.redirect('/auth/login');
  }
  next();
};

// Redirect already logged-in users away from login/register pages
const redirectIfAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else if (role === 'meter_reader') {
      return res.redirect('/meter-reader/dashboard');
    } else {
      return res.redirect('/consumer/dashboard');
    }
  }
  next();
};

module.exports = {
  requireAuth,
  redirectIfAuth
};
