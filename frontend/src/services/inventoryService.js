import api from '@/api/apiClient';
import { fixImageUrl } from '@/lib/utils';

const BUCKET_NAME = 'Merchant_Products';

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
  const products = (data?.data?.products || []).map(product => ({
    ...product,
    image_url: fixImageUrl(product.image_url, BUCKET_NAME)
  }));
  
  return {
    products,
    pagination: data?.data?.pagination || {}
  };
}

export async function getProductById(productId) {
  const { data } = await api.get(`/inventory/products/${productId}`);
  const product = data?.data?.product;
  if (product) {
    product.image_url = fixImageUrl(product.image_url, BUCKET_NAME);
  }
  return product;
}

export async function createProduct(productData) {
  const { data } = await api.post('/inventory/products', productData);
  const product = data?.data?.product;
  if (product) {
    product.image_url = fixImageUrl(product.image_url, BUCKET_NAME);
  }
  return product;
}

export async function updateProduct(productId, productData) {
  const { data } = await api.put(`/inventory/products/${productId}`, productData);
  const product = data?.data?.product;
  if (product) {
    product.image_url = fixImageUrl(product.image_url, BUCKET_NAME);
  }
  return product;
}

export async function deleteProduct(productId) {
  await api.delete(`/inventory/products/${productId}`);
}

export function getProductImageUrl(productId) {
  return `${api.defaults.baseURL}/inventory/products/${productId}/image`;
}

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

export async function updateTransactionReason(transactionId, reason) {
  const { data } = await api.patch(`/inventory/transactions/${transactionId}/reason`, { reason });
  return data?.data;
}

export async function getInventoryStats() {
  const { data } = await api.get('/inventory/products/stats');
  return data?.data;
}

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

export async function createVehicle(vehicleData) {
  const { data } = await api.post('/inventory/vehicles', vehicleData);
  return data?.data;
}

export async function updateVehicle(vehicleId, vehicleData) {
  const { data } = await api.put(`/inventory/vehicles/${vehicleId}`, vehicleData);
  return data?.data;
}

export async function deleteVehicle(vehicleId) {
  const { data } = await api.delete(`/inventory/vehicles/${vehicleId}`);
  return data?.data;
}

export async function getVehicleMakes() {
  const { data } = await api.get('/inventory/vehicles/makes');
  return data?.data?.makes || [];
}

export async function adjustInventory(productId, change, reason) {
  const product = await getProductById(productId);
  const newQuantity = product.quantity + change;
  if (newQuantity < 0) {
    throw new Error('Cannot reduce stock below zero');
  }
  return updateProduct(productId, { quantity: newQuantity, reason });
}
