const express = require('express');
const router = express.Router();
const MerchantController = require('../controllers/merchantController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Routes for merchants only
router.get('/suppliers/unvalidated', authorize('merchant'), MerchantController.getUnvalidatedSuppliers);
router.post('/suppliers/:supplierId/validate', authorize('merchant'), MerchantController.validateSupplier);
router.get('/suppliers/:supplierId', authorize('merchant'), MerchantController.getSupplierDetails);
router.get('/contacts', authorize('merchant'), MerchantController.getMerchantContacts);
router.post('/suppliers/:supplierId/toggle-block', authorize('merchant'), MerchantController.toggleSupplierBlock);

// Routes for suppliers only
router.get('/my-contacts', authorize('supplier'), MerchantController.getSupplierContacts);

module.exports = router;
