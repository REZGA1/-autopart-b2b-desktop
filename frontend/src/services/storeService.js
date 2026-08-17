import api from '@/api/apiClient';

function fixImageUrl(imageUrl) {
  if (!imageUrl) return null;
  try {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(p => p === 'supplier_products');
    if (bucketIndex === -1) return imageUrl;
    const fileName = pathParts[pathParts.length - 1];
    const cleanPath = pathParts.slice(0, bucketIndex + 1).join('/');
    url.pathname = `${cleanPath}/${fileName}`;
    return url.toString();
  } catch {
    return imageUrl;
  }
}

export function getStoreProductImageUrl(productId) {
  return `${api.defaults.baseURL}/store/products/${productId}/image`;
}

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
  const products = (data?.data?.products || []).map(product => ({
    ...product,
    image_url: fixImageUrl(product.image_url)
  }));
  
  return {
    products,
    pagination: data?.data?.pagination || {}
  };
}

export async function getStoreProductById(productId) {
  const { data } = await api.get(`/store/products/${productId}`);
  const product = data?.data?.product;
  if (product) {
    product.image_url = fixImageUrl(product.image_url);
  }
  return product;
}

export async function getStoreSuppliers() {
  const { data } = await api.get('/store/suppliers');
  return data?.data?.suppliers || [];
}

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

export async function createPurchaseRequest(requestData) {
  const { data } = await api.post('/store/requests', requestData);
  return data?.data?.request;
}

export async function updatePurchaseRequestStatus(requestId, status) {
  const { data } = await api.put(`/store/requests/${requestId}/status`, { status });
  return data?.data?.request;
}

export async function fulfillPurchaseRequest(requestId) {
  const { data } = await api.post(`/store/requests/${requestId}/fulfill`);
  return data?.data;
}

export async function deletePurchaseRequest(requestId) {
  await api.delete(`/store/requests/${requestId}`);
}
