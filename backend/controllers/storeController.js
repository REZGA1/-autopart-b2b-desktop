const { successResponse, errorResponse } = require('../utils/response');
const StoreService = require('../services/storeService');

const StoreController = {
  async getSupplierProducts(req, res) {
    try {
      const result = await StoreService.getSupplierProducts(req.user.userId, req.query);
      return successResponse(res, result, 'Products retrieved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch products', err.status || 500);
    }
  },

  async getSupplierProductById(req, res) {
    try {
      const product = await StoreService.getSupplierProductById(req.params.productId, req.user.userId);
      return successResponse(res, { product }, 'Product retrieved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch product', err.status || 500);
    }
  },

  async getPurchaseRequests(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const result = await StoreService.getPurchaseRequests(req.user.userId, { status, page, limit });
      return successResponse(res, result, 'Purchase requests retrieved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch requests', err.status || 500);
    }
  },

  async createPurchaseRequest(req, res) {
    try {
      const request = await StoreService.createPurchaseRequest(req.user.userId, req.body);
      return successResponse(res, { request }, 'Purchase request created successfully', 201);
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to create request', err.status || 500);
    }
  },

  async updatePurchaseRequestStatus(req, res) {
    try {
      const updated = await StoreService.updatePurchaseRequestStatus(
        req.params.requestId,
        req.body.status,
        req.user.userId,
        req.user.role
      );
      return successResponse(res, { request: updated }, 'Status updated successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to update status', err.status || 500);
    }
  },

  async fulfillRequest(req, res) {
    try {
      const result = await StoreService.fulfillRequest(req.params.requestId, req.user.userId);
      return successResponse(res, result, 'Request fulfilled and inventory updated');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fulfill request', err.status || 500);
    }
  },

  async deletePurchaseRequest(req, res) {
    try {
      await StoreService.deletePurchaseRequest(req.params.requestId, req.user.userId);
      return successResponse(res, null, 'Purchase request deleted successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to delete request', err.status || 500);
    }
  },

  async getSuppliers(req, res) {
    try {
      const suppliers = await StoreService.getSuppliers(req.user.userId);
      return successResponse(res, { suppliers }, 'Suppliers retrieved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch suppliers', err.status || 500);
    }
  },

  async getSupplierPurchaseRequests(req, res) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const result = await StoreService.getSupplierPurchaseRequests(
        req.user.userId,
        req.user.role,
        { status, page, limit }
      );
      return successResponse(res, result, 'Supplier requests retrieved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch requests', err.status || 500);
    }
  },

  async getProductImage(req, res) {
    try {
      const { buffer, contentType } = await StoreService.getProductImageBuffer(req.params.productId);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch image', err.status || 500);
    }
  }
};

module.exports = StoreController;
