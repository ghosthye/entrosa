import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { duelId, role } = await request.json();
    
    if (!duelId || !role) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const { data: row, error } = await supabase
      .from('duels')
      .select('settings')
      .eq('duel_id', duelId)
      .single();
    
    if (error || !row) return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
    
    const settings = JSON.parse(row.settings);
    if (role === 'creator') settings.creatorReady = true;
    if (role === 'challenger') settings.challengerReady = true;
    
    // Se ambos estiverem prontos, define o momento exato de início da partida (3 segundos no futuro)
    if (settings.creatorReady && settings.challengerReady && !settings.matchStartTime) {
      settings.matchStartTime = Date.now() + 3000;
    }
    
    const { error: updateError } = await supabase
      .from('duels')
      .update({ settings: JSON.stringify(settings) })
      .eq('duel_id', duelId);
      
    if (updateError) throw updateError;

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating ready status:', error);
    return NextResponse.json({ error: 'Failed to update ready status' }, { status: 500 });
  }
}
