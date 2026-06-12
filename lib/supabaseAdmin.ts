import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ Supabase Service Role Key missing in environment variables. This is expected during some build steps, but make sure to add it to Vercel Environment Variables!');
}

// Cria um client que ignora completamente as políticas de RLS.
// ATENÇÃO: NUNCA USE ESTE CLIENTE NO LADO DO CLIENTE (NAVEGADOR).
// USE APENAS EM API ROUTES (/app/api/...) OU SERVER ACTIONS.
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
