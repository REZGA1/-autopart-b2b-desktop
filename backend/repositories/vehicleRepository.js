/**
 * [VEHICLE MODEL]
 * Handles all vehicle-related database operations
 * Used for managing vehicle reference data (make, model, year, trim, fuel_type, engine)
 * 
 * [TABLE SCHEMA]
 * - id: UUID (primary key)
 * - make: VARCHAR(100) - e.g., 'BMW', 'Toyota'
 * - model: VARCHAR(100) - e.g., 'M5', 'Supra'
 * - year: SMALLINT - e.g., 2020
 * - trim: VARCHAR(100) - e.g., 'Sport', 'Base'
 * - fuel_type: VARCHAR(30) - e.g., 'gas', 'petrol'
 * - engine: VARCHAR(50) - e.g., '5L', '2.0L'
 */

const { supabaseAdmin } = require('../config/supabase');

const VehicleModel = {

  /**
   * [FIND ALL]
   * Get all vehicles sorted by make, then model
   * Used for: vehicle dropdowns, vehicle management page
   */
  async findAll() {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .order('make')
      .order('model');

    if (error) throw error;
    return data || [];
  },

  /**
   * Find vehicle by ID
   */
  async findById(vehicleId) {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();

    if (error) return null;
    return data;
  },

  /**
   * Find vehicles by IDs
   */
  async findByIds(vehicleIds) {
    if (!vehicleIds || vehicleIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .in('id', vehicleIds);

    if (error) throw error;
    return data || [];
  },

  /**
   * Check if vehicle with exact same specs already exists
   * Returns the existing vehicle if found, null otherwise
   */
  async findByExactSpecs(vehicleData) {
    const make = vehicleData.make?.trim();
    const model = vehicleData.model?.trim();
    const year = vehicleData.year ? parseInt(vehicleData.year) : null;
    const trim = vehicleData.trim?.trim() || null;
    const fuel_type = vehicleData.fuel_type?.trim() || null;
    const engine = vehicleData.engine?.trim() || null;

    let query = supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('make', make)
      .eq('model', model);

    // Check optional fields - must match exactly (including null)
    if (year !== null && year !== undefined) {
      query = query.eq('year', year);
    } else {
      query = query.is('year', null);
    }

    if (trim !== null) {
      query = query.eq('trim', trim);
    } else {
      query = query.is('trim', null);
    }

    if (fuel_type !== null) {
      query = query.eq('fuel_type', fuel_type);
    } else {
      query = query.is('fuel_type', null);
    }

    if (engine !== null) {
      query = query.eq('engine', engine);
    } else {
      query = query.is('engine', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data; // Returns existing vehicle or null
  },

  /**
   * Create new vehicle
   * Prevents duplicates - throws error if vehicle with same specs exists
   */
  async create(vehicleData) {
    // Check for duplicate first
    const existing = await this.findByExactSpecs(vehicleData);

    if (existing) {
      const error = new Error('Vehicle with identical specifications already exists');
      error.status = 409;
      error.code = 'DUPLICATE_VEHICLE';
      error.existingVehicle = existing;
      throw error;
    }

    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .insert({
        make: vehicleData.make?.trim(),
        model: vehicleData.model?.trim(),
        year: vehicleData.year ? parseInt(vehicleData.year) : null,
        trim: vehicleData.trim?.trim() || null,
        fuel_type: vehicleData.fuel_type?.trim() || null,
        engine: vehicleData.engine?.trim() || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create multiple vehicles
   * Skips duplicates - only creates new unique vehicles
   */
  async createMany(vehicles) {
    if (!vehicles || vehicles.length === 0) return [];

    const results = [];
    const errors = [];

    // Process one by one to handle duplicates
    for (const vehicle of vehicles) {
      try {
        // Try to create - will skip if duplicate
        const newVehicle = await this.create(vehicle);
        results.push(newVehicle);
      } catch (err) {
        if (err.code === 'DUPLICATE_VEHICLE') {
          // Skip duplicate silently, but track it
          errors.push({
            vehicle,
            error: 'Duplicate vehicle skipped',
            existingId: err.existingVehicle?.id
          });
        } else {
          throw err; // Re-throw other errors
        }
      }
    }

    return { created: results, skipped: errors };
  },

  /**
   * Get unique makes
   */
  async getMakes() {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('make');

    if (error) throw error;

    // Get unique makes
    const makes = [...new Set(data?.map(v => v.make).filter(Boolean))];
    return makes.sort();
  },

  /**
   * Get models by make
   */
  async getModelsByMake(make) {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('model')
      .eq('make', make);

    if (error) throw error;

    // Get unique models
    const models = [...new Set(data?.map(v => v.model).filter(Boolean))];
    return models.sort();
  },

  /**
   * Search vehicles
   */
  async search(query) {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .or(`make.ilike.%${query}%,model.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;
    return data || [];
  },

  /**
   * Find or create vehicle (for batch operations)
   * Returns existing vehicle if ALL attributes match exactly
   * Allows variations (e.g., same make/model but different year/trim/engine)
   */
  async findOrCreate(vehicleData) {
    // Use the centralized duplicate check
    const existing = await this.findByExactSpecs(vehicleData);

    if (existing) {
      // Return existing with flag
      return { ...existing, _isExisting: true };
    }

    // Create new vehicle directly in DB (bypass duplicate check since we already checked)
    const make = vehicleData.make?.trim();
    const model = vehicleData.model?.trim();
    const year = vehicleData.year ? parseInt(vehicleData.year) : null;
    const trim = vehicleData.trim?.trim() || null;
    const fuel_type = vehicleData.fuel_type?.trim() || null;
    const engine = vehicleData.engine?.trim() || null;

    const { data: newVehicle, error } = await supabaseAdmin
      .from('vehicles')
      .insert({ make, model, year, trim, fuel_type, engine })
      .select()
      .single();

    if (error) {
      // If unique constraint violation, try to find again (race condition)
      if (error.code === '23505') {
        const raceExisting = await this.findByExactSpecs(vehicleData);
        if (raceExisting) {
          return { ...raceExisting, _isExisting: true };
        }
      }
      throw error;
    }

    return { ...newVehicle, _isExisting: false };
  },

  /**
   * Update a vehicle
   */
  async update(id, vehicleData) {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .update({
        make: vehicleData.make?.trim(),
        model: vehicleData.model?.trim(),
        year: vehicleData.year ? parseInt(vehicleData.year) : null,
        trim: vehicleData.trim?.trim() || null,
        fuel_type: vehicleData.fuel_type?.trim() || null,
        engine: vehicleData.engine?.trim() || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a vehicle
   */
  async delete(id) {
    const { error } = await supabaseAdmin
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Find vehicles by product ID
   */
  async findByProductId(productId) {
    const { data, error } = await supabaseAdmin
      .from('product_vehicles')
      .select('vehicle_id')
      .eq('product_id', productId);

    if (error) throw error;
    return data || [];
  }

};

module.exports = VehicleModel;
