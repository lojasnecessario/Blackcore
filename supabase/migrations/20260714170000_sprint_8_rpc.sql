CREATE OR REPLACE FUNCTION get_storefront_data()
RETURNS json AS $$
DECLARE
  v_menu_categories json;
  v_home_blocks json;
BEGIN
  -- 1. Categorias do Menu
  SELECT COALESCE(json_agg(c), '[]'::json) INTO v_menu_categories
  FROM (
    SELECT id, name, slug 
    FROM public.categories 
    WHERE active = true AND show_in_menu = true 
    ORDER BY display_order ASC
  ) c;

  -- 2. Blocos da Home
  SELECT COALESCE(json_agg(b), '[]'::json) INTO v_home_blocks
  FROM (
    SELECT * 
    FROM public.home_blocks 
    WHERE active = true 
      AND (start_at IS NULL OR start_at <= now())
      AND (end_at IS NULL OR end_at >= now())
    ORDER BY display_order ASC
  ) b;

  RETURN json_build_object(
    'menuCategories', v_menu_categories,
    'homeBlocks', v_home_blocks
  );
END;
$$ LANGUAGE plpgsql;
