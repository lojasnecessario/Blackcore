import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function check() {
  const tables = ['profiles', 'orders', 'shipping_address', 'order_items', 'payments']
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1)
    console.log(`\nTable ${t}:`)
    if (error) {
      console.log('Error:', error.message)
    } else if (data && data.length > 0) {
      console.log(Object.keys(data[0]).join(', '))
    } else {
      console.log('Empty table, cannot infer schema via select *')
    }
  }
}
check()
