import api from '@/lib/api';
import { fixImageUrl } from '@/lib/utils';

const BUCKET_NAME = 'supplier_products';

/**
 * Get product image URL (returns proxy URL for backend fallback)
 * @param {string} productId
 * @returns {string} Proxy image URL
 */
export function getSupplierProductImageUrl(productId) {
  // Use proxy endpoint to avoid RLS issues
  return `/api/supplier/catalog/products/${productId}/image`;
}

/**
 * Get all supplier products with optional filters and search
 * @param {Object} params - Query parameters
 * @returns {Promise<{products: Array, pagination: Object}>}
 */
export async function getSupplierProducts(params = {}) {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();
  const url = queryString ? `/supplier/catalog/products?${queryString}` : '/supplier/catalog/products';
  
  const { data } = await api.get(url);
  
  // Fix image URLs for all products
  const products = (data?.data?.products || []).map(product => ({
    ...product,
    image_url: fixImageUrl(product.image_url, BUCKET_NAME)
  }));
  
  return {
    products,
    pagination: data?.data?.pagination || {}
  };
}

/**
 * Get single supplier product by ID
 * @param {string} productId
 * @returns {Promise<Object>}
 */
export async function getSupplierProductById(productId) {
  const { data } = await api.get(`/supplier/catalog/products/${productId}`);
  const product = data?.data?.product;
  if (product) {
    product.image_url = fixImageUrl(product.image_url, BUCKET_NAME);
  }
  return product;
}

/**
 * Create new supplier product
 * @param {Object} productData
 * @returns {Promise<Object>}
 */
export async function createSupplierProduct(productData) {
  const { data } = await api.post('/supplier/catalog/products', productData);
  const product = data?.data?.product;
  if (product) {
    product.image_url = fixImageUrl(product.image_url);
  }
  return product;
}

/**
 * Update existing supplier product
 * @param {string} productId
 * @param {Object} productData
 * @returns {Promise<Object>}
 */
export async function updateSupplierProduct(productId, productData) {
  const { data } = await api.put(`/supplier/catalog/products/${productId}`, productData);
  const product = data?.data?.product;
  if (product) {
    product.image_url = fixImageUrl(product.image_url);
  }
  return product;
}

/**
 * Delete supplier product
 * @param {string} productId
 * @returns {Promise<void>}
 */
export async function deleteSupplierProduct(productId) {
  await api.delete(`/supplier/catalog/products/${productId}`);
}

/**
 * Upload supplier product image
 * @param {string} productId
 * @param {File} imageFile
 * @returns {Promise<Object>}
 */
export async function uploadSupplierProductImage(productId, imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const { data } = await api.post(`/supplier/catalog/products/${productId}/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  const result = data?.data;
  if (result?.image_url) {
    result.image_url = fixImageUrl(result.image_url, BUCKET_NAME);
  }
  if (result?.product?.image_url) {
    result.product.image_url = fixImageUrl(result.product.image_url, BUCKET_NAME);
  }

  return result;
}

/**
 * Get catalog statistics
 * @returns {Promise<Object>}
 */
export async function getCatalogStats() {
  const { data } = await api.get('/supplier/catalog/products/stats');
  return data?.data;
}

/**
 * Get all vehicles (for dropdown)
 * @param {Object} params - Filter params (make, model)
 * @returns {Promise<Array>}
 */
export async function getVehicles(params = {}) {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();
  const url = queryString ? `/supplier/catalog/vehicles?${queryString}` : '/supplier/catalog/vehicles';
  
  const { data } = await api.get(url);
  return data?.data?.vehicles || [];
}

/**
 * Create a new vehicle
 * @param {Object} vehicleData
 * @returns {Promise<Object>}
 */
export async function createVehicle(vehicleData) {
  const { data } = await api.post('/supplier/catalog/vehicles', vehicleData);
  return data?.data;
}

/**
 * Update a vehicle
 * @param {string} vehicleId
 * @param {Object} vehicleData
 * @returns {Promise<Object>}
 */
export async function updateVehicle(vehicleId, vehicleData) {
  const { data } = await api.put(`/supplier/catalog/vehicles/${vehicleId}`, vehicleData);
  return data?.data;
}

/**
 * Delete a vehicle
 * @param {string} vehicleId
 * @returns {Promise<Object>}
 */
export async function deleteVehicle(vehicleId) {
  const { data } = await api.delete(`/supplier/catalog/vehicles/${vehicleId}`);
  return data?.data;
}

/**
 * Get unique vehicle makes (for filter)
 * @returns {Promise<Array>}
 */
export async function getVehicleMakes() {
  const { data } = await api.get('/supplier/catalog/vehicles/makes');
  return data?.data?.makes || [];
}

/**
 * Quick quantity adjustment
 * @param {string} productId
 * @param {number} change - Positive for addition, negative for removal
 * @returns {Promise<Object>}
 */
export async function adjustQuantity(productId, change) {
  // Get current product
  const product = await getSupplierProductById(productId);
  
  // Calculate new quantity
  const newQuantity = product.quantity + change;
  
  if (newQuantity < 0) {
    throw new Error('Cannot reduce quantity below zero');
  }
  
  // Update product with new quantity
  const updatedProduct = await updateSupplierProduct(productId, { 
    quantity: newQuantity 
  });
  
  return updatedProduct;
}

/**
 * Get incoming purchase requests for supplier
 * @param {Object} params - { status, page, limit }
 * @returns {Promise<{requests: Array, pagination: Object}>}
 */
export async function getSupplierPurchaseRequests(params = {}) {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();
  const url = queryString ? `/supplier/catalog/requests?${queryString}` : '/supplier/catalog/requests';
  
  const { data } = await api.get(url);
  
  return {
    requests: data?.data?.requests || [],
    pagination: data?.data?.pagination || {}
  };
}

/**
 * Update purchase request status (accept/reject)
 * @param {string} requestId
 * @param {string} status - 'accepted' or 'rejected'
 * @returns {Promise<Object>}
 */
export async function updateSupplierRequestStatus(requestId, status) {
  const { data } = await api.put(`/supplier/catalog/requests/${requestId}/status`, { status });
  return data?.data?.request;
}
