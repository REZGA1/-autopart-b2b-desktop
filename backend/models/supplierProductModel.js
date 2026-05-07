/**
 * [SUPPLIER PRODUCT MODEL]
 * Handles all supplier product-related database operations
 * Uses Supabase with RLS (Row Level Security)
 * 
 * [TABLE: supplier_products]
 * - id: UUID (primary key)
 * - supplier_id: UUID (foreign key to profiles)
 * - name: VARCHAR(150) - product name
 * - serial_number: VARCHAR(100) - optional serial number
 * - part_type: VARCHAR(100) - category/type
 * - purchase_price: NUMERIC(12,2) - cost price
 * - selling_price: NUMERIC(12,2) - optional selling price
 * - description: TEXT - optional description
 * - image_url: VARCHAR(512) - optional product image
 * - quantity: INTEGER - stock quantity (default 0)
 * - minimum: INTEGER - minimum stock level
 * - product_condition: TEXT - condition of the product
 * - created_at: TIMESTAMP
 * - updated_at: TIMESTAMP
 * 
 * [VEHICLE COMPATIBILITY]
 * - supplier_product_vehicles junction table links products to vehicles
 */

const { supabaseAdmin } = require('../config/supabase');

const SUPPLIER_PRODUCTS_BUCKET = 'supplier_products';

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

