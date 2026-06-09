import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { creatorName, settings } = await request.json();
    
    if (!creatorName || !settings) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const duelId = crypto.randomBytes(4).toString('hex');
    
    const { error } = await supabase
      .from('duels')
      .insert({
        duel_id: duelId,
        creator_name: creatorName,
        creator_team_json: '[]',
        creator_score: 0,
        settings: JSON.stringify(settings),
        status: 'creating'
      });

    if (error) throw error;

    return NextResponse.json({ duelId });
  } catch (error) {
    console.error('Error creating duel:', error);
    return NextResponse.json({ error: 'Failed to create duel' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data: row, error } = await supabase
      .from('duels')
      .select('*')
      .eq('duel_id', id)
      .single();
    
    if (error || !row) return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
    
    return NextResponse.json({
      duel_id: row.duel_id,
      creator_name: row.creator_name,
      creator_team: row.creator_team_json ? JSON.parse(row.creator_team_json) : [],
      creator_score: row.creator_score,
      status: row.status,
      challenger_name: row.challenger_name,
      challenger_team: row.challenger_team_json ? JSON.parse(row.challenger_team_json) : null,
      challenger_score: row.challenger_score,
      settings: row.settings ? JSON.parse(row.settings) : {},
      created_at: row.created_at
    });
  } catch (error) {
    console.error('Error fetching duel:', error);
    return NextResponse.json({ error: 'Failed to fetch duel' }, { status: 500 });
  }
}
