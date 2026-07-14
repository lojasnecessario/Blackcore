CREATE OR REPLACE FUNCTION get_category_products(
    p_category_slug text
)
RETURNS TABLE (
    id uuid,
    name text,
    slug text,
    images text[],
    category text,
    is_category_featured boolean,
    pinned boolean,
    pin_order integer,
    variants jsonb
) AS $$
DECLARE
    v_category_id uuid;
    v_sort_rule text;
    v_category_name text;
BEGIN
    SELECT c.id, c.sort_rule::text, c.name INTO v_category_id, v_sort_rule, v_category_name 
    FROM categories c WHERE c.slug ILIKE p_category_slug AND c.active = true;

    IF v_category_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        p.id, p.name, p.slug, p.images, p.category, 
        p.is_category_featured, p.pinned, p.pin_order,
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', pv.id,
                    'price', pv.price,
                    'promotional_price', pv.promotional_price,
                    'inventory_levels', (SELECT jsonb_agg(jsonb_build_object('available', il.available)) FROM inventory_levels il WHERE il.variant_id = pv.id)
                )
            )
            FROM product_variants pv WHERE pv.product_id = p.id
        ), '[]'::jsonb) as variants
    FROM products p
    LEFT JOIN mv_best_sellers mv ON mv.product_id = p.id
    WHERE (p.category_id = v_category_id OR p.category ILIKE v_category_name)
      AND p.status = 'ACTIVE'
      AND p.published = true
      AND p.show_in_store = true
    ORDER BY
        p.pinned DESC,
        p.pin_order ASC,
        p.is_category_featured DESC,
        CASE WHEN v_sort_rule = 'manual' THEN p.display_order END ASC,
        CASE WHEN v_sort_rule = 'best_selling' THEN mv.ranking END ASC NULLS LAST,
        CASE WHEN v_sort_rule = 'newest' THEN p.created_at END DESC,
        CASE WHEN v_sort_rule = 'name_asc' THEN p.name END ASC,
        CASE WHEN v_sort_rule = 'name_desc' THEN p.name END DESC,
        CASE WHEN v_sort_rule = 'price_asc' THEN (SELECT MIN(price) FROM product_variants WHERE product_id = p.id) END ASC,
        CASE WHEN v_sort_rule = 'price_desc' THEN (SELECT MAX(price) FROM product_variants WHERE product_id = p.id) END DESC,
        p.created_at DESC;
END;
$$ LANGUAGE plpgsql;
