-- 1. Create ENUM
CREATE TYPE public.category_sort_rule AS ENUM (
    'manual',
    'newest',
    'best_selling',
    'price_asc',
    'price_desc',
    'name_asc',
    'name_desc'
);

-- 2. Add sort_rule to categories
ALTER TABLE public.categories
ADD COLUMN sort_rule public.category_sort_rule NOT NULL DEFAULT 'manual';

-- 3. Add merchandising and pin flags to products
ALTER TABLE public.products
ADD COLUMN is_category_featured boolean NOT NULL DEFAULT false,
ADD COLUMN pinned boolean NOT NULL DEFAULT false,
ADD COLUMN pin_order integer NOT NULL DEFAULT 0;

-- 4. Create Materialized View for Best Sellers
-- We drop if exists just in case
DROP MATERIALIZED VIEW IF EXISTS public.mv_best_sellers;

CREATE MATERIALIZED VIEW public.mv_best_sellers AS
SELECT 
    pv.product_id,
    COALESCE(SUM(oi.quantity), 0) AS total_quantity,
    COUNT(DISTINCT o.id) AS total_orders,
    MAX(o.created_at) AS last_sale,
    RANK() OVER (ORDER BY COALESCE(SUM(oi.quantity), 0) DESC) as ranking
FROM 
    public.product_variants pv
LEFT JOIN 
    public.order_items oi ON oi.variant_id = pv.id
LEFT JOIN 
    public.orders o ON o.id = oi.order_id AND o.status != 'CANCELED'
GROUP BY 
    pv.product_id;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_mv_best_sellers_product_id ON public.mv_best_sellers(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_display_order ON public.products(display_order);
CREATE INDEX IF NOT EXISTS idx_products_pin_order ON public.products(pin_order);
CREATE INDEX IF NOT EXISTS idx_products_published ON public.products(published);
CREATE INDEX IF NOT EXISTS idx_products_show_in_store ON public.products(show_in_store);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(active);

-- 6. Product Collections (if not exists)
CREATE TABLE IF NOT EXISTS public.collections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.product_collections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(product_id, collection_id)
);
