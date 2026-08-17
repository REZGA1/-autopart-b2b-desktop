const { supabaseAdmin } = require('../config/supabase');

const PROFILES_BUCKET = 'profiles-documents';
const AVATARS_BUCKET = 'avatars';

function getBucketFromUrl(url) {
  if (!url) return PROFILES_BUCKET;
  if (url.includes('/avatars/') || url.includes('/object/public/avatars/')) {
    return AVATARS_BUCKET;
  }
  return PROFILES_BUCKET;
}

async function ensurePublicUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('?token=') || url.includes('?t=')) {
      return url;
    }
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/object\/public\/([^/]+)\/(.+)/);
      if (pathMatch) {
        const bucket = pathMatch[1];
        const path = decodeURIComponent(pathMatch[2]);
        const { data: signedData, error } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, 86400);

        if (error) return url;
        return signedData?.signedUrl || url;
      }
    } catch {
      return url;
    }
  }

  const bucket = getBucketFromUrl(url);
  try {
    const { data: signedData, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(url, 86400);

    if (error) {
      const { data: publicData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(url);
      return publicData?.publicUrl || null;
    }

    return signedData?.signedUrl || null;
  } catch {
    try {
      const { data: publicData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(url);
      return publicData?.publicUrl || url;
    } catch {
      return url;
    }
  }
}

async function processSupplierImages(supplier) {
  if (!supplier) return supplier;
  const [rc_image_url, id_card_url, avatar_url] = await Promise.all([
    ensurePublicUrl(supplier.rc_image_url),
    ensurePublicUrl(supplier.id_card_url),
    ensurePublicUrl(supplier.avatar_url)
  ]);
  return { ...supplier, rc_image_url, id_card_url, avatar_url };
}

async function processMerchantImages(merchant) {
  if (!merchant) return merchant;
  const avatar_url = await ensurePublicUrl(merchant.avatar_url);
  return { ...merchant, avatar_url };
}

const MerchantService = {
  async getUnvalidatedSuppliers() {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, company_name, rc_number, nif_number, rc_image_url, id_card_url, avatar_url, business_email, business_phone, validated, role, created_at, online_status')
      .eq('role', 'supplier')
      .eq('validated', false);

    if (error) throw error;
    return Promise.all((data || []).map(processSupplierImages));
  },

  async validateSupplier(supplierId, merchantUserId) {
    if (!supplierId) {
      const err = new Error('Supplier ID is required');
      err.status = 400;
      throw err;
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, validated, role')
      .eq('id', supplierId)
      .single();

    if (fetchError || !existing) {
      const err = new Error('Supplier not found');
      err.status = 404;
      throw err;
    }
    if (existing.role !== 'supplier') {
      const err = new Error('Only suppliers can be validated');
      err.status = 400;
      throw err;
    }
    if (existing.validated) {
      const err = new Error('Supplier is already validated');
      err.status = 400;
      throw err;
    }

    const { data: merchantProfile, error: merchantError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('auth_user_id', merchantUserId)
      .single();

    if (merchantError || !merchantProfile) {
      const err = new Error('Merchant profile not found');
      err.status = 404;
      throw err;
    }

    const { data: updatedSupplier, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ validated: true, updated_at: new Date().toISOString() })
      .eq('id', supplierId)
      .select()
      .single();

    if (updateError) throw updateError;

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
    } catch {
      // Table optional
    }

    return updatedSupplier;
  },

  async getMerchantContacts() {
    const { data, error } = await supabaseAdmin
      .from('merchant_contact_list')
      .select('*');

    if (error) throw error;
    return Promise.all((data || []).map(processSupplierImages));
  },

  async getSupplierContacts(userId) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, validated')
      .eq('auth_user_id', userId)
      .single();

    if (profileError || !profile) {
      const err = new Error('Profile not found');
      err.status = 404;
      throw err;
    }

    if (!profile.validated) {
      return { contacts: [], message: 'You need to be validated to see contacts' };
    }

    const { data: merchants, error: merchantsError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, business_email, business_phone, company_name, created_at, is_active, online_status')
      .eq('role', 'merchant')
      .eq('validated', true)
      .order('company_name');

    if (merchantsError) throw merchantsError;

    let finalMerchants = merchants || [];
    if (finalMerchants.length === 0) {
      const { data: allMerchants } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, business_email, business_phone, company_name, created_at, is_active, online_status')
        .eq('role', 'merchant')
        .order('company_name');

      if (allMerchants) finalMerchants = allMerchants;
    }

    const contactsWithUrls = await Promise.all(finalMerchants.map(processMerchantImages));
    return { contacts: contactsWithUrls };
  },

  async getSupplierDetails(supplierId) {
    if (!supplierId) {
      const err = new Error('Supplier ID is required');
      err.status = 400;
      throw err;
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, company_name, rc_number, nif_number, rc_image_url, id_card_url, validated, created_at, business_email, business_phone')
      .eq('id', supplierId)
      .eq('role', 'supplier')
      .single();

    if (error || !data) {
      const err = new Error('Supplier not found');
      err.status = 404;
      throw err;
    }

    return processSupplierImages(data);
  },

  async toggleSupplierBlock(supplierId, isActive) {
    if (!supplierId) {
      const err = new Error('Supplier ID is required');
      err.status = 400;
      throw err;
    }

    if (typeof isActive !== 'boolean') {
      const err = new Error('isActive (boolean) is required');
      err.status = 400;
      throw err;
    }

    const { data: supplier, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, is_active')
      .eq('id', supplierId)
      .eq('role', 'supplier')
      .single();

    if (checkError || !supplier) {
      const err = new Error('Supplier not found');
      err.status = 404;
      throw err;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', supplierId)
      .select('id, first_name, last_name, is_active')
      .single();

    if (updateError) {
      const err = new Error('Failed to update supplier status');
      err.status = 500;
      throw err;
    }

    const action = isActive ? 'unblocked' : 'blocked';
    return {
      supplier: updated,
      action,
      previousStatus: supplier.is_active,
      newStatus: isActive
    };
  }
};

module.exports = MerchantService;
