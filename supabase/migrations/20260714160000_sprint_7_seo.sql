DO $$
BEGIN
    -- Categorias
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='seo_title') THEN
        ALTER TABLE public.categories ADD COLUMN seo_title text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='seo_description') THEN
        ALTER TABLE public.categories ADD COLUMN seo_description text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='seo_canonical_url') THEN
        ALTER TABLE public.categories ADD COLUMN seo_canonical_url text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='og_image') THEN
        ALTER TABLE public.categories ADD COLUMN og_image text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='twitter_image') THEN
        ALTER TABLE public.categories ADD COLUMN twitter_image text;
    END IF;

    -- Produtos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='seo_canonical_url') THEN
        ALTER TABLE public.products ADD COLUMN seo_canonical_url text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='og_image') THEN
        ALTER TABLE public.products ADD COLUMN og_image text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='twitter_image') THEN
        ALTER TABLE public.products ADD COLUMN twitter_image text;
    END IF;
END $$;
