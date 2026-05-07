CREATE OR REPLACE FUNCTION get_products_by_vehicle(
  p_merchant_id UUID,
  p_search TEXT DEFAULT NULL,
  p_part_type TEXT DEFAULT NULL,
  p_product_condition TEXT DEFAULT NULL,
  p_min_quantity INTEGER DEFAULT NULL,
  p_max_quantity INTEGER DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_vehicle_make TEXT DEFAULT NULL,
  p_vehicle_model TEXT DEFAULT NULL,
  p_vehicle_year INTEGER DEFAULT NULL,
  p_vehicle_engine TEXT DEFAULT NULL,
  p_stock_alert TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc',
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  total_count BIGINT,
  id UUID,
  merchant_id UUID,
  name VARCHAR,
  serial_number VARCHAR,
  part_type VARCHAR,
  purchase_price NUMERIC,
  selling_price NUMERIC,
  description TEXT,
  image_url VARCHAR,
  quantity INTEGER,
  product_condition TEXT,
  minimum INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  vehicles JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_offset INTEGER := (p_page - 1) * p_limit;
  v_total BIGINT;
BEGIN
  SELECT COUNT(DISTINCT p.id) INTO v_total
  FROM products p
  LEFT JOIN merchant_vehicles mv ON mv.product_id = p.id
  LEFT JOIN vehicles v ON v.id = mv.vehicle_id
  WHERE p.merchant_id = p_merchant_id
    AND (p_search IS NULL OR 
         p.name ILIKE '%' || p_search || '%' OR 
         p.description ILIKE '%' || p_search || '%' OR 
         p.serial_number ILIKE '%' || p_search || '%')
    AND (p_part_type IS NULL OR p.part_type = p_part_type)
    AND (p_product_condition IS NULL OR p.product_condition = p_product_condition)
    AND (p_min_quantity IS NULL OR p.quantity >= p_min_quantity)
    AND (p_max_quantity IS NULL OR p.quantity <= p_max_quantity)
    AND (p_min_price IS NULL OR p.selling_price >= p_min_price)
    AND (p_max_price IS NULL OR p.selling_price <= p_max_price)
    AND (p_vehicle_make IS NULL OR v.make ILIKE '%' || p_vehicle_make || '%')
    AND (p_vehicle_model IS NULL OR v.model ILIKE '%' || p_vehicle_model || '%')
    AND (p_vehicle_year IS NULL OR v.year = p_vehicle_year)
    AND (p_vehicle_engine IS NULL OR v.engine ILIKE '%' || p_vehicle_engine || '%')
    AND (p_stock_alert IS NULL OR 
         (p_stock_alert = 'low' AND p.quantity < p.minimum) OR
         (p_stock_alert = 'critical' AND p.quantity = 0));

  RETURN QUERY
  SELECT 
    v_total as total_count,
    p.id,
    p.merchant_id,
    p.name,
    p.serial_number,
    p.part_type,
    p.purchase_price,
    p.selling_price,
    p.description,
    p.image_url,
    p.quantity,
    p.product_condition,
    p.minimum,
    p.created_at,
    p.updated_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'make', v.make,
          'model', v.model,
          'year', v.year,
          'trim', v.trim,
          'fuel_type', v.fuel_type,
          'engine', v.engine
        )
      ) FILTER (WHERE v.id IS NOT NULL),
      '[]'::jsonb
    ) as vehicles
  FROM products p
  LEFT JOIN merchant_vehicles mv ON mv.product_id = p.id
  LEFT JOIN vehicles v ON v.id = mv.vehicle_id
  WHERE p.merchant_id = p_merchant_id
    AND (p_search IS NULL OR 
         p.name ILIKE '%' || p_search || '%' OR 
         p.description ILIKE '%' || p_search || '%' OR 
         p.serial_number ILIKE '%' || p_search || '%')
    AND (p_part_type IS NULL OR p.part_type = p_part_type)
    AND (p_product_condition IS NULL OR p.product_condition = p_product_condition)
    AND (p_min_quantity IS NULL OR p.quantity >= p_min_quantity)
    AND (p_max_quantity IS NULL OR p.quantity <= p_max_quantity)
    AND (p_min_price IS NULL OR p.selling_price >= p_min_price)
    AND (p_max_price IS NULL OR p.selling_price <= p_max_price)
    AND (p_vehicle_make IS NULL OR v.make ILIKE '%' || p_vehicle_make || '%')
    AND (p_vehicle_model IS NULL OR v.model ILIKE '%' || p_vehicle_model || '%')
    AND (p_vehicle_year IS NULL OR v.year = p_vehicle_year)
    AND (p_vehicle_engine IS NULL OR v.engine ILIKE '%' || p_vehicle_engine || '%')
    AND (p_stock_alert IS NULL OR 
         (p_stock_alert = 'low' AND p.quantity < p.minimum) OR
         (p_stock_alert = 'critical' AND p.quantity = 0))
  GROUP BY p.id
  ORDER BY 
    CASE WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN p.name END ASC,
    CASE WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN p.name END DESC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN p.created_at END ASC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN p.created_at END DESC,
    CASE WHEN p_sort_by = 'quantity' AND p_sort_order = 'asc' THEN p.quantity END ASC,
    CASE WHEN p_sort_by = 'quantity' AND p_sort_order = 'desc' THEN p.quantity END DESC,
    CASE WHEN p_sort_by = 'selling_price' AND p_sort_order = 'asc' THEN p.selling_price END ASC,
    CASE WHEN p_sort_by = 'selling_price' AND p_sort_order = 'desc' THEN p.selling_price END DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;
