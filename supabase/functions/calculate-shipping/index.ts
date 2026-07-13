import { corsHeaders, buildResponse, buildErrorResponse } from "../_shared/cors.ts";
import { getServiceRoleClient } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return buildErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  try {
    const { cep } = await req.json();

    if (!cep || typeof cep !== 'string') {
      return buildErrorResponse('CEP é obrigatório', 'INVALID_INPUT', 400);
    }

    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      return buildErrorResponse('CEP inválido', 'INVALID_INPUT', 400);
    }

    const supabaseAdmin = getServiceRoleClient();

    // Sempre incluir Retirada Local
    const options = [
      {
        id: 'pickup',
        name: 'Retirada Local (Loja Física)',
        price: 0,
        estimated_days: 1
      }
    ];

    // Buscar zonas manuais que batem com o CEP
    // Como cep é string no banco e cleanCep é string, podemos comparar alfabeticamente se os tamanhos baterem (ambos 8 digitos numéricos).
    const { data: zones, error } = await supabaseAdmin
      .from('shipping_zones')
      .select('*')
      .eq('active', true)
      .lte('cep_start', cleanCep)
      .gte('cep_end', cleanCep);

    if (error) {
      console.error('Erro ao buscar zonas de entrega:', error);
      throw new Error('Falha ao calcular frete nas zonas');
    }

    if (zones && zones.length > 0) {
      zones.forEach((zone: any) => {
        options.push({
          id: zone.id,
          name: zone.name,
          price: Number(zone.price),
          estimated_days: zone.estimated_days
        });
      });
    }

    return buildResponse({ options });

  } catch (error: any) {
    console.error('Calculate Shipping Error:', error);
    return buildErrorResponse(error.message, 'INTERNAL_ERROR', 500);
  }
});
