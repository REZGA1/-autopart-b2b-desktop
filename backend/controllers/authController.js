const AuthService = require('../services/authService');
const ProfileModel = require('../models/userModel');
const { supabaseAdmin } = require('../config/supabase');
const DocumentController = require('./documentController');
const { successResponse, errorResponse } =
  require('../utils/response');

// No supabase, no ProfileModel — Controller knows nothing about the data layer

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   30 * 24 * 60 * 60 * 1000,
};

const AuthController = {

  async register(req, res) {
    try {
      console.log('[Register] Attempting to register user:', req.body.email);
      const result = await AuthService.register(req.body);
      console.log('[Register] Success:', result.user?.id);

      // If no session (email confirmation required)
      if (!result.accessToken) {
        return successResponse(res, {
          user:        result.user,
          message:     result.message,
          requiresEmailConfirmation: true,
        }, result.message, 201);
      }

      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTS);
      return successResponse(res, {
        user:        result.user,
        profile:     result.profile,
        accessToken: result.accessToken,
      }, 'Account created successfully', 201);
    } catch (err) {
      console.error('[Register] Error:', err);
      if (err.status)
        return errorResponse(res, err.message, err.status);
      return errorResponse(res, err.message || 'Server error', 500);
    }
  },

  async login(req, res) {
    try {
      console.log('[Login] Attempting to login user:', req.body.email);
      const result = await AuthService.login(req.body);
      console.log('[Login] Success:', result.user?.id);

      // Set online status to true on login and refresh profile
      let updatedProfile = result.profile;
      if (result.user?.id) {
        updatedProfile = await ProfileModel.updateOnlineStatus(result.user.id, true);
      }

      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTS);
      return successResponse(res, {
        user:        result.user,
        profile:     updatedProfile || result.profile,
        accessToken: result.accessToken,
      }, 'Logged in successfully');
    } catch (err) {
      if (err.status)
        return errorResponse(res, err.message, err.status);
      return errorResponse(res, 'Server error', 500);
    }
  },

  async logout(req, res) {
    const header = req.headers.authorization;
    let userId = null;

    if (header?.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      // Get user ID before logging out (for setting offline status)
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      userId = user?.id;
      // Full delegation to Service — Controller knows nothing about Supabase
      await AuthService.logout(token);
    }

    // Set online status to false
    if (userId) {
      await ProfileModel.updateOnlineStatus(userId, false);
    }

    res.clearCookie('refreshToken');
    return successResponse(res, null, 'Logged out');
  },

  async refresh(req, res) {
    try {
      const token = req.cookies?.refreshToken;
      if (!token)
        return errorResponse(res, 'No token provided', 401);

      // The Service handles Supabase, Controller only receives the result
      const result = await AuthService.refresh(token);
      res.cookie('refreshToken',
        result.refreshToken, COOKIE_OPTS);
      return successResponse(res,
        { accessToken: result.accessToken }, 'Token refreshed');

    } catch (err) {
      return errorResponse(res,
        err.message || 'Invalid token', 401);
    }
  },

  async getMe(req, res) {
    try {
      // Update online status when user fetches their profile
      await ProfileModel.updateOnlineStatus(req.user.userId, true);
      // The Service fetches the profile — Controller knows nothing about ProfileModel
      const result = await AuthService.getMe(req.user.userId);
      return successResponse(res, result);
    } catch {
      return errorResponse(res, 'Server error', 500);
    }
  },

  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;

      // Disallow validated edits from client even if sent
      if (req.body?.validated !== undefined)
        return errorResponse(res, 'validated cannot be updated', 400);

      const updated = await ProfileModel.update(userId, req.body || {});
      return successResponse(res, { profile: updated }, 'Profile updated');
    } catch (err) {
      return errorResponse(res, err.message || 'Update failed', 400);
    }
  },

  async uploadAvatar(req, res) {
    // Delegated to DocumentController for separation of concerns
    return DocumentController.uploadAvatar(req, res);
  },

  async uploadDocument(req, res) {
    // Delegated to DocumentController for separation of concerns
    return DocumentController.uploadDocument(req, res);
  },

  // Check if merchant exists (public endpoint for registration page)
  async checkMerchantExists(req, res) {
    try {
      const { data: merchants, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'merchant')
        .limit(1);

      if (error) throw error;

      const exists = merchants && merchants.length > 0;
      return successResponse(res, { exists, merchantExists: exists }, 'Merchant status checked');
    } catch (err) {
      console.error('[checkMerchantExists]', err);
      return errorResponse(res, err.message || 'Failed to check merchant status', 500);
    }
  },

  // Heartbeat to keep online status fresh (updates timestamp)
  async heartbeat(req, res) {
    try {
      const userId = req.user.userId;
      // Update online status and timestamp
      await ProfileModel.updateOnlineStatus(userId, true);
      return successResponse(res, { online: true }, 'OK');
    } catch (err) {
      console.error('[heartbeat]', err);
      return errorResponse(res, 'Failed to update status', 500);
    }
  },
};

module.exports = AuthController;