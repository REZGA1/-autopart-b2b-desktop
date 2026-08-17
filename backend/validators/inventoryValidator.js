const { errorResponse } = require('../utils/response');

const validateProduct = (req, res, next) => {
  const { name, sku, price, stock } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2)
    errors.push('Product name is required');

  if (!sku || sku.trim().length < 3)
    errors.push('SKU is required');

  if (price === undefined || price === null || isNaN(price) || price < 0)
    errors.push('Valid price is required');

  if (stock === undefined || stock === null || isNaN(stock) || stock < 0)
    errors.push('Valid stock quantity is required');

  if (errors.length > 0)
    return errorResponse(res, 'Invalid product data', 400, errors);

  next();
};

const validateStockUpdate = (req, res, next) => {
  const { quantity, type } = req.body;
  const errors = [];

  if (quantity === undefined || quantity === null || isNaN(quantity) || quantity <= 0)
    errors.push('Valid quantity is required');

  if (!type || !['in', 'out'].includes(type))
    errors.push('Type must be: in or out');

  if (errors.length > 0)
    return errorResponse(res, 'Invalid stock update data', 400, errors);

  next();
};

module.exports = { validateProduct, validateStockUpdate };