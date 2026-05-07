const { successResponse, errorResponse } = require('../utils/response');
const ProductModel = require('../models/productModel');
const VehicleModel = require('../models/vehicleModel');
const InventoryTransactionModel = require('../models/inventoryTransactionModel');
const MerchantModel = require('../models/merchantModel');

const InventoryController = {

  async getProducts(req, res) {
    try {
      const userId = req.user.userId;
      const merchantId = await MerchantModel.getMerchantId(userId);
      if (!merchantId) {
        return errorResponse(res, 'Profile not found', 404);
      }

      const result = await ProductModel.findByMerchant(merchantId, req.query);
      return successResponse(res, result, 'Products retrieved successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch products', 500);
    }
  },

  // Get single product by ID
  async getProductById(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.userId;

      // Get merchant ID
      const merchantId = await MerchantModel.getMerchantId(userId);
      if (!merchantId) {
        return errorResponse(res, 'Profile not found', 404);
      }

      // Use ProductModel to fetch product
      const product = await ProductModel.findById(productId, merchantId);
      if (!product) {
        return errorResponse(res, 'Product not found', 404);
      }

      return successResponse(res, { product }, 'Product retrieved successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch product', 500);
    }
  },

  // Create new product
  async createProduct(req, res) {
    try {
      const userId = req.user.userId;
      const {
        name,
        serial_number,
        part_type,
        purchase_price,
        selling_price,
        description,
        quantity = 0,
        minimum = 0,
        product_condition,
        vehicle_ids
      } = req.body;

      // Validation
      if (!name || name.trim().length < 2) {
        return errorResponse(res, 'Product name is required (min 2 characters)', 400);
      }

      if (!purchase_price || parseFloat(purchase_price) <= 0) {
        return errorResponse(res, 'Valid purchase price is required', 400);
      }

      if (!selling_price || parseFloat(selling_price) <= 0) {
        return errorResponse(res, 'Valid selling price is required', 400);
      }

      // Get merchant ID
      const merchantId = await MerchantModel.getMerchantId(userId);
      if (!merchantId) {
        return errorResponse(res, 'Profile not found', 404);
      }

      // Create product using ProductModel
      const product = await ProductModel.create({
        merchant_id: merchantId,
        name: name.trim(),
        serial_number: serial_number?.trim() || null,
        part_type: part_type?.trim() || null,
        purchase_price: parseFloat(purchase_price),
        selling_price: parseFloat(selling_price),
        description: description?.trim() || null,
        quantity: parseInt(quantity) || 0,
        minimum: parseInt(minimum) || 0,
        product_condition: product_condition?.trim() || null
      });

      // Handle vehicles - can be IDs or new vehicle objects
      if (vehicle_ids && Array.isArray(vehicle_ids) && vehicle_ids.length > 0) {
        const vehicleLinks = [];
        
        for (const vehicle of vehicle_ids) {
          if (typeof vehicle === 'string') {
            // Existing vehicle ID
            vehicleLinks.push(vehicle);
          } else if (typeof vehicle === 'object' && vehicle.make && vehicle.model) {
            try {
              const vehicleRecord = await VehicleModel.findOrCreate(vehicle);
              vehicleLinks.push(vehicleRecord.id);
            } catch {
              continue;
            }
          }
        }

        // Link vehicles to product
        if (vehicleLinks.length > 0) {
          await ProductModel.linkVehicles(product.id, vehicleLinks);
        }
      }

      // Create inventory transaction for initial quantity if > 0
      if (parseInt(quantity) > 0) {
        try {
          await InventoryTransactionModel.create({
            product_id: product.id,
            quantity_change: parseInt(quantity),
            reason: 'Initial stock',
            created_by: userId
          });
        } catch {
          // Silently continue if transaction logging fails
        }
      }

      return successResponse(res, { product }, 'Product created successfully', 201);

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to create product', 500);
    }
  },

  // Update product
  async updateProduct(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.userId;
      const {
        name,
        serial_number,
        part_type,
        purchase_price,
        selling_price,
        description,
        quantity,
        minimum,
        product_condition,
        vehicle_ids
      } = req.body;

      // Get merchant ID
      const merchantId = await MerchantModel.getMerchantId(userId);
      if (!merchantId) {
        return errorResponse(res, 'Profile not found', 404);
      }

      // Check if product exists and belongs to merchant
      const existingProduct = await ProductModel.findById(productId, merchantId);
      if (!existingProduct) {
        return errorResponse(res, 'Product not found or access denied', 404);
      }

      // Calculate quantity change for transaction
      const newQuantity = quantity !== undefined ? parseInt(quantity) : existingProduct.quantity;
      const quantityDiff = newQuantity - existingProduct.quantity;

      // Build update object
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (serial_number !== undefined) updateData.serial_number = serial_number?.trim() || null;
      if (part_type !== undefined) updateData.part_type = part_type?.trim() || null;
      if (purchase_price !== undefined) updateData.purchase_price = parseFloat(purchase_price);
      if (selling_price !== undefined) updateData.selling_price = parseFloat(selling_price);
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (quantity !== undefined) updateData.quantity = newQuantity;
      if (minimum !== undefined) updateData.minimum = parseInt(minimum) || 0;
      if (product_condition !== undefined) updateData.product_condition = product_condition?.trim() || null;

      // Update product using ProductModel
      await ProductModel.update(productId, merchantId, updateData);

      // Update vehicle links if provided
      if (vehicle_ids !== undefined && Array.isArray(vehicle_ids)) {
        // Remove existing links
        await ProductModel.unlinkAllVehicles(productId, merchantId);

        // Add new links (handle both string IDs and new vehicle objects)
        if (vehicle_ids.length > 0) {
          const vehicleLinks = [];
          
          for (const vehicle of vehicle_ids) {
            if (typeof vehicle === 'string') {
              // Existing vehicle ID
              vehicleLinks.push(vehicle);
            } else if (typeof vehicle === 'object' && vehicle.make && vehicle.model) {
              try {
                const vehicleRecord = await VehicleModel.findOrCreate(vehicle);
                vehicleLinks.push(vehicleRecord.id);
              } catch {
                continue;
              }
            }
          }

          if (vehicleLinks.length > 0) {
            await ProductModel.linkVehicles(productId, vehicleLinks);
          }
        }
      }

      if (quantityDiff !== 0) {
        try {
          await InventoryTransactionModel.logQuantityChange(
            productId,
            merchantId,
            existingProduct.quantity,
            newQuantity,
            userId
          );
        } catch {
          // Silently continue if transaction logging fails
        }
      }

      const updatedProduct = await ProductModel.findById(productId, merchantId);
      return successResponse(res, { product: updatedProduct }, 'Product updated successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to update product', 500);
    }
  },

  // Delete product
  async deleteProduct(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.userId;

      // Get merchant ID
      const merchantId = await MerchantModel.getMerchantId(userId);
      if (!merchantId) {
        return errorResponse(res, 'Profile not found', 404);
      }

      // Get product image URL for deletion
      const imageUrl = await ProductModel.getImageUrl(productId, merchantId);

      // Delete image from storage if exists
      if (imageUrl) {
        await ProductModel.deleteImageFromStorage(imageUrl);
      }

      // Delete product using ProductModel (cascade will handle related records)
      await ProductModel.delete(productId, merchantId);

      return successResponse(res, null, 'Product deleted successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to delete product', 500);
    }
  },

  // Upload product image
  async uploadProductImage(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.userId;
      const file = req.file;

      if (!file) {
        return errorResponse(res, 'No image file provided', 400);
      }

      // Get merchant ID
      const merchantId = await MerchantModel.getMerchantId(userId);
      if (!merchantId) {
        return errorResponse(res, 'Profile not found', 404);
      }

      // Check if product exists and belongs to merchant
      const existingProduct = await ProductModel.findById(productId, merchantId);
      if (!existingProduct) {
        return errorResponse(res, 'Product not found or access denied', 404);
      }

      // Delete old image if exists
      if (existingProduct.image_url) {
        await ProductModel.deleteImageFromStorage(existingProduct.image_url);
      }

      // Generate unique filename (flat structure - no nested folders)
      const timestamp = Date.now();
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${timestamp}.${fileExt}`;

      // Upload image using ProductModel
      let image_url;
      try {
        image_url = await ProductModel.uploadImage(file.buffer, fileName, file.mimetype);
      } catch (uploadError) {
        if (uploadError.message?.includes('Bucket not found') || uploadError.statusCode === 404) {
          return errorResponse(res, 'Storage bucket not found', 500);
        }
        if (uploadError.message?.includes('policy') || uploadError.statusCode === 403) {
          return errorResponse(res, 'Storage permission denied', 403);
        }
        throw uploadError;
      }

      // Update product with new image URL
      const product = await ProductModel.updateImage(productId, merchantId, image_url);

      return successResponse(res, { product, image_url }, 'Product image uploaded successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to upload image', 500);
    }
  },

  // Get inventory transactions for a product
  async getProductTransactions(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.userId;
      const { page = 1, limit = 20 } = req.query;

      // Get merchant ID
      const merchantId = await MerchantModel.getMerchantId(userId);
      if (!merchantId) {
        return errorResponse(res, 'Profile not found', 404);
      }

      // Check if product belongs to merchant
      const product = await ProductModel.findById(productId, merchantId);
      if (!product) {
        return errorResponse(res, 'Product not found or access denied', 404);
      }

      // Get transactions using InventoryTransactionModel
      const result = await InventoryTransactionModel.findByProduct(productId, { page, limit });

      return successResponse(res, result, 'Transactions retrieved successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch transactions', 500);
    }
  },

  // Update transaction reason
  async updateTransactionReason(req, res) {
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId;

      // Validate reason
      const validReasons = ['buying', 'sale', 'damaged', 'replaced', 'lost'];
      if (!reason || !validReasons.includes(reason)) {
        return errorResponse(res, 'Reason must be one of: buying, sale, damaged, replaced, lost', 400);
      }

      // Get merchant ID
      const merchantId = await MerchantModel.getMerchantId(userId);
      if (!merchantId) {
        return errorResponse(res, 'Profile not found', 404);
      }

      // Update the transaction reason
      const transaction = await InventoryTransactionModel.updateReason(transactionId, reason);

      return successResponse(res, { transaction }, 'Transaction reason updated successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to update transaction reason', 500);
    }
  },

  // Get product statistics
  async getInventoryStats(req, res) {
    try {
      const userId = req.user.userId;

      // Get merchant ID
      const merchantId = await MerchantModel.getMerchantId(userId);
      if (!merchantId) {
        return errorResponse(res, 'Profile not found', 404);
      }

      // Get stats using ProductModel
      const stats = await ProductModel.getStats(merchantId);

      return successResponse(res, stats, 'Inventory statistics retrieved successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch statistics', 500);
    }
  },

  // Get all vehicles (for dropdown selection)
  async getVehicles(req, res) {
    try {
      // Use VehicleModel to get all vehicles
      const vehicles = await VehicleModel.findAll();
      return successResponse(res, { vehicles }, 'Vehicles retrieved successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch vehicles', 500);
    }
  },

  // Get unique vehicle makes (for filter dropdown)
  async getVehicleMakes(req, res) {
    try {
      const makes = await VehicleModel.getMakes();
      return successResponse(res, makes, 'Vehicle makes retrieved');
    } catch (err) {
      return errorResponse(res, err.message, 500);
    }
  },

  // Create a new vehicle (find existing or create new)
  async createVehicle(req, res) {
    try {
      const { make, model, year, trim, fuel_type, engine } = req.body;
      
      // Validate required fields
      if (!make || !model) {
        return errorResponse(res, 'Make and model are required', 400);
      }

      // Use findOrCreate to avoid duplicates - returns existing or creates new
      const vehicle = await VehicleModel.findOrCreate({
        make: make.trim(),
        model: model.trim(),
        year: year ? parseInt(year) : null,
        trim: trim?.trim() || null,
        fuel_type: fuel_type?.trim() || null,
        engine: engine?.trim() || null
      });

      return successResponse(res, { vehicle }, 'Vehicle saved successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to save vehicle', 500);
    }
  },

  // Update a vehicle
  async updateVehicle(req, res) {
    try {
      const { vehicleId } = req.params;
      const { make, model, year, trim, fuel_type, engine } = req.body;

      // Validate required fields
      if (!make || !model) {
        return errorResponse(res, 'Make and model are required', 400);
      }

      const vehicle = await VehicleModel.update(vehicleId, {
        make,
        model,
        year,
        trim,
        fuel_type,
        engine
      });

      return successResponse(res, { vehicle }, 'Vehicle updated successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to update vehicle', 500);
    }
  },

  // Delete a vehicle
  async deleteVehicle(req, res) {
    try {
      const { vehicleId } = req.params;

      await VehicleModel.delete(vehicleId);
      return successResponse(res, null, 'Vehicle deleted successfully');
    } catch (err) {
      return errorResponse(res, err.message || 'Failed to delete vehicle', 500);
    }
  },

  // Proxy product image (to bypass RLS issues)
  async getProductImage(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.userId;

      // Get merchant ID
      const merchantId = await MerchantModel.getMerchantId(userId);
      if (!merchantId) {
        return errorResponse(res, 'Profile not found', 404);
      }

      // Get product image URL
      const imageUrl = await ProductModel.getImageUrl(productId, merchantId);
      if (!imageUrl) {
        return errorResponse(res, 'Product has no image', 404);
      }

      // Extract filename from URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];

      // Download image from Supabase using admin client
      const { data, error } = await supabaseAdmin.storage
        .from('Merchant_Products')
        .download(fileName);

      if (error) {
        return errorResponse(res, 'Failed to load image', 500);
      }

      // Set content type based on file extension
      const ext = fileName.split('.').pop().toLowerCase();
      const contentType = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
      }[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(Buffer.from(await data.arrayBuffer()));

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch image', 500);
    }
  }

};

module.exports = InventoryController;
