-- ==========================================
-- FASE G - MÓDULO DE CUPONS E PROMOÇÕES (REVIEWED)
-- ==========================================

-- 1. Modificar Tabela 'coupons'
DO $$
BEGIN
    -- Adicionar colunas se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'description') THEN
        ALTER TABLE public.coupons ADD COLUMN description text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'limit_per_customer') THEN
        ALTER TABLE public.coupons ADD COLUMN limit_per_customer integer;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'created_by') THEN
        ALTER TABLE public.coupons ADD COLUMN created_by uuid REFERENCES public.profiles(id);
    END IF;
END $$;

-- Identificar tipo da coluna 'type' e expandir seletivamente para suportar FREE_SHIPPING
DO $$
DECLARE
    v_type text;
BEGIN
    SELECT data_type INTO v_type 
    FROM information_schema.columns 
    WHERE table_name = 'coupons' AND column_name = 'type';

    IF v_type = 'USER-DEFINED' THEN
        -- Provavelmente ENUM type
        EXECUTE 'ALTER TYPE coupon_type ADD VALUE IF NOT EXISTS ''FREE_SHIPPING''';
    ELSIF v_type IN ('character varying', 'text', 'character') THEN
        -- Texto com possível CHECK constraint
        ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_type_check;
        ALTER TABLE public.coupons ADD CONSTRAINT coupons_type_check CHECK (type IN ('PERCENTAGE', 'FIXED', 'FREE_SHIPPING'));
    END IF;
END $$;

-- 2. Tabela de Idempotência e Limites de Cliente (Redenções de Cupom)
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    coupon_id uuid REFERENCES public.coupons(id) ON DELETE CASCADE,
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    redeemed_at timestamptz DEFAULT now(),
    UNIQUE(order_id),
    UNIQUE(coupon_id, order_id)
);
-- Habilita RLS de segurança (já que customers não mexem aqui diretamente)
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;


-- 3. Criar RPC Central de Validação de Cupons (Fonte da Verdade Única)
DROP FUNCTION IF EXISTS public.validate_and_calculate_coupon(text, uuid, numeric, numeric);

