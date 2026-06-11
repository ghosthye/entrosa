import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getPlayerOverall } from '@/lib/overall';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const league = (searchParams.get('league') as 'worldcup' | 'brasileirao') || 'worldcup';
    const difficulty = searchParams.get('difficulty') || 'easy';
    const db = getDb(league);

    const sampleSize = difficulty === 'easy' ? 8 : 1;

    let randomSquadsStmt;
    if (league === 'brasileirao') {
      randomSquadsStmt = db.prepare(`
        SELECT s.tournament_id, s.team_id, t.team_name, SUBSTR(s.tournament_id, 4) as year, 'Brasileirão Histórico' as tournament_name
        FROM squads s
        JOIN teams t ON s.team_id = t.team_id
        GROUP BY s.tournament_id, s.team_id
        ORDER BY RANDOM() LIMIT ?
      `);
    } else {
      randomSquadsStmt = db.prepare(`
        SELECT s.tournament_id, s.team_id, t.team_name, tr.year, tr.tournament_name
        FROM squads s
        JOIN teams t ON s.team_id = t.team_id
        JOIN tournaments tr ON s.tournament_id = tr.tournament_id
        GROUP BY s.tournament_id, s.team_id
        ORDER BY RANDOM() LIMIT ?
      `);
    }
    
    const randomSquads = randomSquadsStmt.all(sampleSize) as any[];

    if (!randomSquads || randomSquads.length === 0) {
      return NextResponse.json({ error: 'Nenhum elenco encontrado' }, { status: 500 });
    }

    // 2. Fetch the roster (all players) for that specific drawn squad
    const rosterStmt = db.prepare(`
      SELECT p.player_id, p.given_name, p.family_name, p.face_url, s.position_code, s.shirt_number
      FROM squads s
      JOIN players p ON s.player_id = p.player_id
      WHERE s.tournament_id = ? AND s.team_id = ?
    `);

    let bestSquad = randomSquads[0];
    let bestRosterFormatted: any[] = [];
    let bestSquadOverall = 0;

    for (const squad of randomSquads) {
      const roster = rosterStmt.all(squad.tournament_id, squad.team_id) as any[];

      // Format the names
      const formattedRoster = roster.map(player => {
        const isCaptainBug = player.family_name?.toLowerCase() === 'captain';
        let givenName = player.given_name === 'not applicable' ? '' : (player.given_name || '');
        let familyName = player.family_name === 'not applicable' ? '' : (player.family_name || '');
        
        let fullName = givenName === familyName ? givenName : `${givenName} ${familyName}`.trim();
        if (!fullName) fullName = 'Desconhecido';
        
        if (isCaptainBug) {
          fullName = 'Son Heung-min';
        }
        
        const overall = getPlayerOverall(player.player_id, league);
        
        return {
          id: player.player_id,
          name: fullName,
          face_url: player.face_url,
          position: player.position_code || '⭐',
          shirtNumber: player.shirt_number,
          overall: overall
        };
      });

      // Limit to top 25 players to keep it clean, but sort them by position
      formattedRoster.sort((a, b) => b.overall - a.overall);
      const topRoster = formattedRoster.slice(0, 25);
      
      const top11 = topRoster.slice(0, 11);
      const squadOverall = top11.length > 0 ? top11.reduce((acc, p) => acc + p.overall, 0) / top11.length : 0;
      
      if (squadOverall >= bestSquadOverall) {
        bestSquadOverall = squadOverall;
        bestSquad = squad;
        bestRosterFormatted = topRoster;
      }
    }

    // Sort best roster by position order
    const posOrder: Record<string, number> = { 'GOL': 1, 'ZAG': 2, 'MC': 3, 'ATA': 4, '⭐': 5 };
    bestRosterFormatted.sort((a, b) => {
      const orderA = posOrder[a.position] || 99;
      const orderB = posOrder[b.position] || 99;
      if (orderA !== orderB) return orderA - orderB;
      // Secondary sort by overall inside the same position
      return b.overall - a.overall;
    });
    
    // Clean team name if it ends with any year (e.g. "São Paulo 1992")
    let cleanTeamName = bestSquad.team_name;
    if (league === 'brasileirao') {
      cleanTeamName = cleanTeamName.replace(/\s\d{4}$/, '').trim();
    }

    return NextResponse.json({
      team: {
        name: cleanTeamName,
        year: bestSquad.year,
        tournament: bestSquad.tournament_name,
      },
      roster: bestRosterFormatted
    });

  } catch (error) {
    console.error('API Draft Roll Error:', error);
    return NextResponse.json({ error: 'Erro interno ao sortear elenco' }, { status: 500 });
  }
}
