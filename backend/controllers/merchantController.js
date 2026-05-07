const { supabaseAdmin } = require('../config/supabase');
const { successResponse, errorResponse } = require('../utils/response');

// Storage bucket names
const PROFILES_BUCKET = 'profiles-documents';
const AVATARS_BUCKET = 'avatars';

/**
 * Helper: Detect which bucket a URL belongs to
 */
function getBucketFromUrl(url) {
  if (!url) return PROFILES_BUCKET;
  if (url.includes('/avatars/') || url.includes('/object/public/avatars/')) {
    return AVATARS_BUCKET;
  }
  return PROFILES_BUCKET;
}

/**
 * Helper: Generate a signed URL for Supabase storage (more reliable than public URLs)
 * Signed URLs work even when RLS policies restrict public access
 */
async function ensurePublicUrl(url) {
  if (!url) return null;

  // If it's already a full URL with token, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Check if it already has a token (signed URL)
    if (url.includes('?token=') || url.includes('?t=')) {
      return url;
    }
    // Extract path from public URL and create signed URL instead
    try {
      const urlObj = new URL(url);
      // Match pattern: /storage/v1/object/public/{bucket}/{path}
      const pathMatch = urlObj.pathname.match(/\/object\/public\/([^/]+)\/(.+)/);
      if (pathMatch) {
        const bucket = pathMatch[1];
        const path = decodeURIComponent(pathMatch[2]);

        // Create signed URL with the correct bucket
        const { data: signedData, error } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, 86400); // 24 hours expiry

        if (error) {
          console.error(`[ensurePublicUrl] Signed URL creation failed for ${bucket}:`, error);
          // Fallback: return original URL
          return url;
        }

        return signedData?.signedUrl || url;
      }
    } catch (e) {
      console.warn('[ensurePublicUrl] URL parsing failed:', e.message);
      return url; // Return as-is if parsing fails
    }
  }

  // For relative paths, detect bucket and create signed URL
  const bucket = getBucketFromUrl(url);
  try {
    const { data: signedData, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(url, 86400); // 24 hours expiry

    if (error) {
      console.error(`[ensurePublicUrl] Signed URL creation failed for ${bucket}:`, error);
      // Fallback: try to construct public URL
      const { data: publicData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(url);
      return publicData?.publicUrl || null;
    }

    return signedData?.signedUrl || null;
  } catch (err) {
    console.error('[ensurePublicUrl] Error:', err);
    // Last resort: construct public URL
    try {
      const { data: publicData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(url);
      return publicData?.publicUrl || url;
    } catch (e) {
      return url;
    }
  }
}

/**
 * Helper: Process supplier data to ensure all image URLs are valid
 */
async function processSupplierImages(supplier) {
  if (!supplier) return supplier;
  
  const [rc_image_url, id_card_url, avatar_url] = await Promise.all([
    ensurePublicUrl(supplier.rc_image_url),
    ensurePublicUrl(supplier.id_card_url),
    ensurePublicUrl(supplier.avatar_url)
  ]);
  
  return {
    ...supplier,
    rc_image_url,
    id_card_url,
    avatar_url
  };
}

/**
 * Helper: Process merchant data (avatar only)
 */
async function processMerchantImages(merchant) {
  if (!merchant) return merchant;
  
  const avatar_url = await ensurePublicUrl(merchant.avatar_url);
  
  return {
    ...merchant,
    avatar_url
  };
}

const MerchantController = {

  // Get list of unvalidated suppliers (for merchant verification)
  async getUnvalidatedSuppliers(req, res) {
    try {
      // Query profiles directly to ensure real-time data (avoid stale view cache)
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, company_name, rc_number, nif_number, rc_image_url, id_card_url, avatar_url, business_email, business_phone, validated, role, created_at, online_status')
        .eq('role', 'supplier')
        .eq('validated', false);

      if (error) throw error;

      // Process image URLs to ensure they're valid public URLs
      const suppliersWithUrls = await Promise.all(
        (data || []).map(processSupplierImages)
      );

      return successResponse(res, { suppliers: suppliersWithUrls }, 'Unvalidated suppliers retrieved');
    } catch (err) {
      console.error('[getUnvalidatedSuppliers]', err);
      return errorResponse(res, err.message || 'Failed to fetch suppliers', 500);
    }
  },

  // Validate a supplier (merchant only)
  async validateSupplier(req, res) {
    try {
      const { supplierId } = req.params;
      const merchantUserId = req.user.userId;

      if (!supplierId) {
        return errorResponse(res, 'Supplier ID is required', 400);
      }

      // First check if the supplier exists and is not already validated
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('id, validated, role')
        .eq('id', supplierId)
        .single();

      if (fetchError || !existing) {
        return errorResponse(res, 'Supplier not found', 404);
      }

      if (existing.role !== 'supplier') {
        return errorResponse(res, 'Only suppliers can be validated', 400);
      }

      if (existing.validated) {
        return errorResponse(res, 'Supplier is already validated', 400);
      }

      // Get merchant's profile ID
      const { data: merchantProfile, error: merchantError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('auth_user_id', merchantUserId)
        .single();

      if (merchantError || !merchantProfile) {
        return errorResponse(res, 'Merchant profile not found', 404);
      }

      // Update the supplier to validated = true
      const { data: updatedSupplier, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ validated: true, updated_at: new Date().toISOString() })
        .eq('id', supplierId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Try to create the merchant-supplier relationship (optional table)
      // This tracks which merchant validated which supplier
      try {
        await supabaseAdmin
          .from('merchant_supplier_relations')
          .upsert({
            merchant_id: merchantProfile.id,
            supplier_id: supplierId,
            validated_at: new Date().toISOString(),
            status: 'active'
          }, {
            onConflict: 'merchant_id,supplier_id'
          });
      } catch (relationError) {
        // Table may not exist - log but don't fail
        console.warn('[validateSupplier] Relations table not available:', relationError.message);
      }

      return successResponse(res, { supplier: updatedSupplier }, 'Supplier validated successfully');
    } catch (err) {
      console.error('[validateSupplier]', err);
      return errorResponse(res, err.message || 'Failed to validate supplier', 500);
    }
  },

  // Get merchant's contact list (validated suppliers only)
  async getMerchantContacts(req, res) {
    try {
      // Use the merchant_contact_list view - it shows validated suppliers
      const { data, error } = await supabaseAdmin
        .from('merchant_contact_list')
        .select('*');

      if (error) throw error;

      // Process image URLs for all contacts
      const contactsWithUrls = await Promise.all(
        (data || []).map(processSupplierImages)
      );

      return successResponse(res, { contacts: contactsWithUrls }, 'Contacts retrieved');
    } catch (err) {
      console.error('[getMerchantContacts]', err);
      return errorResponse(res, err.message || 'Failed to fetch contacts', 500);
    }
  },

  // Get supplier's contact list (all validated merchants - for single merchant platform)
  async getSupplierContacts(req, res) {
    try {
      const userId = req.user.userId;

      // Get the supplier's profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, validated')
        .eq('auth_user_id', userId)
        .single();

      if (profileError || !profile) {
        return errorResponse(res, 'Profile not found', 404);
      }

      console.log('[getSupplierContacts] Supplier profile:', { id: profile.id, validated: profile.validated });

      // Only validated suppliers can see merchant contacts
      if (!profile.validated) {
        return successResponse(res, { contacts: [], message: 'You need to be validated to see contacts' }, 'Contacts retrieved');
      }

      // Get ALL validated merchants (platform has single merchant)
      const { data: merchants, error: merchantsError } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, business_email, business_phone, company_name, created_at, is_active, online_status')
        .eq('role', 'merchant')
        .eq('validated', true)
        .order('company_name');

      console.log('[getSupplierContacts] Query result:', { merchantsCount: merchants?.length || 0, error: merchantsError?.message });

      if (merchantsError) throw merchantsError;

      // If no validated merchants found, try getting any merchant
      let finalMerchants = merchants || [];
      if (finalMerchants.length === 0) {
        console.log('[getSupplierContacts] No validated merchants, trying all merchants...');
        const { data: allMerchants, error: allError } = await supabaseAdmin
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, business_email, business_phone, company_name, created_at, is_active, online_status')
          .eq('role', 'merchant')
          .order('company_name');
        
        if (!allError && allMerchants) {
          console.log('[getSupplierContacts] All merchants count:', allMerchants.length);
          finalMerchants = allMerchants;
        }
      }

      // Process avatar URLs for all merchants
      const merchantsWithUrls = await Promise.all(
        finalMerchants.map(processMerchantImages)
      );

      return successResponse(res, { contacts: merchantsWithUrls }, 'Merchant contacts retrieved');
    } catch (err) {
      console.error('[getSupplierContacts]', err);
      return errorResponse(res, err.message || 'Failed to fetch contacts', 500);
    }
  },

  // Get supplier details for merchant (including documents)
  async getSupplierDetails(req, res) {
    try {
      const { supplierId } = req.params;

      if (!supplierId) {
        return errorResponse(res, 'Supplier ID is required', 400);
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, company_name, rc_number, nif_number, rc_image_url, id_card_url, validated, created_at, business_email, business_phone')
        .eq('id', supplierId)
        .eq('role', 'supplier')
        .single();

      if (error || !data) {
        return errorResponse(res, 'Supplier not found', 404);
      }

      // Process image URLs
      const supplierWithUrls = await processSupplierImages(data);

      return successResponse(res, { supplier: supplierWithUrls }, 'Supplier details retrieved');
    } catch (err) {
      console.error('[getSupplierDetails]', err);
      return errorResponse(res, err.message || 'Failed to fetch supplier details', 500);
    }
  },

  // Toggle supplier block status (merchant blocks/unblocks a supplier)
  async toggleSupplierBlock(req, res) {
    try {
      const { supplierId } = req.params;
      const { isActive } = req.body; // true = unblock, false = block

      if (!supplierId) {
        return errorResponse(res, 'Supplier ID is required', 400);
      }

      if (typeof isActive !== 'boolean') {
        return errorResponse(res, 'isActive (boolean) is required', 400);
      }

      // Check if supplier exists and is a supplier
      const { data: supplier, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, is_active')
        .eq('id', supplierId)
        .eq('role', 'supplier')
        .single();

      if (checkError || !supplier) {
        return errorResponse(res, 'Supplier not found', 404);
      }

      // Update is_active status
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', supplierId)
        .select('id, first_name, last_name, is_active')
        .single();

      if (updateError) {
        console.error('[toggleSupplierBlock] Update error:', updateError);
        return errorResponse(res, 'Failed to update supplier status', 500);
      }

      const action = isActive ? 'unblocked' : 'blocked';
      return successResponse(res, { 
        supplier: updated,
        action,
        previousStatus: supplier.is_active,
        newStatus: isActive
      }, `Supplier ${action} successfully`);
    } catch (err) {
      console.error('[toggleSupplierBlock]', err);
      return errorResponse(res, err.message || 'Failed to toggle supplier block status', 500);
    }
  },

};

module.exports = MerchantController;
