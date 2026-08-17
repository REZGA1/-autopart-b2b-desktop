const { errorResponse } = require('../utils/response');

const validateSupplierProduct = (req, res, next) => {
  const { name, price, category } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2)
    errors.push('Product name is required');

  if (price === undefined || price === null || isNaN(price) || price < 0)
    errors.push('Valid price is required');

  if (!category || category.trim().length < 2)
    errors.push('Category is required');

  if (errors.length > 0)
    return errorResponse(res, 'Invalid supplier product data', 400, errors);

  next();
};

module.exports = { validateSupplierProduct };