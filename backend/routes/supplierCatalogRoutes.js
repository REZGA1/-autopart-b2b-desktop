const express = require('express');
const router = express.Router();
const SupplierCatalogController = require('../controllers/supplierCatalogController');
const StoreController = require('../controllers/storeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

// Product image proxy (PUBLIC - serves images without auth to work with <img> tags)
router.get('/products/:productId/image', (req, res) => SupplierCatalogController.getProductImage(req, res));

// Vehicles (public routes for dropdowns)
router.get('/vehicles', (req, res) => SupplierCatalogController.getVehicles(req, res));
router.get('/vehicles/makes', (req, res) => SupplierCatalogController.getVehicleMakes(req, res));

// All other routes require authentication and supplier role
router.use(protect);
router.use(authorize('supplier'));

// Product CRUD routes
router.get('/products', (req, res) => SupplierCatalogController.getProducts(req, res));
router.get('/products/stats', (req, res) => SupplierCatalogController.getCatalogStats(req, res));
router.post('/products', (req, res) => SupplierCatalogController.createProduct(req, res));
router.get('/products/:productId', (req, res) => SupplierCatalogController.getProductById(req, res));
router.put('/products/:productId', (req, res) => SupplierCatalogController.updateProduct(req, res));
router.delete('/products/:productId', (req, res) => SupplierCatalogController.deleteProduct(req, res));

// Product image upload
router.post('/products/:productId/image', upload.single('image'), (req, res) => SupplierCatalogController.uploadProductImage(req, res));

// Vehicle CRUD (protected, supplier only)
router.post('/vehicles', (req, res) => SupplierCatalogController.createVehicle(req, res));
router.put('/vehicles/:vehicleId', (req, res) => SupplierCatalogController.updateVehicle(req, res));
router.delete('/vehicles/:vehicleId', (req, res) => SupplierCatalogController.deleteVehicle(req, res));

// Purchase Requests (supplier view - incoming requests from merchants)
router.get('/requests', (req, res) => StoreController.getSupplierPurchaseRequests(req, res));
router.put('/requests/:requestId/status', (req, res) => StoreController.updatePurchaseRequestStatus(req, res));

module.exports = router;
