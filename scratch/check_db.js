const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: pData } = await supabase.from('products').select('*').limit(1);
  console.log('Products:', pData && pData.length > 0 ? Object.keys(pData[0]) : 'no data or empty');

  const { data: pvData } = await supabase.from('product_variants').select('*').limit(1);
  console.log('Variants:', pvData && pvData.length > 0 ? Object.keys(pvData[0]) : 'no data or empty');
}

check();
