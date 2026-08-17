const express = require('express');
const router = express.Router();
const StoreController = require('../controllers/storeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Product image proxy (public route for <img> tags)
router.get('/products/:productId/image', (req, res) => StoreController.getProductImage(req, res));

// All routes require authentication and merchant role
router.use(protect);
router.use(authorize('merchant'));

// Supplier products (merchant store browsing)
router.get('/products', (req, res) => StoreController.getSupplierProducts(req, res));
router.get('/products/:productId', (req, res) => StoreController.getSupplierProductById(req, res));

// Validated suppliers list
router.get('/suppliers', (req, res) => StoreController.getSuppliers(req, res));

// Purchase requests
router.get('/requests', (req, res) => StoreController.getPurchaseRequests(req, res));
router.post('/requests', (req, res) => StoreController.createPurchaseRequest(req, res));
router.put('/requests/:requestId/status', (req, res) => StoreController.updatePurchaseRequestStatus(req, res));
router.post('/requests/:requestId/fulfill', (req, res) => StoreController.fulfillRequest(req, res));
router.delete('/requests/:requestId', (req, res) => StoreController.deletePurchaseRequest(req, res));

module.exports = router;
