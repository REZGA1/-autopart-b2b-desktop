const DocumentService = require('../services/documentService');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * DocumentController - Handles document upload endpoints
 * Separated from AuthController for better organization
 */
const DocumentController = {

  /**
   * Upload RC or ID card document
   * POST /auth/upload-document
   */
  async uploadDocument(req, res) {
    try {
      if (!req.file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      const { docType } = req.body;
      if (!['rc', 'id_card'].includes(docType)) {
        return errorResponse(res, 'Invalid document type', 400);
      }

      const result = await DocumentService.uploadProfileDocument(
        req.user.userId,
        req.file,
        docType
      );

      return successResponse(res, result, 'Document uploaded successfully', 201);
    } catch (err) {
      const status = err.status && Number.isInteger(err.status) ? err.status : 500;
      return errorResponse(res, err.message || 'Upload failed', status);
    }
  },

  /**
   * Upload avatar image
   * POST /auth/upload-avatar
   */
  async uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      const result = await DocumentService.uploadAvatar(
        req.user.userId,
        req.file
      );

      return successResponse(res, result, 'Avatar uploaded successfully', 201);
    } catch (err) {
      const status = err.status && Number.isInteger(err.status) ? err.status : 500;
      return errorResponse(res, err.message || 'Upload failed', status);
    }
  },

  /**
   * Get document configuration for client
   * GET /auth/document-config
   */
  async getConfig(req, res) {
    try {
      const config = DocumentService.getClientConfig();
      return successResponse(res, config, 'Configuration retrieved');
    } catch (err) {
      return errorResponse(res, 'Failed to get configuration', 500);
    }
  },
};

module.exports = DocumentController;
