// Document-related configuration
// Centralizes all settings for document uploads and validation

const documentConfig = {
  /**
   * When false, RC and ID card uploads are rejected if a file already exists.
   * Set to 'true' in .env to allow merchants to replace uploaded documents.
   */
  allowReupload: process.env.ALLOW_DOCUMENT_REUPLOAD === 'true',

  /** Maximum file size in bytes (5MB) */
  maxFileSize: 5 * 1024 * 1024,

  /** Allowed MIME types for documents */
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ],

  /** Document types supported for upload */
  documentTypes: {
    RC: 'rc',
    ID_CARD: 'id_card',
  },

  /** Bucket name in Supabase storage */
  storageBucket: 'documents',

  /** Folder paths in storage */
  folders: {
    rc: 'rc-documents',
    id_card: 'id-cards',
    avatars: 'avatars',
  },
};

module.exports = documentConfig;
