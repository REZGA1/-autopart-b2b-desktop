const { supabaseAdmin } =
  require('../config/supabase');
const { errorResponse } =
  require('../utils/response');
const ProfileModel = require('../models/userModel');

// Verifies token via Supabase (no local jwt.verify)
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer '))
      return errorResponse(res,
        'You must be logged in first', 401);

    const token = header.split(' ')[1];

    // Supabase verifies and returns user data directly
    const { data: { user }, error } =
      await supabaseAdmin.auth.getUser(token);

    if (error || !user)
      return errorResponse(res,
        'Token is invalid or expired', 401);

    // Get role from user_metadata
    const metaRole = user.user_metadata?.role || 
                     user.user_metadata?.data?.role;
    
    // If role not in metadata, fetch from database profile
    let role = metaRole;
    if (!role) {
      try {
        const profile = await ProfileModel.findByUserId(user.id);
        role = profile?.role;
      } catch (e) {
        // Silently fail - will result in 403 if role is required
      }
    }

    // User data directly from Supabase
    req.user = {
      userId: user.id,
      email:  user.email,
      role:   role,  // Set role from metadata or profile
      meta:   user.user_metadata || {},
    };

    // Update online status to true (fire and forget - don't block request)
    ProfileModel.updateOnlineStatus(user.id, true).catch(() => {
      // Silently fail - online status is not critical
    });

    next();

  } catch (err) {
    return errorResponse(res, 'Verification error', 401);
  }
};

// authorize checks role from req.user (set by protect middleware)
const authorize = (...roles) => {
  return (req, res, next) => {
    // Role is set by protect middleware from metadata or profile
    const userRole = req.user?.role;
    
    console.log('[authorize] User role:', userRole, 'Required:', roles);
    
    if (!roles.includes(userRole))
      return errorResponse(res,
        `Requires: ${roles.join(' or ')}. Your role: ${userRole || 'none'}`, 403);
    next();
  };
};

module.exports = { protect, authorize };