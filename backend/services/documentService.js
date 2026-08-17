const { supabaseAdmin } = require('../config/supabase');
const ProfileModel = require('../repositories/userRepository');
const documentConfig = require('../config/document.config');

/**
 * DocumentService - Handles all document-related operations
 * Separated from AuthService for better organization
 */
const DocumentService = {
  /**
   * Upload a profile document (RC or ID card)
   * @param {string} userId - User ID
   * @param {Object} file - Uploaded file object
   * @param {string} docType - Document type ('rc' or 'id_card')
   * @returns {Object} Upload result with URL and filename
   * @throws {Error} If upload fails or reupload is not allowed
   */
  async uploadProfileDocument(userId, file, docType) {
    // Validate document type
    if (!Object.values(documentConfig.documentTypes).includes(docType)) {
      const error = new Error('Invalid document type');
      error.status = 400;
      throw error;
    }

    // Validate file
    this._validateFile(file);

    const profile = await ProfileModel.findByUserId(userId);
    if (!profile) {
      const error = new Error('Profile not found');
      error.status = 404;
      throw error;
    }

    // Check if document already exists and reupload is not allowed
    const fieldName = docType === documentConfig.documentTypes.RC
      ? 'rc_image_url'
      : 'id_card_url';

    const existingUrl = profile[fieldName];

    if (existingUrl && !documentConfig.allowReupload) {
      const docName = docType === documentConfig.documentTypes.RC ? 'RC' : 'ID card';
      const error = new Error(`${docName} document already uploaded`);
      error.status = 409;
      throw error;
    }

    // Upload to storage
    const result = await ProfileModel.uploadProfileDocument(
      userId,
      file,
      docType,
      { allowReupload: documentConfig.allowReupload }
    );

    return result;
  },

  /**
   * Upload user avatar
   * @param {string} userId - User ID
   * @param {Object} file - Uploaded file object
   * @returns {Object} Upload result with URL and filename
   */
  async uploadAvatar(userId, file) {
    this._validateFile(file);
    return await ProfileModel.uploadAvatar(userId, file);
  },

  /**
   * Get current document configuration for client
   * @returns {Object} Config values needed by frontend
   */
  getClientConfig() {
    return {
      allowDocumentReupload: documentConfig.allowReupload,
      maxFileSize: documentConfig.maxFileSize,
      allowedMimeTypes: documentConfig.allowedMimeTypes,
    };
  },

  /**
   * Validate file size and type
   * @private
   */
  _validateFile(file) {
    if (!file) {
      const error = new Error('No file provided');
      error.status = 400;
      throw error;
    }

    if (file.size > documentConfig.maxFileSize) {
      const error = new Error(`File size exceeds ${documentConfig.maxFileSize / 1024 / 1024}MB limit`);
      error.status = 400;
      throw error;
    }

    if (!documentConfig.allowedMimeTypes.includes(file.mimetype)) {
      const error = new Error('Invalid file type. Allowed: JPEG, PNG, WebP, PDF');
      error.status = 400;
      throw error;
    }
  },
};

module.exports = DocumentService;
