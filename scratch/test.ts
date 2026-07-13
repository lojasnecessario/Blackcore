const SUPABASE_URL = "https://tgfmggkekjqxyrkgwvjp.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZm1nZ2tla2pxeHlya2d3dmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMjk2MDYsImV4cCI6MjA5ODYwNTYwNn0.dwkiMnRskejYJjgxsu2Yet7HOFgWX0MO7VvPNVtsiPM";

// Função utilitária para chamar as Edge Functions
async function invokeFunction(name: string, payload: any = {}, headers: any = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
      ...headers
    },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

async function runTests() {
  console.log("=== INICIANDO TESTES DAS EDGE FUNCTIONS ===\n");
  const report: any[] = [];

  const addReport = (name: string, payload: any, result: any, passed: boolean, error: string = "") => {
    report.push({
      function: name,
      payload,
      response: result,
      status: passed ? "Aprovado" : "Reprovado",
      error: passed ? "Nenhum" : error
    });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}`);
  };

  try {
    // 1. calculate-cart (Item válido)
    const calcPayload = { items: [{ variant_id: "af20655c-7707-40e1-8110-762a15e52169", quantity: 2 }] };
    let res = await invokeFunction('calculate-cart', calcPayload);
    addReport('calculate-cart (Válido)', calcPayload, res, res.success === true);

    // 1b. calculate-cart (Inválido)
    const calcFailPayload = { items: [{ variant_id: "invalid-id", quantity: 1 }] };
    res = await invokeFunction('calculate-cart', calcFailPayload);
    addReport('calculate-cart (Inválido)', calcFailPayload, res, res.success === false && res.error);

    // 2. apply-coupon (Inexistente)
    const cupFailPayload = { cart_id: "no-cart", coupon_code: "FAKE100" };
    res = await invokeFunction('apply-coupon', cupFailPayload);
    addReport('apply-coupon (Inexistente)', cupFailPayload, res, res.success === false && res.error?.code === 'COUPON_NOT_FOUND');

    // 3. create-checkout (Estoque insuficiente/Carrinho vazio para falhar rápido)
    const checkoutFailPayload = { items: [], coupon_code: "" };
    res = await invokeFunction('create-checkout', checkoutFailPayload);
    addReport('create-checkout (Inválido)', checkoutFailPayload, res, res.success === false);

    // 3b. create-checkout (Válido)
    const checkoutPayload = { 
      items: [{ variant_id: "af20655c-7707-40e1-8110-762a15e52169", quantity: 1 }], 
      shipping_address: { city: "SP" } 
    };
    res = await invokeFunction('create-checkout', checkoutPayload);
    const checkoutId = res.success ? res.data.checkout_id : null;
    addReport('create-checkout (Válido)', checkoutPayload, res, res.success === true);

    // 4. create-order (mercadopago)
    if (checkoutId) {
      const orderPayload = { checkout_id: checkoutId, provider: "mercadopago" };
      res = await invokeFunction('create-order', orderPayload);
      addReport('create-order (mercadopago)', orderPayload, res, res.success === true && res.data.payment.provider === 'mercadopago');

      // 5. payment-webhook (APPROVED)
      const hookPayload = { action: "payment.created", status: "approved", external_reference: checkoutId, data: { id: "txn_123" } };
      res = await invokeFunction('payment-webhook?provider=mercadopago', hookPayload);
      addReport('payment-webhook (APPROVED)', hookPayload, res, res.success === true);
    } else {
      console.log("[SKIP] create-order e webhook pulados pois checkout falhou");
    }

    // 6. admin-products-crud (Deve falhar se tentarmos sem Auth real de ADMIN)
    const adminPayload = { action: "CREATE", product: { name: "Test" } };
    res = await invokeFunction('admin-products-crud', adminPayload);
    addReport('admin-products-crud (Auth Falha Esperada)', adminPayload, res, res.success === false && res.error);

    console.log("\n=== TESTES CONCLUÍDOS ===");
    Deno.writeTextFileSync("edge-functions-test-report.json", JSON.stringify(report, null, 2));
    console.log("Relatório salvo em edge-functions-test-report.json");

  } catch (e: any) {
    console.error("Erro fatal nos testes:", e);
  }
}

runTests();
