const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
};

const STATUS_LABELS = {
  [STATUS.ACTIVE]: 'Active',
  [STATUS.INACTIVE]: 'Inactive',
  [STATUS.PENDING]: 'Pending',
  [STATUS.APPROVED]: 'Approved',
  [STATUS.REJECTED]: 'Rejected',
  [STATUS.SUSPENDED]: 'Suspended',
};

const isValidStatus = (status) => Object.values(STATUS).includes(status);

module.exports = {
  STATUS,
  STATUS_LABELS,
  isValidStatus,
};