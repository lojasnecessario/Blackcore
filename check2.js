const url = 'https://tgfmggkekjqxyrkgwvjp.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZm1nZ2tla2pxeHlya2d3dmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMjk2MDYsImV4cCI6MjA5ODYwNTYwNn0.dwkiMnRskejYJjgxsu2Yet7HOFgWX0MO7VvPNVtsiPM'

async function check() {
  const tables = ['profiles', 'orders', 'shipping_address', 'order_items', 'payments', 'payment_events']
  for (const t of tables) {
    try {
      const res = await fetch(`${url}/rest/v1/${t}?limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      })
      if (!res.ok) {
        console.log(`Table ${t}: Error ${res.status} ${res.statusText}`)
        continue
      }
      const data = await res.json()
      if (data && data.length > 0) {
        console.log(`Table ${t}: ${Object.keys(data[0]).join(', ')}`)
      } else {
        console.log(`Table ${t}: Empty or RLS restricted`)
      }
    } catch(e) {
      console.log(`Table ${t}: Exception ${e.message}`)
    }
  }
}
check()
