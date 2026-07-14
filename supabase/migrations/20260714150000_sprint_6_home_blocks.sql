-- 1. Create home_blocks table
CREATE TABLE IF NOT EXISTS public.home_blocks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL,
    title text,
    subtitle text,
    button_text text,
    button_link text,
    image text,
    limit_products integer,
    display_order integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    visibility_condition text DEFAULT 'both',
    start_at timestamp with time zone,
    end_at timestamp with time zone,
    query text,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Indexes for fast querying on the storefront
CREATE INDEX IF NOT EXISTS idx_home_blocks_active ON public.home_blocks(active);
CREATE INDEX IF NOT EXISTS idx_home_blocks_display_order ON public.home_blocks(display_order);

-- 3. RLS (Row Level Security)
ALTER TABLE public.home_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.home_blocks
    FOR SELECT
    USING (
        active = true 
        AND (start_at IS NULL OR start_at <= now())
        AND (end_at IS NULL OR end_at >= now())
    );

CREATE POLICY "Enable all access for authenticated admins" ON public.home_blocks
    FOR ALL
    USING (auth.role() = 'authenticated');
