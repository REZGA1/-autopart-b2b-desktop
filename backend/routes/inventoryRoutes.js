const express = require('express');
const router = express.Router();
const InventoryController = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

// All routes require authentication and merchant role
router.use(protect);
router.use(authorize('merchant'));

// Product CRUD routes
router.get('/products', InventoryController.getProducts);
router.get('/products/stats', InventoryController.getInventoryStats);
router.post('/products', InventoryController.createProduct);
router.get('/products/:productId', InventoryController.getProductById);
router.put('/products/:productId', InventoryController.updateProduct);
router.delete('/products/:productId', InventoryController.deleteProduct);

// Product image upload
router.post('/products/:productId/image', upload.single('image'), InventoryController.uploadProductImage);

// Product transactions
router.get('/products/:productId/transactions', InventoryController.getProductTransactions);

// Update transaction reason
router.patch('/transactions/:transactionId/reason', InventoryController.updateTransactionReason);

// Vehicles (public routes for dropdowns)
router.get('/vehicles', InventoryController.getVehicles);
router.get('/vehicles/makes', InventoryController.getVehicleMakes);

// Vehicle CRUD (protected, merchant only)
router.post('/vehicles', InventoryController.createVehicle);
router.put('/vehicles/:vehicleId', InventoryController.updateVehicle);
router.delete('/vehicles/:vehicleId', InventoryController.deleteVehicle);

// Product image proxy (serves images through backend to avoid RLS issues)
router.get('/products/:productId/image', InventoryController.getProductImage);

module.exports = router;
