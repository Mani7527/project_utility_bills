/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if the authenticated user has the required permission level.
 */

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      if (req.session) {
        req.session.errorMessage = 'You must be logged in to view this resource.';
      }
      return res.redirect('/auth/login');
    }

    const userRole = req.session.user.role;

    if (!allowedRoles.includes(userRole)) {
      // Forbidden: logged in, but lacks appropriate role
      return res.status(403).render('error', {
        title: 'Access Denied',
        statusCode: 403,
        message: `Unauthorized Access: Your role '${userRole}' does not have permission to view this page.`,
        user: req.session.user
      });
    }

    next();
  };
};

module.exports = { requireRole };
