const { errorResponse } = require('../utils/response');

const validateRegister = (req, res, next) => {
  const { email, password, firstName, lastName, role } = req.body;
  const errors = [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push('Invalid email');

  if (!password || password.length < 8)
    errors.push('Password: at least 8 characters');

  if (!firstName || firstName.trim().length < 2)
    errors.push('First name is required');

  if (!lastName || lastName.trim().length < 2)
    errors.push('Last name is required');

  if (!role || !['merchant', 'supplier'].includes(role))
    errors.push('Role must be: merchant or supplier');

  if (errors.length > 0)
    return errorResponse(res, 'Invalid input', 400, errors);

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];
  if (!email) errors.push('Email is required');
  if (!password) errors.push('Password is required');
  if (errors.length)
    return errorResponse(res, 'Invalid input', 400, errors);
  next();
};

const validateProfileUpdate = (req, res, next) => {
  const body = req.body || {};
  const errors = [];

  if (body.validated !== undefined) {
    errors.push('validated cannot be updated');
  }

  if (body.first_name !== undefined && String(body.first_name).trim().length < 2)
    errors.push('first_name: at least 2 characters');

  if (body.last_name !== undefined && String(body.last_name).trim().length < 2)
    errors.push('last_name: at least 2 characters');

  if (body.role !== undefined)
    errors.push('role cannot be updated');

  if (body.business_email !== undefined && body.business_email !== null && String(body.business_email).trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.business_email))
    errors.push('Invalid business email');

  if (body.business_phone !== undefined && body.business_phone !== null && String(body.business_phone).trim() !== '' && String(body.business_phone).trim().length < 6)
    errors.push('business_phone is too short');

  if (body.rc_number !== undefined && body.rc_number !== null && String(body.rc_number).trim() !== '' && String(body.rc_number).trim().length < 3)
    errors.push('rc_number is too short');

  if (body.nif_number !== undefined && body.nif_number !== null && String(body.nif_number).trim() !== '' && String(body.nif_number).trim().length < 3)
    errors.push('nif_number is too short');

  if (errors.length)
    return errorResponse(res, 'Invalid input', 400, errors);

  next();
};

module.exports = { validateRegister, validateLogin, validateProfileUpdate };