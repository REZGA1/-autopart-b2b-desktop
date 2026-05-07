import api from '@/lib/api';

// Helper to fix image URLs
function fixImageUrl(imageUrl) {
  if (!imageUrl) return null;
  
  try {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(p => p === 'supplier_products');
    
    if (bucketIndex === -1) {
      return imageUrl;
    }
    
    const fileName = pathParts[pathParts.length - 1];
    const cleanPath = pathParts.slice(0, bucketIndex + 1).join('/');
    url.pathname = `${cleanPath}/${fileName}`;
    
    return url.toString();
  } catch (e) {
    console.error('[fixImageUrl] Error:', e.message);
    return imageUrl;
  }
}

/**
 * Get product image URL
 * @param {string} productId
 * @returns {string} Proxy image URL
 */
export function getStoreProductImageUrl(productId) {
  return `/api/store/products/${productId}/image`;
}

/**
 * Get all supplier products (merchant store view)
 * @param {Object} params - Query parameters
 * @returns {Promise<{products: Array, pagination: Object}>}
 */
export async function getStoreProducts(params = {}) {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();
  const url = queryString ? `/store/products?${queryString}` : '/store/products';
  
  const { data } = await api.get(url);
  
  // Fix image URLs for all products
  const products = (data?.data?.products || []).map(product => ({
    ...product,
    image_url: fixImageUrl(product.image_url)
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
export async function getStoreProductById(productId) {
  const { data } = await api.get(`/store/products/${productId}`);
  const product = data?.data?.product;
  if (product) {
    product.image_url = fixImageUrl(product.image_url);
  }
  return product;
}

/**
 * Get validated suppliers list
 * @returns {Promise<Array>}
 */
export async function getStoreSuppliers() {
  const { data } = await api.get('/store/suppliers');
  return data?.data?.suppliers || [];
}

/**
 * Get merchant's purchase requests
 * @param {Object} params - { status, page, limit }
 * @returns {Promise<{requests: Array, pagination: Object}>}
 */
export async function getPurchaseRequests(params = {}) {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();
  const url = queryString ? `/store/requests?${queryString}` : '/store/requests';
  
  const { data } = await api.get(url);
  
  return {
    requests: data?.data?.requests || [],
    pagination: data?.data?.pagination || {}
  };
}

/**
 * Create new purchase request
 * @param {Object} requestData - { supplier_id, items: [{ supplier_product_id, quantity, unit_price }] }
 * @returns {Promise<Object>}
 */
export async function createPurchaseRequest(requestData) {
  const { data } = await api.post('/store/requests', requestData);
  return data?.data?.request;
}

/**
 * Update purchase request status
 * @param {string} requestId
 * @param {string} status
 * @returns {Promise<Object>}
 */
export async function updatePurchaseRequestStatus(requestId, status) {
  const { data } = await api.put(`/store/requests/${requestId}/status`, { status });
  return data?.data?.request;
}

/**
 * Fulfill purchase request and add to inventory
 * @param {string} requestId
 * @returns {Promise<Object>}
 */
export async function fulfillPurchaseRequest(requestId) {
  const { data } = await api.post(`/store/requests/${requestId}/fulfill`);
  return data?.data;
}

/**
 * Delete purchase request (only pending or rejected)
 * @param {string} requestId
 * @returns {Promise<void>}
 */
export async function deletePurchaseRequest(requestId) {
  await api.delete(`/store/requests/${requestId}`);
}
