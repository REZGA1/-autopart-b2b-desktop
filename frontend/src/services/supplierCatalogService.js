import api from '@/api/apiClient';
import { fixImageUrl } from '@/lib/utils';

const BUCKET_NAME = 'supplier_products';

export function getSupplierProductImageUrl(productId) {
  return `${api.defaults.baseURL}/supplier/catalog/products/${productId}/image`;
}

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
  const products = (data?.data?.products || []).map(product => ({
    ...product,
    image_url: fixImageUrl(product.image_url, BUCKET_NAME)
  }));
  
  return {
    products,
    pagination: data?.data?.pagination || {}
  };
}

export async function getSupplierProductById(productId) {
  const { data } = await api.get(`/supplier/catalog/products/${productId}`);
  const product = data?.data?.product;
  if (product) {
    product.image_url = fixImageUrl(product.image_url, BUCKET_NAME);
  }
  return product;
}

export async function createSupplierProduct(productData) {
  const { data } = await api.post('/supplier/catalog/products', productData);
  const product = data?.data?.product;
  if (product) {
    product.image_url = fixImageUrl(product.image_url);
  }
  return product;
}

export async function updateSupplierProduct(productId, productData) {
  const { data } = await api.put(`/supplier/catalog/products/${productId}`, productData);
  const product = data?.data?.product;
  if (product) {
    product.image_url = fixImageUrl(product.image_url);
  }
  return product;
}

export async function deleteSupplierProduct(productId) {
  await api.delete(`/supplier/catalog/products/${productId}`);
}

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

export async function getCatalogStats() {
  const { data } = await api.get('/supplier/catalog/products/stats');
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
  const url = queryString ? `/supplier/catalog/vehicles?${queryString}` : '/supplier/catalog/vehicles';
  
  const { data } = await api.get(url);
  return data?.data?.vehicles || [];
}

export async function createVehicle(vehicleData) {
  const { data } = await api.post('/supplier/catalog/vehicles', vehicleData);
  return data?.data;
}

export async function updateVehicle(vehicleId, vehicleData) {
  const { data } = await api.put(`/supplier/catalog/vehicles/${vehicleId}`, vehicleData);
  return data?.data;
}

export async function deleteVehicle(vehicleId) {
  const { data } = await api.delete(`/supplier/catalog/vehicles/${vehicleId}`);
  return data?.data;
}

export async function getVehicleMakes() {
  const { data } = await api.get('/supplier/catalog/vehicles/makes');
  return data?.data?.makes || [];
}

export async function adjustQuantity(productId, change) {
  const product = await getSupplierProductById(productId);
  const newQuantity = product.quantity + change;
  if (newQuantity < 0) {
    throw new Error('Cannot reduce quantity below zero');
  }
  return updateSupplierProduct(productId, { quantity: newQuantity });
}

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

export async function updateSupplierRequestStatus(requestId, status) {
  const { data } = await api.put(`/supplier/catalog/requests/${requestId}/status`, { status });
  return data?.data?.request;
}
