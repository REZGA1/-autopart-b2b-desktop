const { supabaseAdmin } = require('../config/supabase');

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

const ProfileModel = {

  async create({ userId, firstName, lastName,
                  phone, role, companyName, businessEmail }) {
    // Instead of raw INSERT SQL — Query Builder
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        auth_user_id:   userId,
        first_name:     firstName,
        last_name:      lastName,
        phone:          phone || null,
        role,
        company_name:   companyName || null,
        business_email: businessEmail,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findByUserId(userId) {
    // Instead of SELECT...JOIN — Supabase resolves joins automatically
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('auth_user_id', userId)
      .single();

    if (error) return null;
    return data;
  },

  // Dynamic update — easier than building dynamic SQL
  async update(userId, fields) {
    const allowed = [
      'first_name', 'last_name', 'phone',
      'company_name', 'address',
      'rc_number', 'nif_number',
      'rc_image_url', 'id_card_url', 'avatar_url',
      'business_phone', 'business_email', 'online_status'
    ];
    const updates = {};
    allowed.forEach(f => {
      if (fields[f] !== undefined) updates[f] = fields[f];
    });

    // Always touch updated_at
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('auth_user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeStoredFileIfInBucket(publicUrl, bucket) {
    const path = storageObjectPathFromPublicUrl(publicUrl, bucket);
    if (!path) return;
    try {
      await this.deleteImage(bucket, path);
    } catch (e) {
      console.warn('[storage] remove previous object:', e.message || e);
    }
  },

  async uploadAvatar(userId, file) {
    const prev = await this.findByUserId(userId);
    const prevUrl = prev?.avatar_url || null;

    const filename = `${userId}-avatar-${Date.now()}${this.getExtension(file.mimetype)}`;

    const { error } = await supabaseAdmin
      .storage.from('avatars')
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin
      .storage.from('avatars')
      .getPublicUrl(filename);

    await this.update(userId, { avatar_url: publicUrl });

    if (prevUrl && prevUrl !== publicUrl) {
      await this.removeStoredFileIfInBucket(prevUrl, 'avatars');
    }

    return { url: publicUrl, filename };
  },

  async uploadProfileDocument(userId, file, docType, { allowReupload } = {}) {
    const profile = await this.findByUserId(userId);
    if (!profile) throw new Error('Profile not found');

    const fieldMap = { rc: 'rc_image_url', id_card: 'id_card_url' };
    const field = fieldMap[docType];
    const existingUrl = profile[field];

    if (existingUrl && !allowReupload) {
      const err = new Error(
        docType === 'rc'
          ? 'RC document already uploaded'
          : 'ID card already uploaded'
      );
      err.status = 409;
      throw err;
    }

    const filename = `${userId}-${docType}-${Date.now()}${this.getExtension(file.mimetype)}`;

    const { error } = await supabaseAdmin
      .storage.from('profiles-documents')
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin
      .storage.from('profiles-documents')
      .getPublicUrl(filename);

    await this.update(userId, { [field]: publicUrl });

    if (existingUrl && existingUrl !== publicUrl) {
      await this.removeStoredFileIfInBucket(existingUrl, 'profiles-documents');
    }

    return { url: publicUrl, filename };
  },

  async deleteImage(bucket, filename) {
    const { error } = await supabaseAdmin
      .storage.from(bucket)
      .remove([filename]);
    if (error) throw error;
  },

  getExtension(mimetype) {
    const map = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf'
    };
    return map[mimetype] || '.jpg';
  },

  /**
   * Update online status for a user
   */
  async updateOnlineStatus(userId, isOnline) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ online_status: isOnline, updated_at: new Date().toISOString() })
      .eq('auth_user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[ProfileModel.updateOnlineStatus] Error:', error);
      return null;
    }
    return data;
  },

  /**
   * Set all users offline (useful for server restart)
   */
  async setAllOffline() {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ online_status: false, updated_at: new Date().toISOString() })
      .eq('online_status', true);

    if (error) {
      console.error('[ProfileModel.setAllOffline] Error:', error);
    }
  },
};
module.exports = ProfileModel;