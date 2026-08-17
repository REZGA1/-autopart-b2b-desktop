const { supabaseAdmin } = require('../config/supabase');

const InventoryTransactionModel = {

  /**
   * Create inventory transaction
   */
  async create(transactionData) {
    const { data, error } = await supabaseAdmin
      .from('inventory_transactions')
      .insert({
        product_id: transactionData.product_id,
        merchant_id: transactionData.merchant_id,
        change: transactionData.change,
        reason: transactionData.reason,
        created_by: transactionData.created_by
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Find transactions by product
   */
  async findByProduct(productId, options = {}) {
    const { page = 1, limit = 20 } = options;

    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    const { data, error, count } = await supabaseAdmin
      .from('inventory_transactions')
      .select('*', { count: 'exact' })
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      transactions: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit))
      }
    };
  },

  /**
   * Get transaction summary for a product
   */
  async getSummary(productId) {
    const { data, error } = await supabaseAdmin
      .from('inventory_transactions')
      .select('change, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const transactions = data || [];
    const totalIn = transactions
      .filter(t => t.change > 0)
      .reduce((sum, t) => sum + t.change, 0);
    const totalOut = transactions
      .filter(t => t.change < 0)
      .reduce((sum, t) => sum + Math.abs(t.change), 0);

    return {
      totalTransactions: transactions.length,
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
      recentTransactions: transactions.slice(0, 10)
    };
  },

  /**
   * Log quantity change automatically
   * This is called when product quantity changes
   */
  async logQuantityChange(productId, merchantId, oldQuantity, newQuantity, userId) {
    const change = newQuantity - oldQuantity;
    if (change === 0) return null;

    // Reason: buying when increase, sale when decrease
    const reason = change > 0 ? 'buying' : 'sale';

    return await this.create({
      product_id: productId,
      merchant_id: merchantId,
      change: change,
      reason,
      created_by: userId
    });
  },

  /**
   * Update transaction reason
   */
  async updateReason(transactionId, reason) {
    const { data, error } = await supabaseAdmin
      .from('inventory_transactions')
      .update({ reason })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

};

module.exports = InventoryTransactionModel;
