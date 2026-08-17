const express = require('express');
const router = express.Router();
const AuthController =
  require('../controllers/authController');
const { protect } =
  require('../middleware/authMiddleware');
const { validateRegister, validateLogin, validateProfileUpdate } =
  require('../validators/authValidator');
const { upload } = require('../middleware/uploadMiddleware');

// ─── Public routes ───

// Check if merchant exists (for registration page)
router.get('/merchant-exists', AuthController.checkMerchantExists);

router.post('/register',
  validateRegister,
  AuthController.register
);

router.post('/login',
  validateLogin,
  AuthController.login
);

router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refresh);

// ─── Protected routes ───

router.get('/me',
  protect,
  AuthController.getMe
);

router.put('/profile',
  protect,
  validateProfileUpdate,
  AuthController.updateProfile
);

router.post('/upload-avatar',
  protect,
  upload.single('avatar'),
  AuthController.uploadAvatar
);

router.post('/upload-document',
  protect,
  upload.single('document'),
  AuthController.uploadDocument
);

// Heartbeat to keep online status updated
router.post('/heartbeat', protect, AuthController.heartbeat);

module.exports = router;