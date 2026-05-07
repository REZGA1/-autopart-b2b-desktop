/**
 * [PRODUCT MODEL]
 * Handles all product-related database operations
 * Uses Supabase with RLS (Row Level Security)
 * 
 * [VEHICLE FILTERING STRATEGY]
 * - Without vehicle filters: Uses standard Supabase query with joins
 * - With vehicle filters: Uses PostgreSQL RPC function for accurate filtering
 *   (required because Supabase ORM has limitations with junction table filtering)
 */

const { supabaseAdmin } = require('../config/supabase');

const PRODUCTS_BUCKET = 'Merchant_Products';

/**
 * Helper: Extract storage path from public URL
 * Used for deleting images from Supabase Storage
 */
function storageObjectPathFromPublicUrl(publicUrl, bucket) {
  if (!publicUrl || typeof publicUrl !== 'string') return null;
  const prefix = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(prefix);
  if (idx === -1) return null;
  try {
    return decodeURIComponent(
      publicUrl.slice(idx + prefix.length).split('?')[0]
    );
  } catch {
    return null;
  }
}

const ProductModel = {

  /**
   * [FIND BY MERCHANT]
   * Main method to fetch products with filters, search, and pagination
   * 
   * [PARAMETERS]
   * - merchantId: UUID of the merchant (required)
   * - options: { search, part_type, min/max_quantity, min/max_price, 
   *              vehicle_make, vehicle_model, vehicle_year, vehicle_engine,
   *              stock_alert, sort_by, sort_order, page, limit }
   * 
   * [VEHICLE FILTERS]
   * When vehicle_* params are provided, uses PostgreSQL function get_products_by_vehicle()
   * for accurate filtering through the merchant_vehicles junction table
   */
  async findByMerchant(merchantId, options = {}) {
    const {
      search,
      part_type,
      product_condition,
      min_quantity,
      max_quantity,
      min_price,
      max_price,
      serial_number,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_engine,
      stock_alert,
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      limit = 20
    } = options;

    // Check if vehicle filters are present
    const hasVehicleFilters = vehicle_make || vehicle_model || vehicle_year || vehicle_engine;

    // Standard query
    let query = supabaseAdmin
      .from('products')
      .select(`
        *,
        merchant_vehicles(
          vehicle:vehicles(*)
        ),
        supplier:profiles!products_supplier_id_fkey(id, first_name, last_name, company_name)
      `, { count: 'exact' })
      .eq('merchant_id', merchantId);

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,serial_number.ilike.%${search}%`);
    }

    if (part_type) {
      query = query.eq('part_type', part_type);
    }

    if (product_condition) {
      query = query.eq('product_condition', product_condition);
    }

    if (serial_number) {
      query = query.ilike('serial_number', `%${serial_number}%`);
    }

    if (min_quantity !== undefined && min_quantity !== '') {
      query = query.gte('quantity', parseInt(min_quantity));
    }

    if (max_quantity !== undefined && max_quantity !== '') {
      query = query.lte('quantity', parseInt(max_quantity));
    }

    if (min_price !== undefined && min_price !== '') {
      query = query.gte('selling_price', parseFloat(min_price));
    }

    if (max_price !== undefined && max_price !== '') {
      query = query.lte('selling_price', parseFloat(max_price));
    }

    // Vehicle filters - use subquery to get matching product IDs
    if (hasVehicleFilters) {
      console.log('[findByMerchant] Applying vehicle filters:', { vehicle_make, vehicle_model, vehicle_year, vehicle_engine });

      // First get all product IDs for this merchant
      const { data: merchantProducts, error: mpError } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('merchant_id', merchantId);

      if (mpError || !merchantProducts || merchantProducts.length === 0) {
        // No products for this merchant, return empty
        return {
          products: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
        };
      }

      const merchantProductIds = merchantProducts.map(p => p.id);

      // Build vehicle filter conditions
      let vehicleQuery = supabaseAdmin
        .from('merchant_vehicles')
        .select('product_id, vehicle:vehicles!inner(*)')
        .in('product_id', merchantProductIds);

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
      console.log('[findByMerchant] Vehicle query result:', { count: vehicleData?.length || 0, error: vehicleError?.message });

      if (vehicleError) {
        console.error('[findByMerchant] Vehicle filter error:', vehicleError);
      }

      if (!vehicleError && vehicleData) {
        const matchingProductIds = [...new Set(vehicleData.map(v => v.product_id))];
        console.log('[findByMerchant] Matching product IDs:', matchingProductIds.length);
        if (matchingProductIds.length > 0) {
          query = query.in('id', matchingProductIds);
        } else {
          // No matching products, return empty result
          return {
            products: [],
            pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
          };
        }
      }
    }

    // Sorting
    if (sort_by === 'stock_ratio') {
      // Sort by quantity ascending (low stock first)
      query = query.order('quantity', { ascending: true });
    } else {
      query = query.order(sort_by, { ascending: sort_order === 'asc' });
    }

    // Pagination (skip if stock_alert filter - will handle manually)
    if (!stock_alert) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Format products to flatten vehicle data and supplier info
    let formattedProducts = (data || []).map(product => {
      const vehicles = product.merchant_vehicles?.map(mv => mv.vehicle).filter(Boolean) || [];
      
      // Format supplier name - priority: full name > company_name > Unknown/External
      const supplierProfile = product.supplier;
      const supplier_name = (supplierProfile?.first_name && supplierProfile?.last_name
          ? `${supplierProfile.first_name} ${supplierProfile.last_name}`
          : null)
        || supplierProfile?.company_name
        || (product.supplier_id ? 'Unknown Supplier' : 'External');
      
      return {
        ...product,
        vehicles,
        supplier_name,
        merchant_vehicles: undefined,
        supplier: undefined
      };
    });

    // Apply stock_alert filter in JS (since Supabase can't compare column to column)
    if (stock_alert) {
      if (stock_alert === 'low') {
        formattedProducts = formattedProducts.filter(p => p.quantity < p.minimum);
      } else if (stock_alert === 'critical') {
        formattedProducts = formattedProducts.filter(p => p.quantity === 0);
      }
      // Manual pagination after filtering
      const total = formattedProducts.length;
      const from = (page - 1) * limit;
      const to = from + limit;
      formattedProducts = formattedProducts.slice(from, to);
      return {
        products: formattedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      };
    }

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

  /**
   * Find single product by ID
   */
  async findById(productId, merchantId = null) {
    let query = supabaseAdmin
      .from('products')
      .select(`
        *,
        merchant_vehicles(
          vehicle:vehicles(*)
        ),
        supplier:profiles!products_supplier_id_fkey(id, first_name, last_name, company_name)
      `)
      .eq('id', productId)
      .single();

    if (merchantId) {
      query = supabaseAdmin
        .from('products')
        .select(`
          *,
          merchant_vehicles(
            vehicle:vehicles(*)
          ),
          supplier:profiles!products_supplier_id_fkey(id, first_name, last_name, company_name)
        `)
        .eq('id', productId)
        .eq('merchant_id', merchantId)
        .single();
    }

    const { data, error } = await query;

    if (error) return null;

    // Format vehicles and supplier
    const vehicles = data.merchant_vehicles?.map(mv => mv.vehicle).filter(Boolean) || [];
    
    const supplierProfile = data.supplier;
    const supplier_name = (supplierProfile?.first_name && supplierProfile?.last_name
        ? `${supplierProfile.first_name} ${supplierProfile.last_name}`
        : null)
      || supplierProfile?.company_name
      || (data.supplier_id ? 'Unknown Supplier' : 'External');
    
    return {
      ...data,
      vehicles,
      supplier_name,
      merchant_vehicles: undefined,
      supplier: undefined
    };
  },

  /**
   * Create new product
   */
  async create(productData) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update product
   */
  async update(productId, merchantId, updateData) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .eq('merchant_id', merchantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete product
   */
  async delete(productId, merchantId) {
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('merchant_id', merchantId);

    if (error) throw error;
    return true;
  },

  /**
   * Update product image URL
   */
  async updateImage(productId, merchantId, imageUrl) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ image_url: imageUrl })
      .eq('id', productId)
      .eq('merchant_id', merchantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get product image URL for deletion
   */
  async getImageUrl(productId, merchantId) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('image_url')
      .eq('id', productId)
      .eq('merchant_id', merchantId)
      .single();

    if (error || !data) return null;
    return data.image_url;
  },

  /**
   * Delete image from storage
   */
  async deleteImageFromStorage(imageUrl) {
    if (!imageUrl) return false;
    
    try {
      const path = storageObjectPathFromPublicUrl(imageUrl, PRODUCTS_BUCKET);
      if (path) {
        await supabaseAdmin.storage.from(PRODUCTS_BUCKET).remove([path]);
      }
      return true;
    } catch (error) {
      console.error('[ProductModel] Failed to delete image:', error);
      return false;
    }
  },

  /**
   * Upload image to storage
   */
  async uploadImage(fileBuffer, fileName, contentType) {
    console.log('[ProductModel.uploadImage] Uploading to bucket:', PRODUCTS_BUCKET, 'filename:', fileName);
    
    const { data, error } = await supabaseAdmin.storage
      .from(PRODUCTS_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error('[ProductModel.uploadImage] Upload error:', error);
      throw error;
    }

    console.log('[ProductModel.uploadImage] Upload successful:', data);

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(PRODUCTS_BUCKET)
      .getPublicUrl(fileName);

    console.log('[ProductModel.uploadImage] Public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  },

  /**
   * Get inventory statistics
   */
  async getStats(merchantId) {
    // Total products
    const { count: totalProducts } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchantId);

    // Total inventory value
    const { data: valueData } = await supabaseAdmin
      .from('products')
      .select('quantity, purchase_price')
      .eq('merchant_id', merchantId);

    const totalValue = valueData?.reduce((sum, p) => {
      return sum + (p.quantity * (p.purchase_price || 0));
    }, 0) || 0;

    // Low stock items (using minimum column)
    const { data: lowStockData } = await supabaseAdmin
      .from('products')
      .select('id, quantity, minimum')
      .eq('merchant_id', merchantId)
      .lte('quantity', supabaseAdmin.rpc('coalesce', { val1: 'minimum', val2: 0 }));

    // Products with vehicles
    const { count: productsWithVehicles } = await supabaseAdmin
      .from('merchant_vehicles')
      .select('product_id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId);

    return {
      totalProducts: totalProducts || 0,
      totalValue,
      lowStockCount: lowStockData?.length || 0,
      productsWithVehicles: productsWithVehicles || 0
    };
  },

  /**
   * Link vehicles to product
   */
  async linkVehicles(productId, vehicleIds) {
    if (!vehicleIds || vehicleIds.length === 0) return;

    const links = vehicleIds.map(vehicleId => ({
      product_id: productId,
      vehicle_id: vehicleId
    }));

    const { error } = await supabaseAdmin
      .from('merchant_vehicles')
      .insert(links);

    if (error) throw error;
  },

  /**
   * Unlink all vehicles from product
   */
  async unlinkAllVehicles(productId, merchantId) {
    // First get merchant_id from product to verify ownership
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('merchant_id')
      .eq('id', productId)
      .single();

    if (!product || product.merchant_id !== merchantId) {
      throw new Error('Product not found or access denied');
    }

    const { error } = await supabaseAdmin
      .from('merchant_vehicles')
      .delete()
      .eq('product_id', productId);

    if (error) throw error;
  }

};

module.exports = ProductModel;
