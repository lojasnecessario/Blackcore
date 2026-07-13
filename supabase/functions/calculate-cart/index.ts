import { corsHeaders, buildResponse, buildErrorResponse } from "../_shared/cors.ts";
import { getSupabaseClient, getServiceRoleClient } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return buildErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED', 405);

  try {
    const supabaseUser = getSupabaseClient(req);
    const supabaseAdmin = getServiceRoleClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    const { items, coupon_code, cep, service_id } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) return buildErrorResponse('Carrinho vazio', 'EMPTY_CART');
    if (!service_id) return buildErrorResponse('Selecione um método de entrega', 'MISSING_SHIPPING');

    const groupedItems = new Map<string, number>();
    for (const item of items) {
       const qty = item.quantity;
       if (!Number.isSafeInteger(qty) || qty <= 0 || qty > 9999) {
           return buildErrorResponse('Quantidade de item inválida.', 'INVALID_QUANTITY');
       }
       groupedItems.set(item.variant_id, (groupedItems.get(item.variant_id) || 0) + qty);
    }
    const variantIds = Array.from(groupedItems.keys());

    const { data: variants, error: vErr } = await supabaseAdmin
      .from('product_variants')
      .select('id, price, products(status, name)')
      .in('id', variantIds);
    if (vErr) throw vErr;

    if (variants.length !== variantIds.length) {
      return buildErrorResponse('Um ou mais produtos no carrinho não existem mais.', 'INVALID_CART');
    }

    let subtotal = 0;
    for (const variantId of variantIds) {
      const quantity = groupedItems.get(variantId)!;
      const variant = variants.find((v: any) => v.id === variantId);
      
      const product = variant.products as any;
      if (product.status !== 'ACTIVE') {
         return buildErrorResponse(`O produto ${product.name} não está mais disponível.`, 'PRODUCT_INACTIVE');
      }

      const price = Number(variant.price);
      if (isNaN(price) || price <= 0) {
         return buildErrorResponse(`Erro de precificação no produto ${product.name}. Contate o suporte.`, 'INVALID_PRICE');
      }

      subtotal += price * quantity;
    }

    let shipping_cost = 0;
    if (service_id === 'pickup') {
      shipping_cost = 0;
    } else {
      if (!cep) return buildErrorResponse('CEP obrigatório para envio.', 'INVALID_SHIPPING');
      const cleanCep = cep.replace(/\D/g, '');
      const { data: zone } = await supabaseAdmin.from('shipping_zones').select('price')
        .eq('id', service_id).eq('active', true).lte('cep_start', cleanCep).gte('cep_end', cleanCep).single();
      
      if (!zone) return buildErrorResponse('Serviço de entrega inválido ou inativo para esta região.', 'INVALID_SHIPPING');
      shipping_cost = Number(zone.price);
    }

    let discount_value = 0, coupon_id = null, coupon_type = null, coupon_valid = false, coupon_message = null;

    if (coupon_code) {
      const { data: couponRes, error: rpcErr } = await supabaseAdmin.rpc('validate_and_calculate_coupon', {
        p_code: coupon_code,
        p_profile_id: user?.id || null,
        p_subtotal: subtotal,
        p_shipping_cost: shipping_cost
      });

      if (rpcErr) throw rpcErr;

      coupon_valid = couponRes.is_valid;
      coupon_message = couponRes.error_message;
      discount_value = couponRes.discount_value || 0;
      coupon_id = couponRes.coupon_id;
      coupon_type = couponRes.type;
    }

    let total = subtotal + shipping_cost - discount_value;
    if (total < 0) total = 0;

    return buildResponse({
      subtotal, shipping_cost, discount_value, total, coupon_id, coupon_type, coupon_valid, coupon_message
    });
  } catch (err: any) {
    return buildErrorResponse('Erro interno', 'INTERNAL_ERROR', 500);
  }
});
