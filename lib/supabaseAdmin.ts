import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('⚠️ Supabase URL or Service Role Key missing in environment variables.');
}

// Cria um client que ignora completamente as políticas de RLS.
// ATENÇÃO: NUNCA USE ESTE CLIENTE NO LADO DO CLIENTE (NAVEGADOR).
// USE APENAS EM API ROUTES (/app/api/...) OU SERVER ACTIONS.
export const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceRoleKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
