const SupplierProductModel = require('../repositories/supplierProductRepository');
const VehicleModel = require('../repositories/vehicleRepository');
const ProfileModel = require('../repositories/userRepository');
const { supabaseAdmin } = require('../config/supabase');

const SupplierCatalogService = {
  async getSupplierId(userId) {
    const profile = await ProfileModel.findByUserId(userId);
    if (!profile?.id) {
      const err = new Error('Profile not found');
      err.status = 404;
      throw err;
    }
    return profile.id;
  },

  async getProducts(userId, query) {
    const supplierId = await this.getSupplierId(userId);
    return SupplierProductModel.findBySupplier(supplierId, query);
  },

  async getProductById(productId, userId) {
    const supplierId = await this.getSupplierId(userId);
    const product = await SupplierProductModel.findById(productId, supplierId);
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

    const supplierId = await this.getSupplierId(userId);

    const product = await SupplierProductModel.create({
      supplier_id: supplierId,
      name: name.trim(),
      serial_number: serial_number?.trim() || null,
      part_type: part_type?.trim() || null,
      purchase_price: parseFloat(purchase_price),
      selling_price: selling_price ? parseFloat(selling_price) : null,
      description: description?.trim() || null,
      quantity: parseInt(quantity) || 0,
      minimum: parseInt(minimum) || 0,
      product_condition: product_condition?.trim() || null
    });

    if (vehicle_ids && Array.isArray(vehicle_ids) && vehicle_ids.length > 0) {
      const vehicleLinks = [];
      for (const vehicle of vehicle_ids) {
        if (!vehicle) continue;
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
        await SupplierProductModel.linkVehicles(product.id, vehicleLinks);
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

    const supplierId = await this.getSupplierId(userId);
    const existingProduct = await SupplierProductModel.findById(productId, supplierId);
    if (!existingProduct) {
      const err = new Error('Product not found or access denied');
      err.status = 404;
      throw err;
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (serial_number !== undefined) updateData.serial_number = serial_number?.trim() || null;
    if (part_type !== undefined) updateData.part_type = part_type?.trim() || null;
    if (purchase_price !== undefined) updateData.purchase_price = parseFloat(purchase_price);
    if (selling_price !== undefined) updateData.selling_price = selling_price ? parseFloat(selling_price) : null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);
    if (minimum !== undefined) updateData.minimum = parseInt(minimum) || 0;
    if (product_condition !== undefined) updateData.product_condition = product_condition?.trim() || null;

    await SupplierProductModel.update(productId, supplierId, updateData);

    if (vehicle_ids !== undefined && Array.isArray(vehicle_ids)) {
      await SupplierProductModel.unlinkAllVehicles(productId);
      if (vehicle_ids.length > 0) {
        const vehicleLinks = [];
        for (const vehicle of vehicle_ids) {
          if (!vehicle) continue;
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
          await SupplierProductModel.linkVehicles(productId, vehicleLinks);
        }
      }
    }

    return SupplierProductModel.findById(productId, supplierId);
  },

  async deleteProduct(productId, userId) {
    const supplierId = await this.getSupplierId(userId);
    const imageUrl = await SupplierProductModel.getImageUrl(productId, supplierId);
    if (imageUrl) {
      await SupplierProductModel.deleteImageFromStorage(imageUrl);
    }
    await SupplierProductModel.delete(productId, supplierId);
    return true;
  },

  async uploadProductImage(productId, userId, file) {
    if (!file) {
      const err = new Error('No image file provided');
      err.status = 400;
      throw err;
    }

    const supplierId = await this.getSupplierId(userId);
    const existingProduct = await SupplierProductModel.findById(productId, supplierId);
    if (!existingProduct) {
      const err = new Error('Product not found or access denied');
      err.status = 404;
      throw err;
    }

    if (existingProduct.image_url) {
      await SupplierProductModel.deleteImageFromStorage(existingProduct.image_url);
    }

    const timestamp = Date.now();
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${timestamp}.${fileExt}`;

    let image_url;
    try {
      image_url = await SupplierProductModel.uploadImage(file.buffer, fileName, file.mimetype);
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

    const product = await SupplierProductModel.updateImage(productId, supplierId, image_url);
    return { product, image_url };
  },

  async getCatalogStats(userId) {
    const supplierId = await this.getSupplierId(userId);
    return SupplierProductModel.getStats(supplierId);
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

  async getProductImageBuffer(productId) {
    const { data: product, error: productError } = await supabaseAdmin
      .from('supplier_products')
      .select('image_url')
      .eq('id', productId)
      .single();

    if (productError || !product || !product.image_url) {
      const err = new Error('Image not found');
      err.status = 404;
      throw err;
    }

    const imageUrl = product.image_url;
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const storagePath = decodeURIComponent(fileName.split('?')[0]);

    const { data, error } = await supabaseAdmin.storage
      .from('supplier_products')
      .download(storagePath);

    if (error) {
      const err = new Error('Failed to load image');
      err.status = 500;
      throw err;
    }

    const ext = storagePath.split('.').pop().toLowerCase();
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

module.exports = SupplierCatalogService;
