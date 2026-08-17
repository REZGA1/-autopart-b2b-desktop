const { errorResponse } = require('../utils/response');

const validateSupplierUpdate = (req, res, next) => {
  const body = req.body || {};
  const errors = [];

  if (body.company_name !== undefined && String(body.company_name).trim().length < 2)
    errors.push('Company name is required');

  if (body.business_email !== undefined && body.business_email !== null && String(body.business_email).trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.business_email))
    errors.push('Invalid business email');

  if (body.business_phone !== undefined && body.business_phone !== null && String(body.business_phone).trim() !== '' && String(body.business_phone).trim().length < 6)
    errors.push('Business phone is too short');

  if (body.address !== undefined && String(body.address).trim().length < 5)
    errors.push('Address is required');

  if (errors.length > 0)
    return errorResponse(res, 'Invalid supplier data', 400, errors);

  next();
};

module.exports = { validateSupplierUpdate };