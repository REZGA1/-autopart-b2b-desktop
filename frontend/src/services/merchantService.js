import api from '@/api/apiClient';

export async function getUnvalidatedSuppliers() {
  const { data } = await api.get('/merchant/suppliers/unvalidated');
  return data?.data?.suppliers || [];
}

export async function validateSupplier(supplierId) {
  const { data } = await api.post(`/merchant/suppliers/${supplierId}/validate`);
  return data?.data?.supplier;
}

export async function getSupplierDetails(supplierId) {
  const { data } = await api.get(`/merchant/suppliers/${supplierId}`);
  return data?.data?.supplier;
}

export async function getMerchantContacts() {
  const { data } = await api.get('/merchant/contacts');
  return data?.data?.contacts || [];
}

export async function getSupplierContacts() {
  const { data } = await api.get('/merchant/my-contacts');
  return data?.data?.contacts || [];
}

export async function toggleSupplierBlock(supplierId, isActive) {
  const { data } = await api.post(`/merchant/suppliers/${supplierId}/toggle-block`, { isActive });
  return data?.data;
}
