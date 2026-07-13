import { corsHeaders, buildResponse, buildErrorResponse } from "../_shared/cors.ts";
import { getServiceRoleClient } from "../_shared/supabase.ts";

// Helper de log separado
async function logEvent(supabaseAdmin: any, type: string, payload: any, eventType: string, msg: string) {
    try {
      await supabaseAdmin.from('payment_events').insert({
        provider: 'vega',
        event_type: eventType,
        raw_payload: payload,
        error_message: msg,
        processed: false
      });
    } catch(e) {}
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return buildErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  const supabaseAdmin = getServiceRoleClient();
  let rawPayloadStr = '';

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get('provider');
    rawPayloadStr = await req.text();
    let payload;
    try {
        payload = JSON.parse(rawPayloadStr);
    } catch (e) {
        return buildErrorResponse('Payload JSON malformado', 'INVALID_JSON', 400);
    }

    if (provider !== 'vega') {
      return buildErrorResponse('Apenas Vega suportado', 'INVALID_PROVIDER');
    }

    const webhookSecret = Deno.env.get('VEGA_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('Chave VEGA_WEBHOOK_SECRET Ausente no Ambiente.');
    }

    // Validação de Autenticação (Header ou Query)
    const authHeader = req.headers.get('Authorization');
    const queryToken = url.searchParams.get('token');
    
    let isAuthenticated = false;
    if (authHeader && authHeader === `Bearer ${webhookSecret}`) {
      isAuthenticated = true;
    } else if (queryToken && queryToken === webhookSecret) {
      isAuthenticated = true;
    }

    if (!isAuthenticated) {
      await logEvent(supabaseAdmin, 'error', payload, 'UNAUTHORIZED_WEBHOOK', 'Token de autenticação inválido ou ausente.');
      return buildErrorResponse('Não autorizado', 'UNAUTHORIZED', 403);
    }

    // Parse Payload Vega
    const transactionToken = payload.transaction_token;
    const externalCode = payload.external_code;
    const totalPrice = payload.total_price;
    const vegaStatus = payload.status;

    if (!transactionToken || !externalCode) {
      return buildErrorResponse('Payload inválido: transaction_token ou external_code ausente', 'INVALID_PAYLOAD');
    }

    // Consulta do Pedido no Banco
    const order_id = externalCode;
    const { data: order, error: orderErr } = await supabaseAdmin.from('orders').select('total').eq('id', order_id).single();
    
    if (orderErr || !order) {
      return buildErrorResponse('Referência de Pedido não encontrada no banco', 'INVALID_ORDER', 404);
    }

    // Match de Valor Financeiro (Anti-Spoofing)
    // O Vega envia total_price em centavos
    const payloadTotal = Number(totalPrice) / 100;
    const diffValue = Math.abs(payloadTotal - Number(order.total));
    
    if (diffValue > 0.01) {
      await logEvent(supabaseAdmin, 'error', payload, 'VALUE_MISMATCH', `Divergência Crítica. Pedido: ${order.total}, Pago: ${payloadTotal}`);
      return buildErrorResponse('Valor recebido não corresponde ao total exato do pedido.', 'FRAUD_DETECTED', 403);
    }

    // Mapeamento de Status Vega -> Status BD
    let db_status = '';
    if (vegaStatus === 'approved') db_status = 'APPROVED';
    else if (vegaStatus === 'pending' || vegaStatus === 'in_process') db_status = 'PENDING';
    else if (vegaStatus === 'refused') db_status = 'REJECTED';
    else if (vegaStatus === 'canceled' || vegaStatus === 'expired') db_status = 'CANCELLED';
    else if (vegaStatus === 'refunded') db_status = 'REFUNDED';
    else if (vegaStatus === 'charge_back') db_status = 'CHARGEBACK';
    else if (vegaStatus === 'in_dispute') db_status = 'IN_DISPUTE';
    else db_status = 'PENDING'; // fallback seguro

    // Log Central de Auditoria para Sucesso (Idempotência Passiva)
    const { error: eventErr } = await supabaseAdmin
      .from('payment_events')
      .insert({
        provider: 'vega',
        event_type: 'payment.webhook',
        external_payment_id: transactionToken,
        external_reference: order_id,
        status: db_status,
        raw_payload: payload,
        verified_payload: payload, // Sem reverse fetch no Vega por enquanto
        processed: true
      });
    
    if (eventErr) console.error("Erro ao logar evento:", eventErr);

    // Idempotência Primária da Edge Function
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('status')
      .eq('order_id', order_id)
      .eq('external_id', transactionToken)
      .single();
    
    if (existingPayment && existingPayment.status === db_status) {
      return buildResponse({ message: 'Webhook já processado anteriormente' });
    }

    // Máquina de Estados Definitiva no Banco (SQL RPC)
    const { error } = await supabaseAdmin.rpc('handle_payment_webhook', { 
      p_order_id: order_id, 
      p_status: db_status, 
      p_external_id: transactionToken 
    });

    if (error) {
       throw error;
    }

    return buildResponse({ message: 'Webhook processado e integrado com sucesso' });

  } catch (error: any) {
    console.error('Webhook error:', error);
    let safePayload = null;
    try { safePayload = rawPayloadStr ? JSON.parse(rawPayloadStr) : null; } catch(e) {}
    
    await logEvent(supabaseAdmin, 'error', safePayload, 'WEBHOOK_ERROR', error.message);
    return buildErrorResponse(error.message, 'WEBHOOK_ERROR', 400);
  }
});
