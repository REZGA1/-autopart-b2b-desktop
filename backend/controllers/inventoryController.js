const { successResponse, errorResponse } = require('../utils/response');
const InventoryService = require('../services/inventoryService');

const InventoryController = {
  async getProducts(req, res) {
    try {
      const result = await InventoryService.getProducts(req.user.userId, req.query);
      return successResponse(res, result, 'Products retrieved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch products', err.status || 500);
    }
  },

  async getProductById(req, res) {
    try {
      const product = await InventoryService.getProductById(req.params.productId, req.user.userId);
      return successResponse(res, { product }, 'Product retrieved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch product', err.status || 500);
    }
  },

  async createProduct(req, res) {
    try {
      const product = await InventoryService.createProduct(req.user.userId, req.body);
      return successResponse(res, { product }, 'Product created successfully', 201);
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to create product', err.status || 500);
    }
  },

  async updateProduct(req, res) {
    try {
      const product = await InventoryService.updateProduct(req.params.productId, req.user.userId, req.body);
      return successResponse(res, { product }, 'Product updated successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to update product', err.status || 500);
    }
  },

  async deleteProduct(req, res) {
    try {
      await InventoryService.deleteProduct(req.params.productId, req.user.userId);
      return successResponse(res, null, 'Product deleted successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to delete product', err.status || 500);
    }
  },

  async uploadProductImage(req, res) {
    try {
      const { product, image_url } = await InventoryService.uploadProductImage(
        req.params.productId,
        req.user.userId,
        req.file
      );
      return successResponse(res, { product, image_url }, 'Product image uploaded successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to upload image', err.status || 500);
    }
  },

  async getProductTransactions(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await InventoryService.getProductTransactions(
        req.params.productId,
        req.user.userId,
        { page, limit }
      );
      return successResponse(res, result, 'Transactions retrieved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch transactions', err.status || 500);
    }
  },

  async updateTransactionReason(req, res) {
    try {
      const transaction = await InventoryService.updateTransactionReason(
        req.params.transactionId,
        req.user.userId,
        req.body.reason
      );
      return successResponse(res, { transaction }, 'Transaction reason updated successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to update transaction reason', err.status || 500);
    }
  },

  async getInventoryStats(req, res) {
    try {
      const stats = await InventoryService.getInventoryStats(req.user.userId);
      return successResponse(res, stats, 'Inventory statistics retrieved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch statistics', err.status || 500);
    }
  },

  async getVehicles(req, res) {
    try {
      const vehicles = await InventoryService.getVehicles();
      return successResponse(res, { vehicles }, 'Vehicles retrieved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch vehicles', err.status || 500);
    }
  },

  async getVehicleMakes(req, res) {
    try {
      const makes = await InventoryService.getVehicleMakes();
      return successResponse(res, makes, 'Vehicle makes retrieved');
    } catch (err) {
      return errorResponse(res, err.message, err.status || 500);
    }
  },

  async createVehicle(req, res) {
    try {
      const vehicle = await InventoryService.createVehicle(req.body);
      return successResponse(res, { vehicle }, 'Vehicle saved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to save vehicle', err.status || 500);
    }
  },

  async updateVehicle(req, res) {
    try {
      const vehicle = await InventoryService.updateVehicle(req.params.vehicleId, req.body);
      return successResponse(res, { vehicle }, 'Vehicle updated successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to update vehicle', err.status || 500);
    }
  },

  async deleteVehicle(req, res) {
    try {
      await InventoryService.deleteVehicle(req.params.vehicleId);
      return successResponse(res, null, 'Vehicle deleted successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to delete vehicle', err.status || 500);
    }
  },

  async getProductImage(req, res) {
    try {
      const { buffer, contentType } = await InventoryService.getProductImageBuffer(
        req.params.productId,
        req.user.userId
      );
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch image', err.status || 500);
    }
  }
};

module.exports = InventoryController;
