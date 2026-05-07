/**
 * [PURCHASE REQUEST MODEL]
 * Handles all purchase request database operations
 * Used for merchant-supplier purchase request workflow
 * 
 * [TABLES]
 * - purchase_requests: Main request table
 *   - id, merchant_id, supplier_id, status, created_at, updated_at
 * - purchase_request_items: Items in each request
 *   - id, purchase_request_id, supplier_product_id, quantity, unit_price
 * 
 * [STATUS FLOW]
 * pending -> accepted/rejected -> fulfilled (by merchant after receiving)
 */

const { supabaseAdmin } = require('../config/supabase');
const InventoryTransactionModel = require('./inventoryTransactionModel');

const SUPPLIER_PRODUCTS_BUCKET = 'supplier_products';
const MERCHANT_PRODUCTS_BUCKET = 'Merchant_Products';

/**
 * Helper: Extract storage path from public URL
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

/**
 * Copy image from supplier_products bucket to Merchant_Products bucket
 * Returns new public URL or null if failed
 */
async function copyImageToMerchantBucket(supplierImageUrl) {
  if (!supplierImageUrl) return null;

  try {
    // Extract source path
    const sourcePath = storageObjectPathFromPublicUrl(supplierImageUrl, SUPPLIER_PRODUCTS_BUCKET);
    if (!sourcePath) {
      console.warn('[copyImageToMerchantBucket] Invalid source URL:', supplierImageUrl);
      return null;
    }

    // Generate new filename for merchant bucket
    const timestamp = Date.now();
    const fileExt = sourcePath.split('.').pop();
    const destPath = `purchase_${timestamp}.${fileExt}`;

    // Download from supplier_products
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(SUPPLIER_PRODUCTS_BUCKET)
      .download(sourcePath);

    if (downloadError) {
      console.error('[copyImageToMerchantBucket] Download error:', downloadError);
      return null;
    }

    // Upload to Merchant_Products
    const { error: uploadError } = await supabaseAdmin.storage
      .from(MERCHANT_PRODUCTS_BUCKET)
      .upload(destPath, fileData, {
        contentType: fileData.type || 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('[copyImageToMerchantBucket] Upload error:', uploadError);
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(MERCHANT_PRODUCTS_BUCKET)
      .getPublicUrl(destPath);

    console.log('[copyImageToMerchantBucket] Image copied successfully:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;

  } catch (err) {
    console.error('[copyImageToMerchantBucket] Failed to copy image:', err);
    return null;
  }
}

const PurchaseRequestModel = {

  /**
   * Get all purchase requests for a merchant
   */
  async findByMerchant(merchantId, options = {}) {
    const { status, page = 1, limit = 20 } = options;

    let query = supabaseAdmin
      .from('purchase_requests')
      .select(`
        *,
        supplier:profiles!purchase_requests_supplier_id_fkey(first_name, last_name, company_name, business_email, business_phone, avatar_url),
        items:purchase_request_items(
          id,
          quantity,
          unit_price,
          supplier_product_id,
          product_snapshot_name,
          supplier_product:supplier_products!supplier_product_id(id, name, serial_number, part_type, image_url,
            vehicles:supplier_product_vehicles!supplier_product_id(vehicle:vehicles!vehicle_id(make, model, year, trim, fuel_type, engine))
          )
        )
      `, { count: 'exact' })
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    // Debug: Log first request items to check if supplier_product has image_url
    if (data && data.length > 0 && data[0].items && data[0].items.length > 0) {
      console.log('[DEBUG] First item supplier_product:', JSON.stringify(data[0].items[0].supplier_product, null, 2));
    }

    return {
      requests: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit))
      }
    };
  },

  /**
   * Get all purchase requests for a merchant
   */
  async findByMerchant(merchantId, options = {}) {
    const { status, page = 1, limit = 20 } = options;

    let query = supabaseAdmin
      .from('purchase_requests')
      .select(`
        *,
        supplier:supplier_id (
          id,
          first_name,
          last_name,
          company_name,
          avatar_url
        ),
        items:purchase_request_items (
          *,
          product:supplier_product_id (*)
        )
      `, { count: 'exact' })
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      requests: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit))
      }
    };
  },

  /**
   * Get all purchase requests for a supplier
   * Filters by supplier_id to show only requests belonging to this supplier
   */
  async findBySupplier(supplierId, options = {}) {
    const { status, page = 1, limit = 20 } = options;

    console.log('[findBySupplier] Starting query for supplierId:', supplierId, 'status:', status);

    // First: Simple query without joins to check if data exists
    let simpleQuery = supabaseAdmin
      .from('purchase_requests')
      .select('*')
      .eq('supplier_id', supplierId);
    
    if (status) {
      simpleQuery = simpleQuery.eq('status', status);
    }

    const { data: simpleData, error: simpleError } = await simpleQuery;
    console.log('[findBySupplier] Simple query result:', { count: simpleData?.length, error: simpleError?.message });

    // Second: Full query with joins
    let query = supabaseAdmin
      .from('purchase_requests')
      .select(`
        *,
        merchant:profiles!purchase_requests_merchant_id_fkey(first_name, last_name, company_name, business_email, business_phone),
        items:purchase_request_items(
          id,
          quantity,
          unit_price,
          supplier_product_id,
          product_snapshot_name,
          supplier_product:supplier_products!supplier_product_id(id, name, serial_number, part_type, image_url, description, product_condition)
        )
      `, { count: 'exact' })
      .eq('supplier_id', supplierId);

    if (status) {
      query = query.eq('status', status);
    }

    // Order by newest first
    query = query.order('created_at', { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    console.log('[findBySupplier] Full query result:', { 
      dataLength: data?.length, 
      count, 
      supplierId,
      error: error?.message 
    });

    if (error) {
      console.error('[findBySupplier] Error:', error);
      throw error;
    }

    console.log('[findBySupplier] Found:', data?.length || 0, 'requests for supplier:', supplierId);

    return {
      requests: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit))
      }
    };
  },

  /**
   * Get single purchase request by ID with full details
   */
  async findById(requestId, userId, role) {
    const query = supabaseAdmin
      .from('purchase_requests')
      .select(`
        *,
        merchant:profiles!purchase_requests_merchant_id_fkey(first_name, last_name, company_name, business_email, business_phone),
        supplier:profiles!purchase_requests_supplier_id_fkey(first_name, last_name, company_name, business_email, business_phone),
        items:purchase_request_items(
          id,
          quantity,
          unit_price,
          supplier_product_id,
          supplier_product:supplier_products(name, serial_number, part_type, image_url, description, product_condition)
        )
      `)
      .eq('id', requestId)
      .single();

    const { data, error } = await query;

    if (error) throw error;

    // Verify access based on role
    if (role === 'merchant' && data.merchant_id !== userId) {
      throw new Error('Access denied');
    }
    if (role === 'supplier' && data.supplier_id !== userId) {
      throw new Error('Access denied');
    }

    return data;
  },

  /**
   * Create new purchase request
   */
  async create({ merchantId, supplierId, items }) {
    // Start a transaction using RPC
    const { data: request, error: requestError } = await supabaseAdmin
      .from('purchase_requests')
      .insert({
        merchant_id: merchantId,
        supplier_id: supplierId,
        status: 'pending'
      })
      .select()
      .single();

    if (requestError) throw requestError;

    // Insert items
    if (items && items.length > 0) {
      const itemsData = items.map(item => ({
        purchase_request_id: request.id,
        supplier_product_id: item.supplier_product_id,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price),
        product_snapshot_name: item.product_name || 'Unknown Product'
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('purchase_request_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;
    }

    return request;
  },

  /**
   * Update purchase request status
   */
  async updateStatus(requestId, status, userId, role) {
    console.log('[updateStatus] Input:', { requestId, status, userId, role });

    // Get current request
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('purchase_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      console.error('[updateStatus] Fetch error:', fetchError);
      throw fetchError;
    }

    console.log('[updateStatus] Current request:', current);

    // Verify access
    if (role === 'merchant' && current.merchant_id !== userId) {
      console.error('[updateStatus] Access denied: merchant_id mismatch', { expected: current.merchant_id, got: userId });
      throw new Error('Access denied');
    }
    if (role === 'supplier' && current.supplier_id !== userId) {
      console.error('[updateStatus] Access denied: supplier_id mismatch', { expected: current.supplier_id, got: userId });
      throw new Error('Access denied');
    }

    // Validate status transitions based on role and current status
    // Rules:
    // - Pending: Merchant can DELETE, Supplier can ACCEPT/REJECT
    // - Accepted: Merchant can FULFILL/CANCEL, Supplier can only CANCEL
    // - Fulfilled: FINAL state (no changes)
    // - Cancelled: Final state (no changes)
    // - Only Merchant can delete, and only when PENDING
    const validTransitions = {
      merchant: {
        accepted: ['fulfilled', 'cancelled']  // Merchant can fulfill or cancel accepted requests
      },
      supplier: {
        pending: ['accepted', 'rejected'],     // Supplier can accept/reject pending
        accepted: ['cancelled']                // Supplier can only cancel after accepting
      }
    };

    const allowedStatuses = validTransitions[role]?.[current.status] || [];
    console.log('[updateStatus] Transition check:', { currentStatus: current.status, targetStatus: status, role, allowedStatuses });
    if (!allowedStatuses.includes(status)) {
      console.error('[updateStatus] Invalid transition:', { current: current.status, target: status, role, allowed: allowedStatuses });
      throw new Error(`Cannot transition from ${current.status} to ${status} as ${role}`);
    }

    // Use direct update with supabaseAdmin (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('purchase_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('[updateStatus] Update error:', error);
      throw error;
    }

    return data;
  },

  /**
   * Delete purchase request (only pending or rejected)
   */
  async delete(requestId, merchantId) {
    // Get current request
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('purchase_requests')
      .select('*')
      .eq('id', requestId)
      .eq('merchant_id', merchantId)
      .single();

    if (fetchError) throw fetchError;

    // Only allow deletion of pending or rejected requests
    if (!['pending', 'rejected'].includes(current.status)) {
      throw new Error('Can only delete pending or rejected requests');
    }

    // Delete items first (cascade should handle this, but be explicit)
    const { error: itemsError } = await supabaseAdmin
      .from('purchase_request_items')
      .delete()
      .eq('purchase_request_id', requestId);

    if (itemsError) throw itemsError;

    // Delete request
    const { error } = await supabaseAdmin
      .from('purchase_requests')
      .delete()
      .eq('id', requestId)
      .eq('merchant_id', merchantId);

    if (error) throw error;

    return true;
  },

  /**
   * Check if product exists in merchant inventory
   * Match by: name, serial_number, part_type, description, product_condition, vehicles (make, model, year, trim, fuel_type, engine)
   * Ignore: quantity, purchase_price, image_url, minimum (can be different)
   * Same product with different vehicle attributes = different product
   */
  async findMerchantProduct(merchantId, supplierProduct, supplierVehicleIds) {
    // Get supplier vehicles with full details
    let supplierVehicles = [];
    if (supplierVehicleIds && supplierVehicleIds.length > 0) {
      const { data: vehicles } = await supabaseAdmin
        .from('vehicles')
        .select('make, model, year, trim, fuel_type, engine')
        .in('id', supplierVehicleIds);
      supplierVehicles = vehicles || [];
    }

    // Find matching products by name and serial
    const { data: existingProducts, error } = await supabaseAdmin
      .from('products')
      .select('*, merchant_vehicles(vehicle_id, vehicle:vehicles(make, model, year, trim, fuel_type, engine))')
      .eq('merchant_id', merchantId)
      .eq('name', supplierProduct.name)
      .eq('serial_number', supplierProduct.serial_number || null);

    if (error || !existingProducts || existingProducts.length === 0) {
      return null;
    }

    // Check for exact match (excluding quantity, purchase_price, image_url, minimum)
    for (const product of existingProducts) {
      // Get product vehicles from merchant_vehicles table
      const productVehicles = (product.merchant_vehicles || [])
        .map(pv => pv.vehicle)
        .filter(Boolean);

      // Check vehicle compatibility match by attributes
      if (!this.vehiclesMatch(supplierVehicles, productVehicles)) {
        continue; // Different vehicles = different product
      }

      // Check if all relevant specs match (excluding quantity, purchase_price, image, minimum)
      const specsMatch =
        product.part_type === supplierProduct.part_type &&
        product.description === supplierProduct.description &&
        product.product_condition === supplierProduct.product_condition;

      if (specsMatch) {
        return product;
      }
    }

    return null;
  },

  /**
   * Compare two arrays of vehicles by their attributes
   * Returns true if vehicles match exactly (same count, same attributes for each)
   */
  vehiclesMatch(supplierVehicles, productVehicles) {
    // Different count = different compatibility
    if (supplierVehicles.length !== productVehicles.length) {
      return false;
    }

    if (supplierVehicles.length === 0 && productVehicles.length === 0) {
      return true; // Both have no vehicles
    }

    // Sort both arrays consistently for comparison
    const sortVehicles = (v) => {
      return [...v].sort((a, b) => {
        const keyA = `${a.make}|${a.model}|${a.year}|${a.trim || ''}|${a.fuel_type || ''}|${a.engine || ''}`;
        const keyB = `${b.make}|${b.model}|${b.year}|${b.trim || ''}|${b.fuel_type || ''}|${b.engine || ''}`;
        return keyA.localeCompare(keyB);
      });
    };

    const sortedSupplier = sortVehicles(supplierVehicles);
    const sortedProduct = sortVehicles(productVehicles);

    // Compare each vehicle's attributes
    for (let i = 0; i < sortedSupplier.length; i++) {
      const sv = sortedSupplier[i];
      const pv = sortedProduct[i];

      if (
        sv.make !== pv.make ||
        sv.model !== pv.model ||
        sv.year !== pv.year ||
        sv.trim !== pv.trim ||
        sv.fuel_type !== pv.fuel_type ||
        sv.engine !== pv.engine
      ) {
        return false; // Any attribute differs = different vehicle
      }
    }

    return true;
  },

  /**
   * Add or update merchant product from fulfilled purchase request
   * Also decreases quantity from supplier_products
   */
  async fulfillAndAddToInventory(requestId, merchantId, userId) {
    // Get purchase request with supplier info
    const { data: purchaseRequest, error: requestError } = await supabaseAdmin
      .from('purchase_requests')
      .select('*, supplier:profiles!purchase_requests_supplier_id_fkey(first_name, last_name, company_name)')
      .eq('id', requestId)
      .single();

    if (requestError) throw requestError;

    const supplierId = purchaseRequest?.supplier_id || null;
    const supplierProfile = purchaseRequest?.supplier;
    const supplierName = supplierProfile?.company_name 
      || (supplierProfile?.first_name && supplierProfile?.last_name 
        ? `${supplierProfile.first_name} ${supplierProfile.last_name}`
        : null) 
      || 'External supplier';

    console.log(`[fulfillAndAddToInventory] Supplier: ${supplierName} (${supplierId || 'null'})`);

    // Get request items with supplier product details
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('purchase_request_items')
      .select(`
        *,
        supplier_product:supplier_products(*)
      `)
      .eq('purchase_request_id', requestId);

    if (itemsError) throw itemsError;

    const results = [];

    for (const item of items || []) {
      const supplierProduct = item.supplier_product;

      // 1. Decrease quantity from supplier_products
      const newSupplierQuantity = supplierProduct.quantity - item.quantity;
      const { error: supplierUpdateError } = await supabaseAdmin
        .from('supplier_products')
        .update({
          quantity: newSupplierQuantity >= 0 ? newSupplierQuantity : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.supplier_product_id);

      if (supplierUpdateError) throw supplierUpdateError;

      // Get vehicles for this supplier product from supplier_product_vehicles
      const { data: vehicleLinks, error: vError } = await supabaseAdmin
        .from('supplier_product_vehicles')
        .select('vehicle_id')
        .eq('supplier_product_id', item.supplier_product_id);

      if (vError) throw vError;

      const vehicleIds = (vehicleLinks || []).map(v => v.vehicle_id);
      console.log(`[fulfillAndAddToInventory] Found ${vehicleIds.length} vehicles for supplier product ${item.supplier_product_id}:`, vehicleIds);

      // 2. Check if product already exists with same specs (excluding quantity, purchase_price, image, minimum)
      const existingProduct = await this.findMerchantProduct(
        merchantId,
        supplierProduct,
        vehicleIds
      );

      // Copy image from supplier to merchant bucket (for both new and existing products)
      const merchantImageUrl = await copyImageToMerchantBucket(supplierProduct.image_url);

      if (existingProduct) {
        // 3a. Update existing product: add quantity, update purchase_price, keep selling_price, copy new image, set supplier
        const updateData = {
          quantity: existingProduct.quantity + item.quantity,
          purchase_price: item.unit_price, // Update to new purchase price
          supplier_id: supplierId,
          updated_at: new Date().toISOString()
        };

        // Update image URL if successfully copied
        if (merchantImageUrl) {
          updateData.image_url = merchantImageUrl;
        }

        const { data: updated, error: updateError } = await supabaseAdmin
          .from('products')
          .update(updateData)
          .eq('id', existingProduct.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Ensure vehicles are linked in merchant_vehicles table
        if (vehicleIds.length > 0) {
          // Get existing vehicle links for this merchant product
          const { data: existingLinks } = await supabaseAdmin
            .from('merchant_vehicles')
            .select('vehicle_id')
            .eq('product_id', existingProduct.id);

          const existingVehicleIds = (existingLinks || []).map(l => l.vehicle_id);
          console.log(`[fulfillAndAddToInventory] Existing vehicles for product ${existingProduct.id}:`, existingVehicleIds);

          // Add only missing vehicle links
          const missingVehicleIds = vehicleIds.filter(vid => !existingVehicleIds.includes(vid));

          if (missingVehicleIds.length > 0) {
            const newVehicleLinksData = missingVehicleIds.map(vid => ({
              product_id: existingProduct.id,
              vehicle_id: vid
            }));

            console.log(`[fulfillAndAddToInventory] Adding ${missingVehicleIds.length} missing vehicles to product ${existingProduct.id}:`, missingVehicleIds);

            const { error: linkError } = await supabaseAdmin
              .from('merchant_vehicles')
              .insert(newVehicleLinksData);

            if (linkError) {
              console.error('[fulfillAndAddToInventory] Error linking vehicles:', linkError);
              throw linkError;
            }
          }
        }

        // Create inventory transaction for the added quantity
        try {
          await InventoryTransactionModel.create({
            product_id: updated.id,
            merchant_id: merchantId,
            change: item.quantity,
            reason: `buying`,
            created_by: userId
          });
          console.log(`[fulfillAndAddToInventory] Transaction created for existing product ${updated.id}: +${item.quantity}`);
        } catch (txError) {
          console.error('[fulfillAndAddToInventory] Failed to create transaction:', txError);
        }

        results.push({ action: 'updated', product: updated });
      } else {
        // 3b. Create new product with selling_price = 1 (merchant must set their own price)
        const productData = {
          merchant_id: merchantId,
          name: supplierProduct.name,
          serial_number: supplierProduct.serial_number,
          part_type: supplierProduct.part_type,
          purchase_price: item.unit_price,
          selling_price: 1, // Default 1 dinar, merchant must update
          description: supplierProduct.description,
          product_condition: supplierProduct.product_condition,
          quantity: item.quantity,
          minimum: 0,
          supplier_id: supplierId // Link to supplier
        };

        // Add image URL if successfully copied
        if (merchantImageUrl) {
          productData.image_url = merchantImageUrl;
        }

        const { data: newProduct, error: createError } = await supabaseAdmin
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (createError) throw createError;

        // Link vehicles to new product in merchant_vehicles table
        if (vehicleIds.length > 0) {
          const vehicleLinksData = vehicleIds.map(vid => ({
            product_id: newProduct.id,
            vehicle_id: vid
          }));

          console.log(`[fulfillAndAddToInventory] Linking ${vehicleIds.length} vehicles to new product ${newProduct.id}:`, vehicleIds);

          const { error: linkError } = await supabaseAdmin
            .from('merchant_vehicles')
            .insert(vehicleLinksData);

          if (linkError) {
            console.error('[fulfillAndAddToInventory] Error linking vehicles to new product:', linkError);
            throw linkError;
          }
        }

        // Create inventory transaction for the initial quantity
        try {
          await InventoryTransactionModel.create({
            product_id: newProduct.id,
            merchant_id: merchantId,
            change: item.quantity,
            reason: `buying`,
            created_by: userId
          });
          console.log(`[fulfillAndAddToInventory] Transaction created for new product ${newProduct.id}: +${item.quantity}`);
        } catch (txError) {
          console.error('[fulfillAndAddToInventory] Failed to create transaction:', txError);
        }

        results.push({ action: 'created', product: newProduct });
      }
    }

    return results;
  }

};

module.exports = PurchaseRequestModel;
