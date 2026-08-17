const AuthService = require('../services/authService');
const DocumentController = require('./documentController');
const { successResponse, errorResponse } = require('../utils/response');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const AuthController = {
  async register(req, res) {
    try {
      const result = await AuthService.register(req.body);

      if (!result.accessToken) {
        return successResponse(res, {
          user: result.user,
          message: result.message,
          requiresEmailConfirmation: true,
        }, result.message, 201);
      }

      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTS);
      return successResponse(res, {
        user: result.user,
        profile: result.profile,
        accessToken: result.accessToken,
      }, 'Account created successfully', 201);
    } catch (err) {
      if (err.status) return errorResponse(res, err.message, err.status);
      return errorResponse(res, err.message || 'Server error', 500);
    }
  },

  async login(req, res) {
    try {
      const result = await AuthService.login(req.body);

      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTS);
      return successResponse(res, {
        user: result.user,
        profile: result.profile,
        accessToken: result.accessToken,
      }, 'Logged in successfully');
    } catch (err) {
      if (err.status) return errorResponse(res, err.message, err.status);
      return errorResponse(res, 'Server error', 500);
    }
  },

  async logout(req, res) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      await AuthService.logout(token);
    }

    res.clearCookie('refreshToken');
    return successResponse(res, null, 'Logged out');
  },

  async refresh(req, res) {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) return errorResponse(res, 'No token provided', 401);

      const result = await AuthService.refresh(token);
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTS);
      return successResponse(res, { accessToken: result.accessToken }, 'Token refreshed');
    } catch (err) {
      return errorResponse(res, err.message || 'Invalid token', 401);
    }
  },

  async getMe(req, res) {
    try {
      const result = await AuthService.getMe(req.user.userId);
      return successResponse(res, result);
    } catch {
      return errorResponse(res, 'Server error', 500);
    }
  },

  async updateProfile(req, res) {
    try {
      const result = await AuthService.updateProfile(req.user.userId, req.body || {});
      return successResponse(res, result, 'Profile updated');
    } catch (err) {
      return errorResponse(res, err.message || 'Update failed', err.status || 400);
    }
  },

  async uploadAvatar(req, res) {
    return DocumentController.uploadAvatar(req, res);
  },

  async uploadDocument(req, res) {
    return DocumentController.uploadDocument(req, res);
  },

  async checkMerchantExists(req, res) {
    try {
      const exists = await AuthService.checkMerchantExists();
      return successResponse(res, { exists, merchantExists: exists }, 'Merchant status checked');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to check merchant status', 500);
    }
  },

  async heartbeat(req, res) {
    try {
      await AuthService.heartbeat(req.user.userId);
      return successResponse(res, { online: true }, 'OK');
    } catch {
      return errorResponse(res, 'Failed to update status', 500);
    }
  },
};

module.exports = AuthController;