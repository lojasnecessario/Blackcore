-- Sprint 1: Evolution of categories table
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS banner_desktop text,
  ADD COLUMN IF NOT EXISTS banner_mobile text,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_in_menu boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS description text;

-- Sprint 2: Evolution of products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS best_seller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS new_arrival boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promotion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_in_store boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_in_search boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
