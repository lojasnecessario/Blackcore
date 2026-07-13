const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://tgfmggkekjqxyrkgwvjp.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZm1nZ2tla2pxeHlya2d3dmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMjk2MDYsImV4cCI6MjA5ODYwNTYwNn0.dwkiMnRskejYJjgxsu2Yet7HOFgWX0MO7VvPNVtsiPM";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
  console.log("Criando usuário admin...");
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@blackcore.com',
    password: 'adminpassword123',
  });

  if (error) {
    console.error("Erro no signup:", error);
    process.exit(1);
  }

  console.log("Usuário criado!", data.user.id);
}

main();
