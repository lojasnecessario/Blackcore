BEGIN;

-- Remover políticas restritas antigas (se existirem)
DROP POLICY IF EXISTS "Apenas Admins leem produtos" ON public.products;
DROP POLICY IF EXISTS "Apenas Admins leem variacoes" ON public.product_variants;
DROP POLICY IF EXISTS "Leitura publica de produtos" ON public.products;
DROP POLICY IF EXISTS "Leitura publica de variacoes" ON public.product_variants;

-- Permitir que o público veja apenas produtos ATIVOS
CREATE POLICY "Leitura publica de produtos ativos" ON public.products FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Leitura publica de variacoes ativas" ON public.product_variants FOR SELECT USING (EXISTS (SELECT 1 FROM public.products WHERE id = product_variants.product_id AND status = 'ACTIVE'));

-- Garantir que ADMINS vejam tudo (DRAFT, ARCHIVED, etc)
CREATE POLICY "Admins veem todos os produtos" ON public.products FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admins veem todas variacoes" ON public.product_variants FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

COMMIT;
