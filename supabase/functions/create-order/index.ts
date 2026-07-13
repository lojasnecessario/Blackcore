import { corsHeaders, buildResponse, buildErrorResponse } from "../_shared/cors.ts";
import { getServiceRoleClient } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return buildErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  try {
    const supabaseAdmin = getServiceRoleClient();
    
    // Agora aceita service_id e cep vindos do frontend
    const { checkout_id, provider, service_id, cep } = await req.json();

    if (!checkout_id || !provider) {
      return buildErrorResponse('Informe checkout_id e provider', 'INVALID_INPUT');
    }

    // Buscar a ordem (total aqui é tratado como subtotal + descontos)
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', checkout_id)
      .single();

    if (orderErr || !order) {
      return buildErrorResponse('Checkout não encontrado', 'CHECKOUT_NOT_FOUND');
    }

    if (order.status !== 'PENDING' || order.payment_status !== 'PENDING') {
      return buildErrorResponse('Checkout já processado ou cancelado', 'CHECKOUT_INVALID_STATE');
    }

    // ==========================================
    // RE-CÁLCULO E SEGURANÇA DE FRETE (Backend)
    // ==========================================
    let freightValue = 0;
    let shippingDetails = {
      provider: 'manual',
      service_id: 'pickup',
      name: 'Retirada Local',
      cost: 0,
      estimated_days: 1,
      tracking_code: null,
      carrier: null,
      tracking_url: null
    };

    if (service_id && service_id !== 'pickup') {
      const cleanCep = (cep || '').replace(/\D/g, '');
      const { data: zone } = await supabaseAdmin
        .from('shipping_zones')
        .select('*')
        .eq('id', service_id)
        .eq('active', true)
        .lte('cep_start', cleanCep)
        .gte('cep_end', cleanCep)
        .single();
      
      if (!zone) {
        return buildErrorResponse('Serviço de entrega não disponível para este CEP ou inválido', 'INVALID_SHIPPING');
      }

      freightValue = Number(zone.price);
      shippingDetails = {
        provider: 'manual',
        service_id: zone.id,
        name: zone.name,
        cost: freightValue,
        estimated_days: zone.estimated_days,
        tracking_code: null,
        carrier: zone.name,
        tracking_url: null
      };
    }

    // Consideramos que order.total na criação inicial do pedido não tinha frete embutido
    const finalTotal = Number(order.total) + freightValue;

    // Atualiza o pedido com os detalhes de frete e o novo total definitivo
    await supabaseAdmin.from('orders').update({
      shipping_details: shippingDetails,
      total: finalTotal
    }).eq('id', checkout_id);
    // ==========================================

    let external_id = '';
    let checkout_url = '';
    let client_secret = '';

    const SITE_URL = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000';
    const FUNCTIONS_URL = Deno.env.get('SUPABASE_FUNCTIONS_URL') || 'http://localhost:54321/functions/v1';

    if (provider === 'vega') {
      const apiKey = Deno.env.get('VEGA_API_KEY');
      const domain = Deno.env.get('VEGA_DOMAIN');

      if (!apiKey || !domain) {
        throw new Error('VEGA_API_KEY ou VEGA_DOMAIN não configurado');
      }

      const shippingAddress = order.shipping_address as any;
      const payerEmail = shippingAddress?.buyer_email || 'test_user_123456@testuser.com';
      const payerName = shippingAddress?.buyer_name || 'Comprador';
      
      // Converte o total com frete para centavos
      const paymentValueCents = Math.round(finalTotal * 100);
      const freightValueCents = Math.round(freightValue * 100);

      // Usamos apenas um produto que reflete o pedido inteiro para evitar erros de soma no Vega
      const products = [{
        code: String(order.order_number),
        name: `Pedido #${order.order_number} - BlackCore`,
        price: paymentValueCents,
        quantity: 1,
        is_digital: false,
        description: 'Compra online'
      }];

      const vegaPayload = {
        customer: {
          name: payerName,
          email: payerEmail,
          document: shippingAddress?.buyer_document || '00000000000', 
          phone: shippingAddress?.buyer_phone || '11999999999',
          address: {
            street: shippingAddress?.street || 'Rua',
            number: shippingAddress?.number || '0',
            complement: shippingAddress?.complement || '',
            district: shippingAddress?.neighborhood || 'Bairro',
            city: shippingAddress?.city || 'Cidade',
            state: shippingAddress?.state || 'SP',
            zipcode: (shippingAddress?.zip_code || '00000000').replace(/\D/g, '')
          }
        },
        payment: {
          method: 'pix',
          payment_value: paymentValueCents,
          freight_value: freightValueCents,
          discount_value: 0,
          external_code: order.id,
          currency: 'BRL'
        },
        products: products,
        notification_url: `${FUNCTIONS_URL}/payment-webhook?provider=vega`
      };

      const vegaResponse = await fetch('https://api.vegacheckout.com.br/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
          'x-domain': domain
        },
        body: JSON.stringify(vegaPayload)
      });

      if (!vegaResponse.ok) {
        const errText = await vegaResponse.text();
        console.error('Erro Vega API:', errText);
        return buildErrorResponse('Erro na integração com Vega Checkout', 'VEGA_ERROR');
      }

      const vegaData = await vegaResponse.json();
      
      if (vegaData.status !== 'success' || !vegaData.data) {
        console.error('Erro na resposta Vega:', vegaData);
        return buildErrorResponse('Erro na geração de PIX Vega', 'VEGA_ERROR');
      }
      
      external_id = vegaData.data.transaction_token;
      
      // Salva o codigo pix para retornar
      const pix_copy_paste = vegaData.data.pix_copy_paste;

      // Criar registro na tabela payments
      const { error: payErr } = await supabaseAdmin
        .from('payments')
        .insert({
          order_id: checkout_id,
          provider,
          external_id,
          amount: finalTotal,
          status: 'PENDING',
          method: 'pix',
          payment_details: { pix_code: pix_copy_paste }
        });

      if (payErr) throw payErr;

      return buildResponse({
        order_id: checkout_id,
        order_number: order.order_number,
        payment: {
          provider,
          external_id,
          pix_copy_paste
        }
      });

    } else {
      return buildErrorResponse('Provedor de pagamento não suportado', 'INVALID_PROVIDER');
    }

  } catch (error: any) {
    console.error('Create Order Error:', error);
    return buildErrorResponse(error.message);
  }
});
