import api from '@/lib/api';
import { fixImageUrl } from '@/lib/utils';

const BUCKET_NAME = 'Merchant_Products';

/**
 * Get all products with optional filters and search
 * @param {Object} params - Query parameters
 * @returns {Promise<{products: Array, pagination: Object}>}
 */
export async function getProducts(params = {}) {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();
  const url = queryString ? `/inventory/products?${queryString}` : '/inventory/products';
  
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
 * Get single product by ID
 * @param {string} productId
 * @returns {Promise<Object>}
 */
export async function getProductById(productId) {
  const { data } = await api.get(`/inventory/products/${productId}`);
  const product = data?.data?.product;
  if (product) {
    product.image_url = fixImageUrl(product.image_url, BUCKET_NAME);
  }
  return product;
}

/**
 * Create new product
 * @param {Object} productData
 * @returns {Promise<Object>}
 */
export async function createProduct(productData) {
  const { data } = await api.post('/inventory/products', productData);
  const product = data?.data?.product;
  if (product) {
    product.image_url = fixImageUrl(product.image_url, BUCKET_NAME);
  }
  return product;
}

/**
 * Update existing product
 * @param {string} productId
 * @param {Object} productData
 * @returns {Promise<Object>}
 */
export async function updateProduct(productId, productData) {
  const { data } = await api.put(`/inventory/products/${productId}`, productData);
  const product = data?.data?.product;
  if (product) {
    product.image_url = fixImageUrl(product.image_url, BUCKET_NAME);
  }
  return product;
}

/**
 * Delete product
 * @param {string} productId
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
  await api.delete(`/inventory/products/${productId}`);
}

/**
 * Get product image URL (returns proxy URL for backend fallback)
 * @param {string} productId
 * @returns {string} Proxy image URL
 */
export function getProductImageUrl(productId) {
  // Use proxy endpoint to avoid RLS issues
  return `/api/inventory/products/${productId}/image`;
}

/**
 * Upload product image
 * @param {string} productId
 * @param {File} imageFile
 * @returns {Promise<Object>}
 */
export async function uploadProductImage(productId, imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const { data } = await api.post(`/inventory/products/${productId}/image`, formData, {
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
 * Get inventory transactions for a product
 * @param {string} productId
 * @param {Object} params - Pagination params
 * @returns {Promise<{transactions: Array, pagination: Object}>}
 */
export async function getProductTransactions(productId, params = {}) {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();
  const url = queryString 
    ? `/inventory/products/${productId}/transactions?${queryString}` 
    : `/inventory/products/${productId}/transactions`;
  
  const { data } = await api.get(url);
  return {
    transactions: data?.data?.transactions || [],
    pagination: data?.data?.pagination || {}
  };
}

/**
 * Update transaction reason
 * @param {string} transactionId
 * @param {string} reason - 'buying' or 'sale'
 * @returns {Promise<Object>}
 */
export async function updateTransactionReason(transactionId, reason) {
  const { data } = await api.patch(`/inventory/transactions/${transactionId}/reason`, { reason });
  return data?.data;
}

/**
 * Get inventory statistics
 * @returns {Promise<Object>}
 */
export async function getInventoryStats() {
  const { data } = await api.get('/inventory/products/stats');
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
  const url = queryString ? `/inventory/vehicles?${queryString}` : '/inventory/vehicles';
  
  const { data } = await api.get(url);
  return data?.data?.vehicles || [];
}

/**
 * Create a new vehicle
 * @param {Object} vehicleData
 * @returns {Promise<Object>}
 */
export async function createVehicle(vehicleData) {
  const { data } = await api.post('/inventory/vehicles', vehicleData);
  return data?.data;
}

/**
 * Update a vehicle
 * @param {string} vehicleId
 * @param {Object} vehicleData
 * @returns {Promise<Object>}
 */
export async function updateVehicle(vehicleId, vehicleData) {
  const { data } = await api.put(`/inventory/vehicles/${vehicleId}`, vehicleData);
  return data?.data;
}

/**
 * Delete a vehicle
 * @param {string} vehicleId
 * @returns {Promise<Object>}
 */
export async function deleteVehicle(vehicleId) {
  const { data } = await api.delete(`/inventory/vehicles/${vehicleId}`);
  return data?.data;
}

/**
 * Get unique vehicle makes (for filter)
 * @returns {Promise<Array>}
 */
export async function getVehicleMakes() {
  const { data } = await api.get('/inventory/vehicles/makes');
  return data?.data?.makes || [];
}

/**
 * Quick inventory adjustment (add/remove stock)
 * @param {string} productId
 * @param {number} change - Positive for addition, negative for removal
 * @param {string} reason - Reason for the change
 * @returns {Promise<Object>}
 */
export async function adjustInventory(productId, change, reason) {
  // Get current product
  const product = await getProductById(productId);
  
  // Calculate new quantity
  const newQuantity = product.quantity + change;
  
  if (newQuantity < 0) {
    throw new Error('Cannot reduce stock below zero');
  }
  
  // Update product with new quantity
  // The backend will automatically create a transaction
  const updatedProduct = await updateProduct(productId, { 
    quantity: newQuantity 
  });
  
  return updatedProduct;
}
