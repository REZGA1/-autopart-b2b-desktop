const { supabaseAdmin } = require('../config/supabase');

const MerchantModel = {

  /**
   * Find merchant profile by auth user ID
   */
  async findByAuthUserId(authUserId) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, company_name, role, phone, business_email')
      .eq('auth_user_id', authUserId)
      .single();

    if (error || !data) return null;
    return data;
  },

  /**
   * Find merchant by ID
   */
  async findById(merchantId) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', merchantId)
      .single();

    if (error) return null;
    return data;
  },

  /**
   * Verify merchant owns product
   */
  async ownsProduct(merchantId, productId) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('merchant_id', merchantId)
      .single();

    if (error || !data) return false;
    return true;
  },

  /**
   * Get merchant ID from auth user ID
   * Returns null if not found
   */
  async getMerchantId(authUserId) {
    const merchant = await this.findByAuthUserId(authUserId);
    return merchant?.id || null;
  }

};

module.exports = MerchantModel;
