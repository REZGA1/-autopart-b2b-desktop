import api from '@/lib/api';

// API functions for merchant-supplier interactions

/**
 * Get list of unvalidated suppliers (for merchant verification)
 */
export async function getUnvalidatedSuppliers() {
  const { data } = await api.get('/merchant/suppliers/unvalidated');
  return data?.data?.suppliers || [];
}

/**
 * Validate a supplier (set validated = true)
 * @param {string} supplierId - The supplier's profile ID
 */
export async function validateSupplier(supplierId) {
  const { data } = await api.post(`/merchant/suppliers/${supplierId}/validate`);
  return data?.data?.supplier;
}

/**
 * Get supplier details including documents
 * @param {string} supplierId - The supplier's profile ID
 */
export async function getSupplierDetails(supplierId) {
  const { data } = await api.get(`/merchant/suppliers/${supplierId}`);
  return data?.data?.supplier;
}

/**
 * Get merchant's contact list (validated suppliers)
 */
export async function getMerchantContacts() {
  const { data } = await api.get('/merchant/contacts');
  return data?.data?.contacts || [];
}

/**
 * Get supplier's contact list (merchants who validated them)
 */
export async function getSupplierContacts() {
  const { data } = await api.get('/merchant/my-contacts');
  return data?.data?.contacts || [];
}

/**
 * Toggle supplier block status (merchant blocks/unblocks a supplier)
 * @param {string} supplierId - The supplier's profile ID
 * @param {boolean} isActive - true to unblock, false to block
 */
export async function toggleSupplierBlock(supplierId, isActive) {
  const { data } = await api.post(`/merchant/suppliers/${supplierId}/toggle-block`, { isActive });
  return data?.data;
}
