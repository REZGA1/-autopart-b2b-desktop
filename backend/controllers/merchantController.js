const { successResponse, errorResponse } = require('../utils/response');
const MerchantService = require('../services/merchantService');

const MerchantController = {
  async getUnvalidatedSuppliers(req, res) {
    try {
      const suppliers = await MerchantService.getUnvalidatedSuppliers();
      return successResponse(res, { suppliers }, 'Unvalidated suppliers retrieved');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch suppliers', err.status || 500);
    }
  },

  async validateSupplier(req, res) {
    try {
      const supplier = await MerchantService.validateSupplier(req.params.supplierId, req.user.userId);
      return successResponse(res, { supplier }, 'Supplier validated successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to validate supplier', err.status || 500);
    }
  },

  async getMerchantContacts(req, res) {
    try {
      const contacts = await MerchantService.getMerchantContacts();
      return successResponse(res, { contacts }, 'Contacts retrieved');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch contacts', err.status || 500);
    }
  },

  async getSupplierContacts(req, res) {
    try {
      const result = await MerchantService.getSupplierContacts(req.user.userId);
      return successResponse(res, result, 'Merchant contacts retrieved');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch contacts', err.status || 500);
    }
  },

  async getSupplierDetails(req, res) {
    try {
      const supplier = await MerchantService.getSupplierDetails(req.params.supplierId);
      return successResponse(res, { supplier }, 'Supplier details retrieved');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch supplier details', err.status || 500);
    }
  },

  async toggleSupplierBlock(req, res) {
    try {
      const result = await MerchantService.toggleSupplierBlock(req.params.supplierId, req.body.isActive);
      return successResponse(res, result, `Supplier ${result.action} successfully`);
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to toggle supplier block status', err.status || 500);
    }
  }
};

module.exports = MerchantController;
