export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
};

export const STATUS_LABELS = {
  [STATUS.ACTIVE]: 'Active',
  [STATUS.INACTIVE]: 'Inactive',
  [STATUS.PENDING]: 'Pending',
  [STATUS.APPROVED]: 'Approved',
  [STATUS.REJECTED]: 'Rejected',
  [STATUS.SUSPENDED]: 'Suspended',
};

export const STATUS_COLORS = {
  [STATUS.ACTIVE]: 'green',
  [STATUS.INACTIVE]: 'gray',
  [STATUS.PENDING]: 'yellow',
  [STATUS.APPROVED]: 'green',
  [STATUS.REJECTED]: 'red',
  [STATUS.SUSPENDED]: 'red',
};