import { corsHeaders, buildResponse, buildErrorResponse } from "../_shared/cors.ts";
import { getSupabaseClient, getServiceRoleClient } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return buildErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  try {
    const supabaseUser = getSupabaseClient(req);
    
    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : '';
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser(token);
    if (authErr || !user) throw new Error('Usuário não autenticado');

    const { data: profile } = await supabaseUser.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'EMPLOYEE')) {
      return buildErrorResponse('Acesso Negado: Apenas Administradores ou Funcionários podem gerenciar o catálogo', 'FORBIDDEN', 403);
    }

    // 2. Extrair dados
    const payload = await req.json();
    const action = payload.action; 
    const productData = payload.product; 
    const variantsData = payload.variants || []; 

    const supabaseAdmin = getServiceRoleClient(); // Usado para operações cross-tables seguras

    if (action === 'CREATE') {
       // A. Criar Produto
       const name = productData.name || '';
       let slug = productData.slug;
       if (!slug && name) {
         slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
         // Add random suffix to avoid collision
         slug = `${slug}-${Math.floor(Math.random() * 10000)}`;
       }
       productData.slug = slug;

       const { data: newProduct, error: pErr } = await supabaseAdmin
         .from('products')
         .insert(productData)
         .select()
         .single();
       if (pErr) throw pErr;

       // B. Criar Variantes e injetar estoque inicial
       const variantsToInsert = variantsData.map((v: any) => ({
          product_id: newProduct.id,
          sku: v.sku,
          price: v.price,
          compare_at_price: v.compare_at_price,
          weight: v.weight,
          attributes: v.attributes,
       }));

       if (variantsToInsert.length > 0) {
         const { data: insertedVariants, error: vErr } = await supabaseAdmin
            .from('product_variants')
            .insert(variantsToInsert)
            .select();
         if (vErr) throw vErr;

         for (const v of variantsData) {
            const dbVariant = insertedVariants.find((iv: any) => iv.sku === v.sku);
            if (dbVariant && v.initial_stock > 0) {
                // Update available
                await supabaseAdmin.from('inventory_levels').update({ available: v.initial_stock }).eq('variant_id', dbVariant.id);
                // Insert IN movement
                await supabaseAdmin.from('inventory_movements').insert({
                   variant_id: dbVariant.id,
                   type: 'IN',
                   quantity: v.initial_stock,
                   notes: 'Initial stock from admin panel'
                });
            }
         }
       }

       return buildResponse({ message: 'Produto e variações criados com sucesso', product_id: newProduct.id, slug: slug });

    } else if (action === 'UPDATE') {
       const { product_id } = payload;
       const variantsToDelete = payload.variantsToDelete || [];
       if (!product_id) throw new Error('product_id é obrigatório para UPDATE');

       // A. Atualizar Produto
       if (productData && Object.keys(productData).length > 0) {
           let slug = productData.slug;
           if (!slug && productData.name) {
             slug = productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
             slug = `${slug}-${Math.floor(Math.random() * 10000)}`;
             productData.slug = slug;
           }
           const { error: pErr } = await supabaseAdmin
             .from('products')
             .update(productData)
             .eq('id', product_id);
           if (pErr) throw pErr;
       }

       // B. Excluir variantes deletadas (ou arquivar caso tenham pedidos)
       if (variantsToDelete.length > 0) {
         for (const delId of variantsToDelete) {
           const { error: delErr } = await supabaseAdmin.from('product_variants').delete().eq('id', delId);
           if (delErr) {
             // Provavelmente Foreign Key violation. Vamos arquivar injetando status inativo nos atributos
             const { data: currentVar } = await supabaseAdmin.from('product_variants').select('attributes').eq('id', delId).single();
             if (currentVar) {
                const newAttrs = { ...(currentVar.attributes || {}), active: false, archived: true };
                await supabaseAdmin.from('product_variants').update({ attributes: newAttrs }).eq('id', delId);
             }
           } else {
             // Apagar também o nível de estoque se o delete funcionou (on delete cascade não existe?)
             await supabaseAdmin.from('inventory_levels').delete().eq('variant_id', delId);
           }
         }
       }

       // C. Atualizar ou Criar Variações
       if (variantsData.length > 0) {
           for (const v of variantsData) {
               let currentVariantId = v.id;

               // Se tem ID, atualiza variante existente
               if (currentVariantId) {
                   const { error: vUpdateErr } = await supabaseAdmin
                     .from('product_variants')
                     .update({
                         sku: v.sku,
                         price: v.price,
                         compare_at_price: v.compare_at_price,
                         weight: v.weight,
                         attributes: v.attributes
                     })
                     .eq('id', currentVariantId);
                   if (vUpdateErr) throw vUpdateErr;
               } else {
                   // Se não tem ID, é uma variante nova sendo adicionada a um produto existente
                   const { data: newVar, error: vInsertErr } = await supabaseAdmin
                     .from('product_variants')
                     .insert({
                         product_id: product_id,
                         sku: v.sku,
                         price: v.price,
                         compare_at_price: v.compare_at_price,
                         weight: v.weight,
                         attributes: v.attributes
                     })
                     .select()
                     .single();
                   if (vInsertErr) throw vInsertErr;
                   currentVariantId = newVar.id;
                   
                   // Inicializar estoque para variante nova, se existir
                   if (v.initial_stock > 0) {
                       await supabaseAdmin.from('inventory_levels').update({ available: v.initial_stock }).eq('variant_id', currentVariantId);
                       await supabaseAdmin.from('inventory_movements').insert({
                           variant_id: currentVariantId,
                           type: 'IN',
                           quantity: v.initial_stock,
                           notes: 'Initial stock from admin panel'
                       });
                   }
               }

               // D. Gestão de Estoque (add_stock) para inventory_movements seguro (apenas se for ajuste manual)
               if (v.add_stock && v.add_stock !== 0) {
                   const type = v.add_stock > 0 ? 'IN' : 'OUT';
                   const qty = Math.abs(v.add_stock);

                   // Recuperar o inventory_level atual para calcular o novo total
                   const { data: currentInv } = await supabaseAdmin
                       .from('inventory_levels')
                       .select('available')
                       .eq('variant_id', currentVariantId)
                       .single();

                   const newAvailable = (currentInv?.available || 0) + v.add_stock;
                   if (newAvailable < 0) {
                       throw new Error(`Estoque insuficiente para a variante SKU: ${v.sku}`);
                   }

                   // Atualiza total
                   await supabaseAdmin
                       .from('inventory_levels')
                       .update({ available: newAvailable })
                       .eq('variant_id', currentVariantId);

                   // Grava histórico
                   await supabaseAdmin
                       .from('inventory_movements')
                       .insert({
                           variant_id: currentVariantId,
                           type: type,
                           quantity: qty,
                           notes: `Manual adjustment from admin panel (${v.add_stock > 0 ? '+' : ''}${v.add_stock})`
                       });
               }
           }
       }

       return buildResponse({ message: 'Produto atualizado com sucesso' });

    } else if (action === 'ARCHIVE') {
       const { product_id } = payload;
       if (!product_id) throw new Error('product_id é obrigatório para ARCHIVE');
       const { error } = await supabaseAdmin.from('products').update({ status: 'ARCHIVED' }).eq('id', product_id);
       if (error) throw error;
       return buildResponse({ message: 'Produto arquivado com sucesso' });
    }

    return buildErrorResponse('Ação inválida', 'INVALID_ACTION');

  } catch (error: any) {
    return buildErrorResponse(error.message);
  }
});
