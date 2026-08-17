const { successResponse, errorResponse } = require('../utils/response');
const SupplierCatalogService = require('../services/supplierCatalogService');

const SupplierCatalogController = {
  async getProducts(req, res) {
    try {
      const result = await SupplierCatalogService.getProducts(req.user.userId, req.query);
      return successResponse(res, result, 'Products retrieved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch products', err.status || 500);
    }
  },

  async getProductById(req, res) {
    try {
      const product = await SupplierCatalogService.getProductById(req.params.productId, req.user.userId);
      return successResponse(res, { product }, 'Product retrieved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch product', err.status || 500);
    }
  },

  async createProduct(req, res) {
    try {
      const product = await SupplierCatalogService.createProduct(req.user.userId, req.body);
      return successResponse(res, { product }, 'Product created successfully', 201);
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to create product', err.status || 500);
    }
  },

  async updateProduct(req, res) {
    try {
      const product = await SupplierCatalogService.updateProduct(
        req.params.productId,
        req.user.userId,
        req.body
      );
      return successResponse(res, { product }, 'Product updated successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to update product', err.status || 500);
    }
  },

  async deleteProduct(req, res) {
    try {
      await SupplierCatalogService.deleteProduct(req.params.productId, req.user.userId);
      return successResponse(res, null, 'Product deleted successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to delete product', err.status || 500);
    }
  },

  async uploadProductImage(req, res) {
    try {
      const { product, image_url } = await SupplierCatalogService.uploadProductImage(
        req.params.productId,
        req.user.userId,
        req.file
      );
      return successResponse(res, { product, image_url }, 'Product image uploaded successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to upload image', err.status || 500);
    }
  },

  async getCatalogStats(req, res) {
    try {
      const stats = await SupplierCatalogService.getCatalogStats(req.user.userId);
      return successResponse(res, stats, 'Catalog statistics retrieved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch statistics', err.status || 500);
    }
  },

  async getVehicles(req, res) {
    try {
      const vehicles = await SupplierCatalogService.getVehicles();
      return successResponse(res, { vehicles }, 'Vehicles retrieved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch vehicles', err.status || 500);
    }
  },

  async getVehicleMakes(req, res) {
    try {
      const makes = await SupplierCatalogService.getVehicleMakes();
      return successResponse(res, { makes }, 'Vehicle makes retrieved');
    } catch (err) {
      return errorResponse(res, err.message, err.status || 500);
    }
  },

  async createVehicle(req, res) {
    try {
      const vehicle = await SupplierCatalogService.createVehicle(req.body);
      return successResponse(res, { vehicle }, 'Vehicle saved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to save vehicle', err.status || 500);
    }
  },

  async updateVehicle(req, res) {
    try {
      const vehicle = await SupplierCatalogService.updateVehicle(req.params.vehicleId, req.body);
      return successResponse(res, { vehicle }, 'Vehicle updated successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to update vehicle', err.status || 500);
    }
  },

  async deleteVehicle(req, res) {
    try {
      await SupplierCatalogService.deleteVehicle(req.params.vehicleId);
      return successResponse(res, null, 'Vehicle deleted successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to delete vehicle', err.status || 500);
    }
  },

  async getProductImage(req, res) {
    try {
      const { buffer, contentType } = await SupplierCatalogService.getProductImageBuffer(req.params.productId);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch image', err.status || 500);
    }
  }
};

module.exports = SupplierCatalogController;
