const { supabase, supabaseAdmin } =
  require('../config/supabase');
const ProfileModel = require('../models/userModel');
const DocumentService = require('./documentService');

// No bcryptjs, no jwt, no manual transaction

const AuthService = {

  async register({ email, password, firstName,
                    lastName, phone, role, companyName }) {

    // Check if merchant already exists (single merchant policy)
    if (role === 'merchant') {
      const { data: existingMerchants, error: countError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'merchant')
        .limit(1);

      if (countError) {
        throw { status: 500, message: 'Failed to check existing merchants' };
      }

      if (existingMerchants && existingMerchants.length > 0) {
        throw { status: 403, message: 'Merchant already exists. Only one merchant is allowed in the system. New registrations are limited to suppliers only.' };
      }
    }

    // Supabase: creates user + hashes password + issues Session
    const { data, error } = await supabase.auth.signUp({
      email, password,
      // ✅ Fix: store role in user_metadata so the authorize middleware can read it
      options: { data: { role } },
    });

    if (error) {
      // Duplicate email or weak password
      const status = error.message.includes('already') ? 409 : 400;
      throw { status, message: error.message };
    }

    // Check if session exists (email confirmation may be required)
    if (!data.session) {
      // If no session, we still created the user, but they need to confirm email
      // Return user info but no tokens
      return {
        user:         { id: data.user.id, email: data.user.email },
        profile:      null,
        allowDocumentReupload: DocumentService.getClientConfig().allowDocumentReupload,
        accessToken:  null,
        refreshToken: null,
        message:      'Please check your email to confirm your account before logging in',
      };
    }

    // Create the profile record in the profiles table
    let profile;
    try {
      profile = await ProfileModel.create({
        userId:        data.user.id,
        firstName, lastName, phone,
        role, companyName,
        businessEmail: email,
      });
    } catch (err) {
      // Manual rollback: delete the user if Profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      throw { status: 500, message: 'Failed to create profile' };
    }

    return {
      user:         { id: data.user.id, email: data.user.email },
      profile,
      allowDocumentReupload: DocumentService.getClientConfig().allowDocumentReupload,
      // Session directly from Supabase
      accessToken:  data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  },

  async login({ email, password }) {

    // One line replaces: findByEmail + comparePassword + generateTokens
    const { data, error } =
      await supabase.auth.signInWithPassword({ email, password });

    if (error)
      throw { status: 401, message: 'Invalid credentials' };

    const profile = await ProfileModel
      .findByUserId(data.user.id);

    if (!profile?.is_active)
      throw { status: 403, message: 'Account is suspended' };

    return {
      user:         { id: data.user.id, email: data.user.email },
      profile,
      allowDocumentReupload: DocumentService.getClientConfig().allowDocumentReupload,
      accessToken:  data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  },

  // ✅ Moved from Controller — all Supabase logic stays in Service
  async logout(token) {
    if (!token) return;
    const { data: { user } } =
      await supabaseAdmin.auth.getUser(token);
    if (user)
      await supabaseAdmin.auth.admin.signOut(user.id);
  },

  async refresh(refreshToken) {
    const { data, error } =
      await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });
    if (error)
      throw { status: 401, message: 'Invalid token' };
    return {
      accessToken:  data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  },

  async getMe(userId) {
    const profile =
      await ProfileModel.findByUserId(userId);
    return {
      profile,
      allowDocumentReupload: DocumentService.getClientConfig().allowDocumentReupload,
    };
  },
};

module.exports = AuthService;