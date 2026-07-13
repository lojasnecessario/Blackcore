export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function buildResponse(data: any, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

export function buildErrorResponse(message: string, code = 'ERROR', status = 400) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
