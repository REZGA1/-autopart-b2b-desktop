const { supabaseAdmin } = require('../config/supabase');
const { errorResponse } = require('../utils/response');
const ProfileModel = require('../repositories/userRepository');

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer '))
      return errorResponse(res, 'You must be logged in first', 401);

    const token = header.split(' ')[1];

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user)
      return errorResponse(res, 'Token is invalid or expired', 401);

    const metaRole = user.user_metadata?.role || user.user_metadata?.data?.role;

    let role = metaRole;
    if (!role) {
      try {
        const profile = await ProfileModel.findByUserId(user.id);
        role = profile?.role;
      } catch {
        // Silently fail if role lookup fails
      }
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: role,
      meta: user.user_metadata || {},
    };

    ProfileModel.updateOnlineStatus(user.id, true).catch(() => {});

    next();
  } catch {
    return errorResponse(res, 'Verification error', 401);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!roles.includes(userRole))
      return errorResponse(res, `Requires: ${roles.join(' or ')}. Your role: ${userRole || 'none'}`, 403);
    next();
  };
};

module.exports = { protect, authorize };