const SupplierProductModel = {

  /**
   * [FIND BY SUPPLIER]
   * Main method to fetch supplier products with filters, search, and pagination
   * 
   * [PARAMETERS]
   * - supplierId: UUID of the supplier (required)
   * - options: { search, part_type, min/max_quantity, min/max_price, 
   *              vehicle_make, vehicle_model, vehicle_year, vehicle_engine,
   *              stock_alert, sort_by, sort_order, page, limit }
   */
  async findBySupplier(supplierId, options = {}) {
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
      .from('supplier_products')
      .select(`
        *,
        supplier_product_vehicles(
          vehicle:vehicles(*)
        )
      `, { count: 'exact' })
      .eq('supplier_id', supplierId);

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
      query = query.gte('purchase_price', parseFloat(min_price));
    }

    if (max_price !== undefined && max_price !== '') {
      query = query.lte('purchase_price', parseFloat(max_price));
    }

    // Vehicle filters - use subquery to get matching product IDs
    if (hasVehicleFilters) {
      console.log('[findBySupplier] Applying vehicle filters:', { vehicle_make, vehicle_model, vehicle_year, vehicle_engine });

      // First get all product IDs for this supplier
      const { data: supplierProducts, error: spError } = await supabaseAdmin
        .from('supplier_products')
        .select('id')
        .eq('supplier_id', supplierId);

      if (spError || !supplierProducts || supplierProducts.length === 0) {
        // No products for this supplier, return empty
        return {
          products: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
        };
      }

      const supplierProductIds = supplierProducts.map(p => p.id);

      // Build vehicle filter conditions
      let vehicleQuery = supabaseAdmin
        .from('supplier_product_vehicles')
        .select('supplier_product_id, vehicle:vehicles!inner(*)')
        .in('supplier_product_id', supplierProductIds);

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
      console.log('[findBySupplier] Vehicle query result:', { count: vehicleData?.length || 0, error: vehicleError?.message });

      if (vehicleError) {
        console.error('[findBySupplier] Vehicle filter error:', vehicleError);
      }

      if (!vehicleError && vehicleData) {
        const matchingProductIds = [...new Set(vehicleData.map(v => v.supplier_product_id))];
        console.log('[findBySupplier] Matching product IDs:', matchingProductIds.length);
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

    // Format products to flatten vehicle data
    let formattedProducts = (data || []).map(product => {
      const vehicles = product.supplier_product_vehicles?.map(pv => pv.vehicle).filter(Boolean) || [];
      return {
        ...product,
        vehicles,
        supplier_product_vehicles: undefined
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
  async findById(productId, supplierId = null) {
    let query = supabaseAdmin
      .from('supplier_products')
      .select(`
        *,
        supplier_product_vehicles(
          vehicle:vehicles(*)
        )
      `)
      .eq('id', productId)
      .single();

    if (supplierId) {
      query = supabaseAdmin
        .from('supplier_products')
        .select(`
          *,
          supplier_product_vehicles(
            vehicle:vehicles(*)
          )
        `)
        .eq('id', productId)
        .eq('supplier_id', supplierId)
        .single();
    }

    const { data, error } = await query;

    if (error) return null;

    // Format vehicles
    const vehicles = data.supplier_product_vehicles?.map(pv => pv.vehicle).filter(Boolean) || [];
    return {
      ...data,
      vehicles,
      supplier_product_vehicles: undefined
    };
  },

  /**
   * Create new supplier product
   */
  async create(productData) {
    const { data, error } = await supabaseAdmin
      .from('supplier_products')
      .insert(productData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update supplier product
   */
  async update(productId, supplierId, updateData) {
    const { data, error } = await supabaseAdmin
      .from('supplier_products')
      .update(updateData)
      .eq('id', productId)
      .eq('supplier_id', supplierId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete supplier product
   */
  async delete(productId, supplierId) {
    const { error } = await supabaseAdmin
      .from('supplier_products')
      .delete()
      .eq('id', productId)
      .eq('supplier_id', supplierId);

    if (error) throw error;
    return true;
  },

  /**
   * Update product image URL
   */
  async updateImage(productId, supplierId, imageUrl) {
    const { data, error } = await supabaseAdmin
      .from('supplier_products')
      .update({ image_url: imageUrl })
      .eq('id', productId)
      .eq('supplier_id', supplierId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get product image URL for deletion
   */
  async getImageUrl(productId, supplierId) {
    const { data, error } = await supabaseAdmin
      .from('supplier_products')
      .select('image_url')
      .eq('id', productId)
      .eq('supplier_id', supplierId)
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
      const path = storageObjectPathFromPublicUrl(imageUrl, SUPPLIER_PRODUCTS_BUCKET);
      if (path) {
        await supabaseAdmin.storage.from(SUPPLIER_PRODUCTS_BUCKET).remove([path]);
      }
      return true;
    } catch (error) {
      console.error('[SupplierProductModel] Failed to delete image:', error);
      return false;
    }
  },

  /**
   * Upload image to storage
   */
  async uploadImage(fileBuffer, fileName, contentType) {
    console.log('[SupplierProductModel.uploadImage] Uploading to bucket:', SUPPLIER_PRODUCTS_BUCKET, 'filename:', fileName);
    
    const { data, error } = await supabaseAdmin.storage
      .from(SUPPLIER_PRODUCTS_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error('[SupplierProductModel.uploadImage] Upload error:', error);
      throw error;
    }

    console.log('[SupplierProductModel.uploadImage] Upload successful:', data);

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(SUPPLIER_PRODUCTS_BUCKET)
      .getPublicUrl(fileName);

    console.log('[SupplierProductModel.uploadImage] Public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  },

  /**
   * Get catalog statistics
   */
  async getStats(supplierId) {
    // Total products
    const { count: totalProducts } = await supabaseAdmin
      .from('supplier_products')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplierId);

    // Total inventory value
    const { data: valueData } = await supabaseAdmin
      .from('supplier_products')
      .select('quantity, purchase_price')
      .eq('supplier_id', supplierId);

    const totalValue = valueData?.reduce((sum, p) => {
      return sum + (p.quantity * (p.purchase_price || 0));
    }, 0) || 0;

    // Low stock items
    const { data: lowStockData } = await supabaseAdmin
      .from('supplier_products')
      .select('id, quantity, minimum')
      .eq('supplier_id', supplierId)
      .lte('quantity', 0);

    // Products with vehicles (count distinct products linked to vehicles for this supplier)
    const { data: productsWithVehiclesData } = await supabaseAdmin
      .from('supplier_product_vehicles')
      .select('supplier_product_id')
      .in('supplier_product_id', 
        supabaseAdmin.from('supplier_products').select('id').eq('supplier_id', supplierId)
      );
    
    const productsWithVehicles = new Set(productsWithVehiclesData?.map(p => p.supplier_product_id)).size;

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
      supplier_product_id: productId,
      vehicle_id: vehicleId
    }));

    const { error } = await supabaseAdmin
      .from('supplier_product_vehicles')
      .insert(links);

    if (error) throw error;
  },

  /**
   * Unlink all vehicles from product
   */
  async unlinkAllVehicles(productId) {
    const { error } = await supabaseAdmin
      .from('supplier_product_vehicles')
      .delete()
      .eq('supplier_product_id', productId);

    if (error) throw error;
  }

};

module.exports = SupplierProductModel;