CREATE OR REPLACE FUNCTION public.validate_and_calculate_coupon(
    p_code text,
    p_profile_id uuid,
    p_subtotal numeric,
    p_shipping_cost numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_coupon record;
    v_discount numeric := 0;
    v_customer_usage int := 0;
BEGIN
    -- Validação Financeira de Segurança
    IF p_subtotal IS NULL OR p_subtotal < 0 THEN
        RETURN jsonb_build_object('is_valid', false, 'error_message', 'Subtotal inválido', 'discount_value', 0, 'coupon_id', null);
    END IF;
    IF p_shipping_cost IS NULL OR p_shipping_cost < 0 THEN
        RETURN jsonb_build_object('is_valid', false, 'error_message', 'Frete inválido', 'discount_value', 0, 'coupon_id', null);
    END IF;

    -- Busca o cupom normalizado
    SELECT * INTO v_coupon FROM public.coupons WHERE upper(trim(code)) = upper(trim(p_code));
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('is_valid', false, 'error_message', 'Cupom inválido ou não encontrado', 'discount_value', 0, 'coupon_id', null);
    END IF;

    -- Validação do Tipo e Valor base
    IF v_coupon.type = 'PERCENTAGE' AND (v_coupon.value <= 0 OR v_coupon.value > 100) THEN
        RETURN jsonb_build_object('is_valid', false, 'error_message', 'Cupom percentual com configuração inválida', 'discount_value', 0, 'coupon_id', null);
    END IF;
    IF v_coupon.type = 'FIXED' AND v_coupon.value <= 0 THEN
        RETURN jsonb_build_object('is_valid', false, 'error_message', 'Cupom de valor fixo com configuração inválida', 'discount_value', 0, 'coupon_id', null);
    END IF;

    -- Regra 1: Ativo/Inativo
    IF NOT v_coupon.active THEN
        RETURN jsonb_build_object('is_valid', false, 'error_message', 'Este cupom está inativo', 'discount_value', 0, 'coupon_id', null);
    END IF;

    -- Regra 2: Datas
    IF v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > now() THEN
        RETURN jsonb_build_object('is_valid', false, 'error_message', 'Este cupom ainda não é válido', 'discount_value', 0, 'coupon_id', null);
    END IF;
    IF v_coupon.ends_at IS NOT NULL AND v_coupon.ends_at < now() THEN
        RETURN jsonb_build_object('is_valid', false, 'error_message', 'Este cupom já expirou', 'discount_value', 0, 'coupon_id', null);
    END IF;

    -- Regra 3: Limite Geral de Usos (Opção A - MVP: O uso cresce pós-compra, então um limite marginal concorrente é o risco residual documentado)
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.usage_count >= v_coupon.max_uses THEN
        RETURN jsonb_build_object('is_valid', false, 'error_message', 'Este cupom esgotou o limite de usos', 'discount_value', 0, 'coupon_id', null);
    END IF;

    -- Regra 4: Valor Mínimo
    IF v_coupon.min_order_value IS NOT NULL AND p_subtotal < v_coupon.min_order_value THEN
        RETURN jsonb_build_object('is_valid', false, 'error_message', 'O valor mínimo para usar este cupom é R$ ' || v_coupon.min_order_value::text, 'discount_value', 0, 'coupon_id', null);
    END IF;

    -- Regra 5: Limite por Cliente (via tabela coupon_redemptions)
    IF v_coupon.limit_per_customer IS NOT NULL THEN
        IF p_profile_id IS NULL THEN
            RETURN jsonb_build_object('is_valid', false, 'error_message', 'Faça login para utilizar este cupom', 'discount_value', 0, 'coupon_id', null);
        END IF;

        SELECT COUNT(id) INTO v_customer_usage 
        FROM public.coupon_redemptions 
        WHERE profile_id = p_profile_id AND coupon_id = v_coupon.id;
          
        IF v_customer_usage >= v_coupon.limit_per_customer THEN
            RETURN jsonb_build_object('is_valid', false, 'error_message', 'Você já atingiu seu limite de uso para este cupom', 'discount_value', 0, 'coupon_id', null);
        END IF;
    END IF;

    -- Regra 6: Cálculo do Desconto (NUNCA gera valor negativo)
    IF v_coupon.type = 'PERCENTAGE' THEN
        v_discount := p_subtotal * (v_coupon.value / 100);
        IF v_discount > p_subtotal THEN v_discount := p_subtotal; END IF;
        
    ELSIF v_coupon.type = 'FIXED' THEN
        v_discount := v_coupon.value;
        IF v_discount > p_subtotal THEN v_discount := p_subtotal; END IF;
        
    ELSIF v_coupon.type = 'FREE_SHIPPING' THEN
        -- Zera apenas o frete. Subtotal dos produtos intactos.
        v_discount := p_shipping_cost;
    END IF;

    -- Sucesso
    RETURN jsonb_build_object(
        'is_valid', true, 
        'error_message', null, 
        'discount_value', v_discount, 
        'coupon_id', v_coupon.id,
        'type', v_coupon.type
    );
END;
$$;

-- Blindagem de Acesso da RPC
REVOKE ALL ON FUNCTION public.validate_and_calculate_coupon(text, uuid, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_and_calculate_coupon(text, uuid, numeric, numeric) FROM anon;
REVOKE ALL ON FUNCTION public.validate_and_calculate_coupon(text, uuid, numeric, numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.validate_and_calculate_coupon(text, uuid, numeric, numeric) TO service_role;


-- 4. Função Auxiliar de Incremento com Idempotência Transacional
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
BEGIN
    -- Bloquear pedido (evitar chamadas concorrentes do webhook no exato ms)
    SELECT coupon_id, profile_id INTO v_order 
    FROM public.orders 
    WHERE id = p_order_id FOR UPDATE;
    
    IF FOUND AND v_order.coupon_id IS NOT NULL THEN
        BEGIN
            -- Tenta inserir o resgate. Falha caso seja webhook duplicado (Unique Constraint order_id)
            INSERT INTO public.coupon_redemptions (coupon_id, order_id, profile_id)
            VALUES (v_order.coupon_id, p_order_id, v_order.profile_id);
            
            -- Se passou do INSERT, foi bem sucedido e incrementamos a carga global.
            UPDATE public.coupons SET usage_count = usage_count + 1 WHERE id = v_order.coupon_id;
            
        EXCEPTION WHEN unique_violation THEN
            -- Idempotência ativada: Webhook repetido, ignorar graciosamente.
            RETURN;
        END;
    END IF;
END;
$$;


-- 5. Atualização da RPC handle_payment_webhook (Máquina de Estados)
-- Transcrevemos a função ORIGINAL extraída de artifacts prévios, inserindo o incremento de cupom estritamente no bloco 'APPROVED'.
CREATE OR REPLACE FUNCTION public.handle_payment_webhook(p_order_id uuid, p_status text, p_external_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_current_order_status text;
    v_current_payment_status text;
BEGIN
    SELECT status, payment_status INTO v_current_order_status, v_current_payment_status
    FROM orders 
    WHERE id = p_order_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido não encontrado';
    END IF;

    IF v_current_payment_status = p_status THEN
        RETURN;
    END IF;

    IF p_status = 'APPROVED' THEN
        IF v_current_order_status != 'PENDING' THEN
            RAISE EXCEPTION 'Transição ilegal: Pedido em % não pode receber APPROVED.', v_current_order_status;
        END IF;
        
        UPDATE payments SET status = p_status, external_id = p_external_id, updated_at = NOW() WHERE order_id = p_order_id;
        UPDATE orders SET payment_status = 'APPROVED', status = 'PAID', updated_at = NOW() WHERE id = p_order_id;
        PERFORM deduct_stock(p_order_id);
        
        -- INJEÇÃO FASE G: Consumir uso do cupom com segurança e idempotência!
        PERFORM public.increment_coupon_usage(p_order_id);
        
    ELSIF p_status = 'REJECTED' OR p_status = 'CANCELLED' THEN
        IF v_current_order_status != 'PENDING' THEN
            RAISE EXCEPTION 'Transição ilegal: Não se pode cancelar um pedido no status %.', v_current_order_status;
        END IF;

        UPDATE payments SET status = p_status, external_id = p_external_id, updated_at = NOW() WHERE order_id = p_order_id;
        UPDATE orders SET payment_status = p_status, status = 'CANCELED', updated_at = NOW() WHERE id = p_order_id;
        PERFORM restore_stock(p_order_id, FALSE);

    ELSIF p_status = 'REFUNDED' OR p_status = 'CHARGEBACK' THEN
        IF v_current_order_status NOT IN ('PAID', 'SHIPPED', 'DELIVERED') THEN
            RAISE EXCEPTION 'Transição ilegal: Não se pode estornar um pedido no status %.', v_current_order_status;
        END IF;

        UPDATE payments SET status = p_status, external_id = p_external_id, updated_at = NOW() WHERE order_id = p_order_id;
        UPDATE orders SET payment_status = p_status, status = 'REFUNDED', updated_at = NOW() WHERE id = p_order_id;
        PERFORM restore_stock(p_order_id, TRUE);
        
    ELSE
        UPDATE payments SET status = p_status, external_id = p_external_id, updated_at = NOW() WHERE order_id = p_order_id;
    END IF;
END;
$function$;
-- ==========================================
-- FASE G - ATOMICIDADE DO CHECKOUT
-- ==========================================

-- Função transacional que garante que a criação do pedido, inserção dos itens
-- e reserva de estoque aconteçam em uma única transação atômica no banco.
-- Se reserve_stock() falhar (estoque insuficiente), toda a função é revertida (ROLLBACK),
-- garantindo que não existam pedidos "zumbis" ou sem estoque.

CREATE OR REPLACE FUNCTION public.create_order_transaction(
    p_profile_id uuid,
    p_subtotal numeric,
    p_discount_total numeric,
    p_shipping_total numeric,
    p_total numeric,
    p_shipping_address jsonb,
    p_billing_address jsonb,
    p_shipping_details jsonb,
    p_coupon_id uuid,
    p_notes text,
    p_items jsonb -- array of {variant_id, product_name, sku, price, quantity, total}
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id uuid;
    v_item jsonb;
BEGIN
    -- 1. Inserir Pedido
    INSERT INTO public.orders (
        profile_id, status, payment_status, subtotal, discount_total, 
        shipping_total, total, shipping_address, billing_address, 
        shipping_details, coupon_id, notes
    ) VALUES (
        p_profile_id, 'PENDING', 'PENDING', p_subtotal, p_discount_total,
        p_shipping_total, p_total, p_shipping_address, p_billing_address,
        p_shipping_details, p_coupon_id, p_notes
    ) RETURNING id INTO v_order_id;

    -- 2. Inserir Itens
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.order_items (
            order_id, variant_id, product_name, sku, price, quantity, total
        ) VALUES (
            v_order_id, 
            (v_item->>'variant_id')::uuid,
            v_item->>'product_name',
            v_item->>'sku',
            (v_item->>'price')::numeric,
            (v_item->>'quantity')::int,
            (v_item->>'total')::numeric
        );
    END LOOP;

    -- 3. Reservar Estoque Seguramente
    -- A função reserve_stock já usa FOR UPDATE e dispara RAISE EXCEPTION em caso de falta.
    -- O RAISE EXCEPTION nativo do PostgreSQL fará um ROLLBACK total em toda a função.
    PERFORM public.reserve_stock(v_order_id);

    RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_transaction FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_transaction FROM anon;
REVOKE ALL ON FUNCTION public.create_order_transaction FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_transaction TO service_role;
