const ROLES = {
  MERCHANT: 'merchant',
  SUPPLIER: 'supplier',
};

const ROLE_LABELS = {
  [ROLES.MERCHANT]: 'Merchant',
  [ROLES.SUPPLIER]: 'Supplier',
};

const isValidRole = (role) => Object.values(ROLES).includes(role);

module.exports = {
  ROLES,
  ROLE_LABELS,
  isValidRole,
};