import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getPlayerOverall } from '@/lib/overall';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    // 1. Draw a random team and tournament combination that exists in the squads table
    const randomSquadStmt = db.prepare(`
      SELECT s.tournament_id, s.team_id, t.team_name, tr.year, tr.tournament_name
      FROM squads s
      JOIN teams t ON s.team_id = t.team_id
      JOIN tournaments tr ON s.tournament_id = tr.tournament_id
      GROUP BY s.tournament_id, s.team_id
      ORDER BY RANDOM() LIMIT 1
    `);
    
    const randomSquad = randomSquadStmt.get() as any;

    if (!randomSquad) {
      return NextResponse.json({ error: 'Nenhum elenco encontrado' }, { status: 500 });
    }

    // 2. Fetch the roster (all players) for that specific drawn squad
    const rosterStmt = db.prepare(`
      SELECT p.player_id, p.given_name, p.family_name, p.face_url, s.position_code, s.shirt_number
      FROM squads s
      JOIN players p ON s.player_id = p.player_id
      WHERE s.tournament_id = ? AND s.team_id = ?
    `);

    const roster = rosterStmt.all(randomSquad.tournament_id, randomSquad.team_id) as any[];

    // Format the names
    const formattedRoster = roster.map(player => {
      const isCaptainBug = player.family_name?.toLowerCase() === 'captain';
      let givenName = player.given_name === 'not applicable' ? '' : (player.given_name || '');
      let familyName = player.family_name === 'not applicable' ? '' : (player.family_name || '');
      let fullName = `${givenName} ${familyName}`.trim() || 'Desconhecido';
      
      if (isCaptainBug) {
        fullName = 'Son Heung-min';
      }
      
      const overall = getPlayerOverall(player.player_id);
      
      return {
        id: player.player_id,
        name: fullName,
        face_url: player.face_url,
        position: player.position_code,
        shirtNumber: player.shirt_number,
        overall: overall
      };
    });

    return NextResponse.json({
      team: {
        name: randomSquad.team_name,
        year: randomSquad.year,
        tournament: randomSquad.tournament_name,
      },
      roster: formattedRoster
    });

  } catch (error) {
    console.error('API Draft Roll Error:', error);
    return NextResponse.json({ error: 'Erro interno ao sortear elenco' }, { status: 500 });
  }
}
