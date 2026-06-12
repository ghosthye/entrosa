require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
CREATE TABLE IF NOT EXISTS public.daily_puzzles (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  formation TEXT NOT NULL,
  starting_player_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.daily_puzzles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Puzzles" ON public.daily_puzzles FOR SELECT USING (true);
CREATE POLICY "Admin All Puzzles" ON public.daily_puzzles USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
`;

supabase.rpc('exec_sql', { sql: sql }).then(r => {
  console.log('TABLE CREATED:', r);
}).catch(e => {
  console.error('ERROR:', e);
});
