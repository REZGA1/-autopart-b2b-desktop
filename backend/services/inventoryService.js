const ProductModel = require('../repositories/productRepository');
const VehicleModel = require('../repositories/vehicleRepository');
const InventoryTransactionModel = require('../repositories/inventoryRepository');
const MerchantModel = require('../repositories/merchantRepository');
const { supabaseAdmin } = require('../config/supabase');

const InventoryService = {
  async getMerchantId(userId) {
    const merchantId = await MerchantModel.getMerchantId(userId);
    if (!merchantId) {
      const err = new Error('Profile not found');
      err.status = 404;
      throw err;
    }
    return merchantId;
  },

  async getProducts(userId, query) {
    const merchantId = await this.getMerchantId(userId);
    return ProductModel.findByMerchant(merchantId, query);
  },

  async getProductById(productId, userId) {
    const merchantId = await this.getMerchantId(userId);
    const product = await ProductModel.findById(productId, merchantId);
    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }
    return product;
  },

  async createProduct(userId, data) {
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
    } = data;

    if (!name || name.trim().length < 2) {
      const err = new Error('Product name is required (min 2 characters)');
      err.status = 400;
      throw err;
    }
    if (!purchase_price || parseFloat(purchase_price) <= 0) {
      const err = new Error('Valid purchase price is required');
      err.status = 400;
      throw err;
    }
    if (!selling_price || parseFloat(selling_price) <= 0) {
      const err = new Error('Valid selling price is required');
      err.status = 400;
      throw err;
    }

    const merchantId = await this.getMerchantId(userId);

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

    if (vehicle_ids && Array.isArray(vehicle_ids) && vehicle_ids.length > 0) {
      const vehicleLinks = [];
      for (const vehicle of vehicle_ids) {
        if (typeof vehicle === 'string') {
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
        await ProductModel.linkVehicles(product.id, vehicleLinks);
      }
    }

    if (parseInt(quantity) > 0) {
      try {
        await InventoryTransactionModel.create({
          product_id: product.id,
          quantity_change: parseInt(quantity),
          reason: 'Initial stock',
          created_by: userId
        });
      } catch {
        // Silently continue transaction log failure
      }
    }

    return product;
  },

  async updateProduct(productId, userId, data) {
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
    } = data;

    const merchantId = await this.getMerchantId(userId);

    const existingProduct = await ProductModel.findById(productId, merchantId);
    if (!existingProduct) {
      const err = new Error('Product not found or access denied');
      err.status = 404;
      throw err;
    }

    const newQuantity = quantity !== undefined ? parseInt(quantity) : existingProduct.quantity;
    const quantityDiff = newQuantity - existingProduct.quantity;

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

    await ProductModel.update(productId, merchantId, updateData);

    if (vehicle_ids !== undefined && Array.isArray(vehicle_ids)) {
      await ProductModel.unlinkAllVehicles(productId, merchantId);

      if (vehicle_ids.length > 0) {
        const vehicleLinks = [];
        for (const vehicle of vehicle_ids) {
          if (typeof vehicle === 'string') {
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
        // Silently continue transaction log failure
      }
    }

    return ProductModel.findById(productId, merchantId);
  },

  async deleteProduct(productId, userId) {
    const merchantId = await this.getMerchantId(userId);

    const imageUrl = await ProductModel.getImageUrl(productId, merchantId);
    if (imageUrl) {
      await ProductModel.deleteImageFromStorage(imageUrl);
    }

    await ProductModel.delete(productId, merchantId);
    return true;
  },

  async uploadProductImage(productId, userId, file) {
    if (!file) {
      const err = new Error('No image file provided');
      err.status = 400;
      throw err;
    }

    const merchantId = await this.getMerchantId(userId);
    const existingProduct = await ProductModel.findById(productId, merchantId);
    if (!existingProduct) {
      const err = new Error('Product not found or access denied');
      err.status = 404;
      throw err;
    }

    if (existingProduct.image_url) {
      await ProductModel.deleteImageFromStorage(existingProduct.image_url);
    }

    const timestamp = Date.now();
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${timestamp}.${fileExt}`;

    let image_url;
    try {
      image_url = await ProductModel.uploadImage(file.buffer, fileName, file.mimetype);
    } catch (uploadError) {
      if (uploadError.message?.includes('Bucket not found') || uploadError.statusCode === 404) {
        const err = new Error('Storage bucket not found');
        err.status = 500;
        throw err;
      }
      if (uploadError.message?.includes('policy') || uploadError.statusCode === 403) {
        const err = new Error('Storage permission denied');
        err.status = 403;
        throw err;
      }
      throw uploadError;
    }

    const product = await ProductModel.updateImage(productId, merchantId, image_url);
    return { product, image_url };
  },

  async getProductTransactions(productId, userId, { page = 1, limit = 20 }) {
    const merchantId = await this.getMerchantId(userId);
    const product = await ProductModel.findById(productId, merchantId);
    if (!product) {
      const err = new Error('Product not found or access denied');
      err.status = 404;
      throw err;
    }
    return InventoryTransactionModel.findByProduct(productId, { page, limit });
  },

  async updateTransactionReason(transactionId, userId, reason) {
    const validReasons = ['buying', 'sale', 'damaged', 'replaced', 'lost'];
    if (!reason || !validReasons.includes(reason)) {
      const err = new Error('Reason must be one of: buying, sale, damaged, replaced, lost');
      err.status = 400;
      throw err;
    }

    await this.getMerchantId(userId);
    return InventoryTransactionModel.updateReason(transactionId, reason);
  },

  async getInventoryStats(userId) {
    const merchantId = await this.getMerchantId(userId);
    return ProductModel.getStats(merchantId);
  },

  async getVehicles() {
    return VehicleModel.findAll();
  },

  async getVehicleMakes() {
    return VehicleModel.getMakes();
  },

  async createVehicle(data) {
    const { make, model, year, trim, fuel_type, engine } = data;
    if (!make || !model) {
      const err = new Error('Make and model are required');
      err.status = 400;
      throw err;
    }

    return VehicleModel.findOrCreate({
      make: make.trim(),
      model: model.trim(),
      year: year ? parseInt(year) : null,
      trim: trim?.trim() || null,
      fuel_type: fuel_type?.trim() || null,
      engine: engine?.trim() || null
    });
  },

  async updateVehicle(vehicleId, data) {
    const { make, model, year, trim, fuel_type, engine } = data;
    if (!make || !model) {
      const err = new Error('Make and model are required');
      err.status = 400;
      throw err;
    }

    return VehicleModel.update(vehicleId, {
      make, model, year, trim, fuel_type, engine
    });
  },

  async deleteVehicle(vehicleId) {
    return VehicleModel.delete(vehicleId);
  },

  async getProductImageBuffer(productId, userId) {
    const merchantId = await this.getMerchantId(userId);
    const imageUrl = await ProductModel.getImageUrl(productId, merchantId);
    if (!imageUrl) {
      const err = new Error('Product has no image');
      err.status = 404;
      throw err;
    }

    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];

    const { data, error } = await supabaseAdmin.storage
      .from('Merchant_Products')
      .download(fileName);

    if (error) {
      const err = new Error('Failed to load image');
      err.status = 500;
      throw err;
    }

    const ext = fileName.split('.').pop().toLowerCase();
    const contentType = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    }[ext] || 'application/octet-stream';

    const buffer = Buffer.from(await data.arrayBuffer());
    return { buffer, contentType };
  }
};

module.exports = InventoryService;
