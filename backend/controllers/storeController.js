const { successResponse, errorResponse } = require('../utils/response');
const PurchaseRequestModel = require('../models/purchaseRequestModel');
const MerchantModel = require('../models/merchantModel');
const { supabaseAdmin } = require('../config/supabase');

const StoreController = {

  async getMerchantId(userId) {
    const merchant = await MerchantModel.findByAuthUserId(userId);
    return merchant?.id || null;
  },

  async getSupplierProducts(req, res) {
    try {
      const userId = req.user.userId;
      const merchantId = await this.getMerchantId(userId);

      if (!merchantId) {
        return errorResponse(res, 'Merchant profile not found', 404);
      }

      const {
        search,
        part_type,
        product_condition,
        supplier_id,
        supplier_name,
        min_price,
        max_price,
        is_available,
        vehicle_make,
        vehicle_model,
        vehicle_year,
        vehicle_engine,
        sort_by = 'created_at',
        sort_order = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      // Get validated supplier IDs first
      const { data: validatedSuppliers, error: supplierError } = await supabaseAdmin
        .from('profiles')
        .select('id, company_name, first_name, last_name')
        .eq('role', 'supplier')
        .eq('validated', true);

      if (supplierError) throw supplierError;

      const validatedSupplierIds = (validatedSuppliers || []).map(s => s.id);

      if (validatedSupplierIds.length === 0) {
        return successResponse(res, {
          products: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
        }, 'No validated suppliers found');
      }

      // Filter suppliers by name if provided
      let filteredSupplierIds = validatedSupplierIds;
      if (supplier_name) {
        const matchingSuppliers = (validatedSuppliers || []).filter(s =>
          (s.company_name && s.company_name.toLowerCase().includes(supplier_name.toLowerCase())) ||
          `${s.first_name} ${s.last_name}`.toLowerCase().includes(supplier_name.toLowerCase())
        );
        filteredSupplierIds = matchingSuppliers.map(s => s.id);
        if (filteredSupplierIds.length === 0) {
          return successResponse(res, {
            products: [],
            pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
          }, 'No suppliers match the filter');
        }
      }

      // Build query on supplier_products table
      let query = supabaseAdmin
        .from('supplier_products')
        .select(`
          id,
          supplier_id,
          name,
          serial_number,
          part_type,
          selling_price,
          description,
          image_url,
          product_condition,
          quantity,
          created_at,
          updated_at,
          supplier:profiles!supplier_products_supplier_id_fkey(id, company_name, first_name, last_name, avatar_url, online_status)
        `, { count: 'exact' })
        .in('supplier_id', filteredSupplierIds);

      // Apply specific supplier filter
      if (supplier_id) {
        query = query.eq('supplier_id', supplier_id);
      }

      // Apply text filters
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,serial_number.ilike.%${search}%`);
      }

      if (part_type) {
        query = query.eq('part_type', part_type);
      }

      if (product_condition) {
        query = query.eq('product_condition', product_condition);
      }

      if (is_available === 'true') {
        query = query.gt('quantity', 0);
      } else if (is_available === 'false') {
        query = query.lte('quantity', 0);
      }

      if (min_price !== undefined && min_price !== '') {
        query = query.gte('selling_price', parseFloat(min_price));
      }

      if (max_price !== undefined && max_price !== '') {
        query = query.lte('selling_price', parseFloat(max_price));
      }

      // Vehicle filters - need to get matching product IDs first
      let vehicleFilteredProductIds = null;

      if (vehicle_make || vehicle_model || vehicle_year || vehicle_engine) {
        const { data: supplierProductIds, error: spError } = await supabaseAdmin
          .from('supplier_products')
          .select('id')
          .in('supplier_id', filteredSupplierIds);

        if (spError || !supplierProductIds || supplierProductIds.length === 0) {
          return successResponse(res, {
            products: [],
            pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
          }, 'No products from validated suppliers');
        }

        const productIds = supplierProductIds.map(p => p.id);

        let vehicleQuery = supabaseAdmin
          .from('supplier_product_vehicles')
          .select('supplier_product_id, vehicle:vehicles!inner(make, model, year, engine)')
          .in('supplier_product_id', productIds);

        if (vehicle_make) {
          vehicleQuery = vehicleQuery.ilike('vehicles.make', `%${vehicle_make}%`);
        }
        if (vehicle_model) {
          vehicleQuery = vehicleQuery.ilike('vehicles.model', `%${vehicle_model}%`);
        }
        if (vehicle_year) {
          vehicleQuery = vehicleQuery.eq('vehicles.year', parseInt(vehicle_year));
        }
        if (vehicle_engine) {
          vehicleQuery = vehicleQuery.ilike('vehicles.engine', `%${vehicle_engine}%`);
        }

        const { data: vehicleData, error: vehicleError } = await vehicleQuery;

        if (!vehicleError && vehicleData) {
          vehicleFilteredProductIds = [...new Set(vehicleData.map(v => v.supplier_product_id))];
          if (vehicleFilteredProductIds.length === 0) {
            return successResponse(res, {
              products: [],
              pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
            }, 'No products match vehicle filters');
          }
          query = query.in('id', vehicleFilteredProductIds);
        }
      }

      // Sorting
      const validSortColumns = ['created_at', 'name', 'selling_price', 'quantity'];
      const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
      query = query.order(sortColumn, { ascending: sort_order === 'asc' });

      // Pagination
      const from = (parseInt(page) - 1) * parseInt(limit);
      const to = from + parseInt(limit) - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const formattedProducts = (data || []).map(product => {
        const firstName = product.supplier?.first_name || '';
        const lastName = product.supplier?.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();

        return {
          ...product,
          is_available: product.quantity > 0,
          supplier_name: fullName || product.supplier?.company_name || 'Unknown',
          supplier_first_name: firstName,
          supplier_last_name: lastName,
          supplier_avatar: product.supplier?.avatar_url,
          supplier_online: product.supplier?.online_status
        };
      });

      return successResponse(res, {
        products: formattedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit))
        }
      }, 'Products retrieved successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch products', 500);
    }
  },

  async getSupplierProductById(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.userId;

      const merchantId = await this.getMerchantId(userId);
      if (!merchantId) {
        return errorResponse(res, 'Merchant profile not found', 404);
      }

      const { data: product, error: productError } = await supabaseAdmin
        .from('supplier_products')
        .select(`
          *,
          supplier:profiles!supplier_products_supplier_id_fkey(id, company_name, first_name, last_name, business_email, business_phone, avatar_url, online_status)
        `)
        .eq('id', productId)
        .single();

      if (productError || !product) {
        return errorResponse(res, 'Product not found', 404);
      }

      const { data: supplierProfile, error: supplierCheckError } = await supabaseAdmin
        .from('profiles')
        .select('validated')
        .eq('id', product.supplier_id)
        .single();

      if (supplierCheckError || !supplierProfile?.validated) {
        return errorResponse(res, 'Product not available', 404);
      }

      const { data: vehicleLinks, error: vehicleError } = await supabaseAdmin
        .from('supplier_product_vehicles')
        .select('vehicle:vehicles(*)')
        .eq('supplier_product_id', productId);

      const vehicles = (vehicleLinks || []).map(link => link.vehicle).filter(Boolean);

      const firstName = product.supplier?.first_name || '';
      const lastName = product.supplier?.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();

      const formattedProduct = {
        ...product,
        is_available: product.quantity > 0,
        supplier_name: fullName || product.supplier?.company_name || 'Unknown',
        supplier_first_name: firstName,
        supplier_last_name: lastName,
        supplier_avatar: product.supplier?.avatar_url,
        supplier_online: product.supplier?.online_status === true,
        supplier_email: product.supplier?.business_email,
        supplier_phone: product.supplier?.business_phone,
        vehicles
      };

      return successResponse(res, {
        product: formattedProduct
      }, 'Product retrieved successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch product', 500);
    }
  },

  async getPurchaseRequests(req, res) {
    try {
      const userId = req.user.userId;
      const merchantId = await this.getMerchantId(userId);

      if (!merchantId) {
        return errorResponse(res, 'Merchant profile not found', 404);
      }

      const { status, page = 1, limit = 20 } = req.query;

      const result = await PurchaseRequestModel.findByMerchant(merchantId, {
        status,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      return successResponse(res, result, 'Purchase requests retrieved successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch requests', 500);
    }
  },

  async createPurchaseRequest(req, res) {
    try {
      const userId = req.user.userId;
      const merchantId = await this.getMerchantId(userId);

      if (!merchantId) {
        return errorResponse(res, 'Merchant profile not found', 404);
      }

      const { supplier_id, items } = req.body;

      if (!supplier_id) {
        return errorResponse(res, 'Supplier ID is required', 400);
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return errorResponse(res, 'At least one item is required', 400);
      }

      for (const item of items) {
        if (!item.supplier_product_id) {
          return errorResponse(res, 'Supplier product ID is required for all items', 400);
        }
        if (!item.quantity || parseInt(item.quantity) <= 0) {
          return errorResponse(res, 'Valid quantity is required for all items', 400);
        }
        if (item.unit_price === undefined || parseFloat(item.unit_price) < 0) {
          return errorResponse(res, 'Valid unit price is required for all items', 400);
        }

        const { data: product, error: productError } = await supabaseAdmin
          .from('supplier_products')
          .select('quantity, name')
          .eq('id', item.supplier_product_id)
          .single();

        if (productError || !product) {
          return errorResponse(res, `Product not found for item: ${item.supplier_product_id}`, 404);
        }

        const requestedQuantity = parseInt(item.quantity);
        if (requestedQuantity > product.quantity) {
          return errorResponse(
            res,
            `Insufficient stock for "${product.name}". Please request a smaller quantity.`,
            400
          );
        }
      }

      const request = await PurchaseRequestModel.create({
        merchantId,
        supplierId: supplier_id,
        items: items.map(item => ({
          supplier_product_id: item.supplier_product_id,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
          product_name: item.product_name
        }))
      });

      return successResponse(res, { request }, 'Purchase request created successfully', 201);

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to create request', 500);
    }
  },

  async updatePurchaseRequestStatus(req, res) {
    try {
      const { requestId } = req.params;
      const { status } = req.body;
      const authUserId = req.user.userId;
      const userRole = req.user.role;

      if (!status) {
        return errorResponse(res, 'Status is required', 400);
      }

      if (!['pending', 'accepted', 'rejected', 'fulfilled', 'cancelled'].includes(status)) {
        return errorResponse(res, 'Invalid status', 400);
      }

      let profileId;
      if (userRole === 'merchant') {
        profileId = await this.getMerchantId(authUserId);
        if (!profileId) {
          return errorResponse(res, 'Merchant profile not found', 404);
        }
      } else if (userRole === 'supplier') {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('auth_user_id', authUserId)
          .single();
        profileId = profile?.id;
        if (!profileId) {
          return errorResponse(res, 'Supplier profile not found', 404);
        }
      } else {
        return errorResponse(res, 'Invalid role', 403);
      }

      const updated = await PurchaseRequestModel.updateStatus(
        requestId,
        status,
        profileId,
        userRole
      );

      return successResponse(res, { request: updated }, 'Status updated successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to update status', 500);
    }
  },

  async fulfillRequest(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.userId;

      const merchantId = await this.getMerchantId(userId);
      if (!merchantId) {
        return errorResponse(res, 'Merchant profile not found', 404);
      }

      const updated = await PurchaseRequestModel.updateStatus(
        requestId,
        'fulfilled',
        merchantId,
        'merchant'
      );

      const inventoryResults = await PurchaseRequestModel.fulfillAndAddToInventory(
        requestId,
        merchantId,
        userId
      );

      return successResponse(res, {
        request: updated,
        inventory: inventoryResults
      }, 'Request fulfilled and inventory updated');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fulfill request', 500);
    }
  },

  async deletePurchaseRequest(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.userId;

      const merchantId = await this.getMerchantId(userId);
      if (!merchantId) {
        return errorResponse(res, 'Merchant profile not found', 404);
      }

      await PurchaseRequestModel.delete(requestId, merchantId);

      return successResponse(res, null, 'Purchase request deleted successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to delete request', 500);
    }
  },

  async getSuppliers(req, res) {
    try {
      const userId = req.user.userId;
      const merchantId = await this.getMerchantId(userId);

      if (!merchantId) {
        return errorResponse(res, 'Merchant profile not found', 404);
      }

      const { data: suppliers, error } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, company_name, business_email, business_phone, created_at')
        .eq('role', 'supplier')
        .eq('validated', true)
        .order('company_name');

      if (error) throw error;

      return successResponse(res, { suppliers: suppliers || [] }, 'Suppliers retrieved successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch suppliers', 500);
    }
  },

  async getSupplierPurchaseRequests(req, res) {
    try {
      const authUserId = req.user.userId;
      const { status, page = 1, limit = 10 } = req.query;

      if (req.user.role !== 'supplier') {
        return errorResponse(res, 'Access denied - Supplier role required', 403);
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('auth_user_id', authUserId)
        .single();

      if (profileError || !profile) {
        return errorResponse(res, 'Supplier profile not found', 404);
      }

      const supplierProfileId = profile.id;

      const result = await PurchaseRequestModel.findBySupplier(supplierProfileId, {
        status,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      return successResponse(res, {
        requests: result.requests,
        pagination: result.pagination
      }, 'Supplier requests retrieved successfully');

    } catch (err) {
      return errorResponse(res, err.message || 'Failed to fetch requests', 500);
    }
  },

  async getProductImage(req, res) {
    try {
      const { productId } = req.params;

      const { data: product, error: productError } = await supabaseAdmin
        .from('supplier_products')
        .select('image_url')
        .eq('id', productId)
        .single();

      if (productError || !product || !product.image_url) {
        return errorResponse(res, 'Image not found', 404);
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
        return errorResponse(res, 'Failed to load image', 500);
      }

      const ext = storagePath.split('.').pop().toLowerCase();
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

module.exports = StoreController;
