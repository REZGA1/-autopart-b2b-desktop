const PERMISSIONS = {
  // Inventory permissions
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_CREATE: 'inventory:create',
  INVENTORY_UPDATE: 'inventory:update',
  INVENTORY_DELETE: 'inventory:delete',

  // Supplier catalog permissions
  SUPPLIER_CATALOG_VIEW: 'supplier_catalog:view',
  SUPPLIER_CATALOG_CREATE: 'supplier_catalog:create',
  SUPPLIER_CATALOG_UPDATE: 'supplier_catalog:update',
  SUPPLIER_CATALOG_DELETE: 'supplier_catalog:delete',

  // Merchant permissions
  MERCHANT_VIEW: 'merchant:view',
  MERCHANT_UPDATE: 'merchant:update',
  MERCHANT_VALIDATE: 'merchant:validate',

  // Store permissions
  STORE_VIEW: 'store:view',
  STORE_CREATE: 'store:create',
  STORE_UPDATE: 'store:update',
  STORE_DELETE: 'store:delete',
};

const ROLE_PERMISSIONS = {
  merchant: [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.INVENTORY_DELETE,
    PERMISSIONS.SUPPLIER_CATALOG_VIEW,
    PERMISSIONS.STORE_VIEW,
    PERMISSIONS.STORE_CREATE,
    PERMISSIONS.STORE_UPDATE,
    PERMISSIONS.STORE_DELETE,
  ],
  supplier: [
    PERMISSIONS.SUPPLIER_CATALOG_VIEW,
    PERMISSIONS.SUPPLIER_CATALOG_CREATE,
    PERMISSIONS.SUPPLIER_CATALOG_UPDATE,
    PERMISSIONS.SUPPLIER_CATALOG_DELETE,
    PERMISSIONS.STORE_VIEW,
  ],
};

const hasPermission = (role, permission) => {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
};