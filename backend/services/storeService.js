const { supabaseAdmin } = require('../config/supabase');
const PurchaseRequestModel = require('../repositories/purchaseRequestRepository');
const MerchantModel = require('../repositories/merchantRepository');

const StoreService = {
  async getMerchantId(userId) {
    const merchant = await MerchantModel.findByAuthUserId(userId);
    if (!merchant?.id) {
      const err = new Error('Merchant profile not found');
      err.status = 404;
      throw err;
    }
    return merchant.id;
  },

  async getSupplierProducts(userId, queryParams) {
    const merchantId = await this.getMerchantId(userId);

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
    } = queryParams;

    const { data: validatedSuppliers, error: supplierError } = await supabaseAdmin
      .from('profiles')
      .select('id, company_name, first_name, last_name')
      .eq('role', 'supplier')
      .eq('validated', true);

    if (supplierError) throw supplierError;

    const validatedSupplierIds = (validatedSuppliers || []).map(s => s.id);
    if (validatedSupplierIds.length === 0) {
      return {
        products: [],
        pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
      };
    }

    let filteredSupplierIds = validatedSupplierIds;
    if (supplier_name) {
      const matchingSuppliers = (validatedSuppliers || []).filter(s =>
        (s.company_name && s.company_name.toLowerCase().includes(supplier_name.toLowerCase())) ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(supplier_name.toLowerCase())
      );
      filteredSupplierIds = matchingSuppliers.map(s => s.id);
      if (filteredSupplierIds.length === 0) {
        return {
          products: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
        };
      }
    }

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

    if (supplier_id) query = query.eq('supplier_id', supplier_id);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,serial_number.ilike.%${search}%`);
    if (part_type) query = query.eq('part_type', part_type);
    if (product_condition) query = query.eq('product_condition', product_condition);
    if (is_available === 'true') query = query.gt('quantity', 0);
    else if (is_available === 'false') query = query.lte('quantity', 0);
    if (min_price !== undefined && min_price !== '') query = query.gte('selling_price', parseFloat(min_price));
    if (max_price !== undefined && max_price !== '') query = query.lte('selling_price', parseFloat(max_price));

    if (vehicle_make || vehicle_model || vehicle_year || vehicle_engine) {
      const { data: supplierProductIds, error: spError } = await supabaseAdmin
        .from('supplier_products')
        .select('id')
        .in('supplier_id', filteredSupplierIds);

      if (spError || !supplierProductIds || supplierProductIds.length === 0) {
        return {
          products: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
        };
      }

      const productIds = supplierProductIds.map(p => p.id);
      let vehicleQuery = supabaseAdmin
        .from('supplier_product_vehicles')
        .select('supplier_product_id, vehicle:vehicles!inner(make, model, year, engine)')
        .in('supplier_product_id', productIds);

      if (vehicle_make) vehicleQuery = vehicleQuery.ilike('vehicles.make', `%${vehicle_make}%`);
      if (vehicle_model) vehicleQuery = vehicleQuery.ilike('vehicles.model', `%${vehicle_model}%`);
      if (vehicle_year) vehicleQuery = vehicleQuery.eq('vehicles.year', parseInt(vehicle_year));
      if (vehicle_engine) vehicleQuery = vehicleQuery.ilike('vehicles.engine', `%${vehicle_engine}%`);

      const { data: vehicleData } = await vehicleQuery;
      if (vehicleData) {
        const vehicleFilteredProductIds = [...new Set(vehicleData.map(v => v.supplier_product_id))];
        if (vehicleFilteredProductIds.length === 0) {
          return {
            products: [],
            pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
          };
        }
        query = query.in('id', vehicleFilteredProductIds);
      }
    }

    const validSortColumns = ['created_at', 'name', 'selling_price', 'quantity'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    query = query.order(sortColumn, { ascending: sort_order === 'asc' });

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

    return {
      products: formattedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit))
      }
    };
  },

  async getSupplierProductById(productId, userId) {
    await this.getMerchantId(userId);

    const { data: product, error: productError } = await supabaseAdmin
      .from('supplier_products')
      .select(`
        *,
        supplier:profiles!supplier_products_supplier_id_fkey(id, company_name, first_name, last_name, business_email, business_phone, avatar_url, online_status)
      `)
      .eq('id', productId)
      .single();

    if (productError || !product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    const { data: supplierProfile, error: supplierCheckError } = await supabaseAdmin
      .from('profiles')
      .select('validated')
      .eq('id', product.supplier_id)
      .single();

    if (supplierCheckError || !supplierProfile?.validated) {
      const err = new Error('Product not available');
      err.status = 404;
      throw err;
    }

    const { data: vehicleLinks } = await supabaseAdmin
      .from('supplier_product_vehicles')
      .select('vehicle:vehicles(*)')
      .eq('supplier_product_id', productId);

    const vehicles = (vehicleLinks || []).map(link => link.vehicle).filter(Boolean);
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
      supplier_online: product.supplier?.online_status === true,
      supplier_email: product.supplier?.business_email,
      supplier_phone: product.supplier?.business_phone,
      vehicles
    };
  },

  async getPurchaseRequests(userId, { status, page = 1, limit = 20 }) {
    const merchantId = await this.getMerchantId(userId);
    return PurchaseRequestModel.findByMerchant(merchantId, {
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  },

  async createPurchaseRequest(userId, { supplier_id, items }) {
    const merchantId = await this.getMerchantId(userId);

    if (!supplier_id) {
      const err = new Error('Supplier ID is required');
      err.status = 400;
      throw err;
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      const err = new Error('At least one item is required');
      err.status = 400;
      throw err;
    }

    for (const item of items) {
      if (!item.supplier_product_id) {
        const err = new Error('Supplier product ID is required for all items');
        err.status = 400;
        throw err;
      }
      if (!item.quantity || parseInt(item.quantity) <= 0) {
        const err = new Error('Valid quantity is required for all items');
        err.status = 400;
        throw err;
      }
      if (item.unit_price === undefined || parseFloat(item.unit_price) < 0) {
        const err = new Error('Valid unit price is required for all items');
        err.status = 400;
        throw err;
      }

      const { data: product, error: productError } = await supabaseAdmin
        .from('supplier_products')
        .select('quantity, name')
        .eq('id', item.supplier_product_id)
        .single();

      if (productError || !product) {
        const err = new Error(`Product not found for item: ${item.supplier_product_id}`);
        err.status = 404;
        throw err;
      }

      const requestedQuantity = parseInt(item.quantity);
      if (requestedQuantity > product.quantity) {
        const err = new Error(`Insufficient stock for "${product.name}". Please request a smaller quantity.`);
        err.status = 400;
        throw err;
      }
    }

    return PurchaseRequestModel.create({
      merchantId,
      supplierId: supplier_id,
      items: items.map(item => ({
        supplier_product_id: item.supplier_product_id,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price),
        product_name: item.product_name
      }))
    });
  },

  async updatePurchaseRequestStatus(requestId, status, authUserId, userRole) {
    if (!status) {
      const err = new Error('Status is required');
      err.status = 400;
      throw err;
    }
    if (!['pending', 'accepted', 'rejected', 'fulfilled', 'cancelled'].includes(status)) {
      const err = new Error('Invalid status');
      err.status = 400;
      throw err;
    }

    let profileId;
    if (userRole === 'merchant') {
      profileId = await this.getMerchantId(authUserId);
    } else if (userRole === 'supplier') {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('auth_user_id', authUserId)
        .single();
      profileId = profile?.id;
      if (!profileId) {
        const err = new Error('Supplier profile not found');
        err.status = 404;
        throw err;
      }
    } else {
      const err = new Error('Invalid role');
      err.status = 403;
      throw err;
    }

    return PurchaseRequestModel.updateStatus(requestId, status, profileId, userRole);
  },

  async fulfillRequest(requestId, userId) {
    const merchantId = await this.getMerchantId(userId);

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

    return { request: updated, inventory: inventoryResults };
  },

  async deletePurchaseRequest(requestId, userId) {
    const merchantId = await this.getMerchantId(userId);
    await PurchaseRequestModel.delete(requestId, merchantId);
    return true;
  },

  async getSuppliers(userId) {
    await this.getMerchantId(userId);
    const { data: suppliers, error } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, company_name, business_email, business_phone, created_at')
      .eq('role', 'supplier')
      .eq('validated', true)
      .order('company_name');

    if (error) throw error;
    return suppliers || [];
  },

  async getSupplierPurchaseRequests(authUserId, userRole, { status, page = 1, limit = 10 }) {
    if (userRole !== 'supplier') {
      const err = new Error('Access denied - Supplier role required');
      err.status = 403;
      throw err;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (profileError || !profile) {
      const err = new Error('Supplier profile not found');
      err.status = 404;
      throw err;
    }

    return PurchaseRequestModel.findBySupplier(profile.id, {
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });
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

module.exports = StoreService;
