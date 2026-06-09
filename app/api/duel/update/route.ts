import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { simulateMatch } from '@/lib/simulation';

export async function PUT(request: Request) {
  try {
    const { duelId, role, team, score, playerName } = await request.json();
    
    if (!duelId || !role || !team) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (role === 'creator') {
       const { error, count } = await supabase
         .from('duels')
         .update({ 
           creator_team_json: JSON.stringify(team), 
           creator_score: score, 
           status: 'pending' 
         })
         .eq('duel_id', duelId)
         .eq('status', 'creating');

       if (error || count === 0) return NextResponse.json({ error: 'Duel not found or already created' }, { status: 400 });
    } else if (role === 'challenger') {
       if (!playerName) return NextResponse.json({ error: 'Challenger name required' }, { status: 400 });
       
       // Fetch creator's team and current settings to run the simulation
       const { data: row, error: fetchError } = await supabase
         .from('duels')
         .select('creator_team_json, creator_score, settings')
         .eq('duel_id', duelId)
         .single();
         
       if (fetchError || !row) return NextResponse.json({ error: 'Duel not found' }, { status: 400 });
       
       const creatorTeam = JSON.parse(row.creator_team_json);
       const settings = JSON.parse(row.settings);
       
       const creatorAvg = Math.floor(creatorTeam.reduce((acc: any, node: any) => acc + (node.player.overall || 70), 0) / creatorTeam.length);
       const challengerAvg = Math.floor(team.reduce((acc: any, node: any) => acc + (node.player.overall || 70), 0) / team.length);
       
       const creatorOvr = creatorAvg + Math.floor(row.creator_score / 100);
       const challengerOvr = challengerAvg + Math.floor(score / 100);
       
       const creatorNames = creatorTeam.map((n: any) => n.player.name);
       const challengerNames = team.map((n: any) => n.player.name);
       
       const matchData = simulateMatch(creatorOvr, challengerOvr, creatorNames, challengerNames, true);
       
       settings.matchData = matchData;
       settings.creatorReady = false;
       settings.challengerReady = false;
       
       const { error: updateError, count } = await supabase
         .from('duels')
         .update({ 
           challenger_name: playerName, 
           challenger_team_json: JSON.stringify(team), 
           challenger_score: score, 
           status: 'finished', 
           settings: JSON.stringify(settings) 
         })
         .eq('duel_id', duelId)
         .eq('status', 'pending');

       if (updateError || count === 0) return NextResponse.json({ error: 'Duel not found or already finished' }, { status: 400 });
    } else {
       return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating duel:', error);
    return NextResponse.json({ error: 'Failed to update duel' }, { status: 500 });
  }
}
