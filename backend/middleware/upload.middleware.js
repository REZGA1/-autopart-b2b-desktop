const multer = require('multer');
const path = require('path');

// تخزين مؤقت قبل الرفع إلى Supabase
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed     = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedDocs = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  // ✅ استخدم fieldname بدل req.path
  if (file.fieldname === 'avatar' && allowed.includes(file.mimetype)) {
    cb(null, true);
  }
  else if (file.fieldname === 'document' && allowedDocs.includes(file.mimetype)) {
    cb(null, true);
  }
  else if (file.fieldname === 'image' && allowed.includes(file.mimetype)) {
    // Product images for inventory
    cb(null, true);
  }
  else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = { upload };
