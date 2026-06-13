const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dpsjzpkrcwhnqbolmrmu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwc2p6cGtyY3dobnFib2xtcm11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTAxNDc4NSwiZXhwIjoyMDk2NTkwNzg1fQ.CJoqaI8YZ520LQb5e0zK76vdQ_ReyhgzLCiEg6wFIwo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const dummyState = {
    version: 1,
    currentRound: 1,
    totalRounds: 38,
    teams: Array.from({length: 20}).map((_, i) => ({ id: `team-${i}`, name: 'Team', stats: {v:1} })),
    matches: Array.from({length: 380}).map((_, i) => ({ round: 1, homeId: 'a', awayId: 'b' })),
    scorersMap: {}
  };
  const { data, error } = await supabase.from('draft_rooms').update({ competition_state: dummyState }).eq('id', '9810e5c1-a272-46f8-9c08-bcfdd687ca5f');
  console.log('DATA:', data);
  console.log('ERROR:', error);
}

check();
