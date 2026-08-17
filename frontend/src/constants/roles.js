export const ROLES = {
  MERCHANT: 'merchant',
  SUPPLIER: 'supplier',
};

export const ROLE_LABELS = {
  [ROLES.MERCHANT]: 'Merchant',
  [ROLES.SUPPLIER]: 'Supplier',
};

export const isValidRole = (role) => Object.values(ROLES).includes(role);