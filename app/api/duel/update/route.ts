import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { simulateMatch } from '@/lib/simulation';

export async function PUT(request: Request) {
  try {
    const { duelId, role, team, score, playerName } = await request.json();
    
    if (!duelId || !role || !team) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const db = getDb();
    
    if (role === 'creator') {
       const stmt = db.prepare(`
         UPDATE duels 
         SET creator_team_json = ?, creator_score = ?, status = 'pending'
         WHERE duel_id = ? AND status = 'creating'
       `);
       const info = stmt.run(JSON.stringify(team), score, duelId);
       if (info.changes === 0) return NextResponse.json({ error: 'Duel not found or already created' }, { status: 400 });
       
    } else if (role === 'challenger') {
       if (!playerName) return NextResponse.json({ error: 'Challenger name required' }, { status: 400 });
       
       // Fetch creator's team and current settings to run the simulation
       const row = db.prepare('SELECT creator_team_json, creator_score, settings FROM duels WHERE duel_id = ?').get(duelId) as any;
       if (!row) return NextResponse.json({ error: 'Duel not found' }, { status: 400 });
       
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
       
       const stmt = db.prepare(`
         UPDATE duels 
         SET challenger_name = ?, challenger_team_json = ?, challenger_score = ?, status = 'finished', settings = ?
         WHERE duel_id = ? AND status = 'pending'
       `);
       const info = stmt.run(playerName, JSON.stringify(team), score, JSON.stringify(settings), duelId);
       if (info.changes === 0) return NextResponse.json({ error: 'Duel not found or already finished' }, { status: 400 });
    } else {
       return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating duel:', error);
    return NextResponse.json({ error: 'Failed to update duel' }, { status: 500 });
  }
}
