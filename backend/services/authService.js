const { supabase, supabaseAdmin } = require('../config/supabase');
const ProfileModel = require('../repositories/userRepository');
const DocumentService = require('./documentService');

const AuthService = {
  async register({ email, password, firstName, lastName, phone, role, companyName }) {
    if (role === 'merchant') {
      const exists = await this.checkMerchantExists();
      if (exists) {
        throw { status: 403, message: 'Merchant already exists. Only one merchant is allowed in the system. New registrations are limited to suppliers only.' };
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { role } },
    });

    if (error) {
      const status = error.message.includes('already') ? 409 : 400;
      throw { status, message: error.message };
    }

    if (!data.session) {
      return {
        user: { id: data.user.id, email: data.user.email },
        profile: null,
        allowDocumentReupload: DocumentService.getClientConfig().allowDocumentReupload,
        accessToken: null,
        refreshToken: null,
        message: 'Please check your email to confirm your account before logging in',
      };
    }

    let profile;
    try {
      profile = await ProfileModel.create({
        userId: data.user.id,
        firstName, lastName, phone,
        role, companyName,
        businessEmail: email,
      });
    } catch {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      throw { status: 500, message: 'Failed to create profile' };
    }

    return {
      user: { id: data.user.id, email: data.user.email },
      profile,
      allowDocumentReupload: DocumentService.getClientConfig().allowDocumentReupload,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  },

  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw { status: 401, message: 'Invalid credentials' };

    const profile = await ProfileModel.findByUserId(data.user.id);
    if (!profile?.is_active) throw { status: 403, message: 'Account is suspended' };

    const updatedProfile = await ProfileModel.updateOnlineStatus(data.user.id, true);

    return {
      user: { id: data.user.id, email: data.user.email },
      profile: updatedProfile || profile,
      allowDocumentReupload: DocumentService.getClientConfig().allowDocumentReupload,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  },

  async logout(token) {
    if (!token) return;
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        await ProfileModel.updateOnlineStatus(user.id, false);
        await supabaseAdmin.auth.admin.signOut(user.id);
      }
    } catch {
      // Ignore token decode errors on logout
    }
  },

  async refresh(refreshToken) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error) throw { status: 401, message: 'Invalid token' };
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  },

  async getMe(userId) {
    await ProfileModel.updateOnlineStatus(userId, true);
    const profile = await ProfileModel.findByUserId(userId);
    return {
      profile,
      allowDocumentReupload: DocumentService.getClientConfig().allowDocumentReupload,
    };
  },

  async updateProfile(userId, body) {
    if (body?.validated !== undefined) {
      throw { status: 400, message: 'validated cannot be updated' };
    }
    const updated = await ProfileModel.update(userId, body || {});
    return { profile: updated };
  },

  async checkMerchantExists() {
    const { data: merchants, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'merchant')
      .limit(1);

    if (error) throw error;
    return merchants && merchants.length > 0;
  },

  async heartbeat(userId) {
    return ProfileModel.updateOnlineStatus(userId, true);
  }
};

module.exports = AuthService;