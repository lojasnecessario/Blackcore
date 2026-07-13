import { corsHeaders, buildResponse, buildErrorResponse } from "../_shared/cors.ts";
import { getSupabaseClient, getServiceRoleClient } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return buildErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED', 405);

  try {
    const supabaseUser = getSupabaseClient(req);
    const supabaseAdmin = getServiceRoleClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    
    const { items, shipping_address, billing_address, coupon_code, notes, service_id, cep } = await req.json();

    if (!items || items.length === 0) return buildErrorResponse('Carrinho vazio', 'EMPTY_CART');
    if (!service_id) return buildErrorResponse('Método de entrega ausente', 'MISSING_SHIPPING');

    const groupedItems = new Map<string, number>();
    for (const item of items) {
       const qty = item.quantity;
       if (!Number.isSafeInteger(qty) || qty <= 0 || qty > 9999) return buildErrorResponse('Quantidade inválida.', 'INVALID_QUANTITY');
       groupedItems.set(item.variant_id, (groupedItems.get(item.variant_id) || 0) + qty);
    }
    const variantIds = Array.from(groupedItems.keys());

    const { data: variants, error: vErr } = await supabaseAdmin
      .from('product_variants')
      .select('id, price, sku, products(name, status)')
      .in('id', variantIds);
    if (vErr) throw vErr;

    if (variants.length !== variantIds.length) {
      return buildErrorResponse('Um ou mais produtos no carrinho foram removidos.', 'INVALID_CART');
    }

    let subtotal = 0;
    const finalOrderItems: any[] = [];
    
    for (const variantId of variantIds) {
      const quantity = groupedItems.get(variantId)!;
      const variant = variants.find((v: any) => v.id === variantId);
      const product = variant.products as any;
      
      if (product.status !== 'ACTIVE') return buildErrorResponse(`O produto ${product.name} não está mais disponível.`, 'PRODUCT_INACTIVE');
      
      const price = Number(variant.price);
      if (isNaN(price) || price <= 0) return buildErrorResponse(`Falha de precificação em ${product.name}.`, 'INVALID_PRICE');
      
      const total = price * quantity;
      subtotal += total;

      finalOrderItems.push({
        variant_id: variant.id,
        product_name: product.name,
        sku: variant.sku,
        price,
        quantity,
        total
      });
    }

    let shipping_cost = 0;
    let shippingDetails = {
      provider: 'manual', service_id: 'pickup', name: 'Retirada Local',
      cost: 0, estimated_days: 1, tracking_code: null, carrier: null, tracking_url: null
    };

    if (service_id === 'pickup') {
       shipping_cost = 0;
    } else {
      const actualCep = cep || (shipping_address ? shipping_address.zip_code : null);
      if (!actualCep) return buildErrorResponse('CEP de envio não encontrado.', 'INVALID_SHIPPING');
      const cleanCep = actualCep.replace(/\D/g, '');
      const { data: zone } = await supabaseAdmin.from('shipping_zones').select('*')
        .eq('id', service_id).eq('active', true).lte('cep_start', cleanCep).gte('cep_end', cleanCep).single();
        
      if (!zone) return buildErrorResponse('Serviço de entrega inválido ou não disponível para este CEP.', 'INVALID_SHIPPING');
      
      shipping_cost = Number(zone.price);
      shippingDetails = { ...shippingDetails, service_id: zone.id, name: zone.name, cost: shipping_cost, estimated_days: zone.estimated_days, carrier: zone.name };
    }

    let discount_value = 0, coupon_id = null;
    if (coupon_code) {
      const { data: couponRes, error: rpcErr } = await supabaseAdmin.rpc('validate_and_calculate_coupon', {
        p_code: coupon_code,
        p_profile_id: user?.id || null,
        p_subtotal: subtotal,
        p_shipping_cost: shipping_cost
      });

      if (rpcErr) throw rpcErr;
      if (!couponRes.is_valid) return buildErrorResponse(couponRes.error_message || 'Cupom inválido ou esgotado', 'INVALID_COUPON');

      discount_value = couponRes.discount_value || 0;
      coupon_id = couponRes.coupon_id;
    }

    let finalTotal = subtotal + shipping_cost - discount_value;
    if (finalTotal < 0) finalTotal = 0;

    const { data: newOrderId, error: txError } = await supabaseAdmin.rpc('create_order_transaction', {
        p_profile_id: user?.id || null,
        p_subtotal: subtotal,
        p_discount_total: discount_value,
        p_shipping_total: shipping_cost,
        p_total: finalTotal,
        p_shipping_address: shipping_address || {},
        p_billing_address: billing_address || shipping_address || {},
        p_shipping_details: shippingDetails,
        p_coupon_id: coupon_id,
        p_notes: notes || '',
        p_items: finalOrderItems
    });

    if (txError) {
        if (txError.message.includes('Estoque insuficiente')) {
            return buildErrorResponse('Um ou mais itens não possuem estoque suficiente', 'OUT_OF_STOCK');
        }
        throw txError;
    }

    const { data: finalOrder } = await supabaseAdmin.from('orders').select('order_number, total').eq('id', newOrderId).single();

    return buildResponse({
      checkout_id: newOrderId, 
      order_number: finalOrder?.order_number, 
      total: finalOrder?.total || finalTotal,
      message: 'Checkout criado e estoque reservado com sucesso'
    });
  } catch (error: any) {
    return buildErrorResponse('Erro interno no servidor', 'INTERNAL_ERROR');
  }
});
