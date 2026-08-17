const documentConfig = {
  allowReupload: process.env.ALLOW_DOCUMENT_REUPLOAD === 'true',
  maxFileSize: 5 * 1024 * 1024,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ],
  documentTypes: {
    RC: 'rc',
    ID_CARD: 'id_card',
  },
  storageBucket: 'documents',
  folders: {
    rc: 'rc-documents',
    id_card: 'id-cards',
    avatars: 'avatars',
  },
};

module.exports = documentConfig;
