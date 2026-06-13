import { getDb } from '@/lib/db';
import { getPlayerOverall } from '@/lib/overall';
import GameClient from './GameClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export default async function JogarPage() {
  const today = new Date().toISOString().split('T')[0];
  
  const launchDate = new Date('2026-06-08');
  const currentDate = new Date(today);
  const diffDays = Math.max(1, Math.ceil((currentDate.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const { data: todayPuzzle } = await supabaseAdmin
    .from('daily_puzzles')
    .select('formation, starting_player_id')
    .eq('date', today)
    .single();

  const puzzle = todayPuzzle ? {
    formation: todayPuzzle.formation,
    startingPlayerId: todayPuzzle.starting_player_id,
    puzzleNumber: diffDays
  } : {
    formation: '4-3-3',
    startingPlayerId: 'P-38906', // Pelé fallback
    puzzleNumber: diffDays
  };
  
  const db = getDb();
  const stmt = db.prepare(`
    SELECT p.given_name, p.family_name, p.face_url, MAX(t.team_name) as team_name, MAX(s.position_code) as position_code
    FROM players p
    LEFT JOIN squads s ON p.player_id = s.player_id
    LEFT JOIN teams t ON s.team_id = t.team_id
    WHERE p.player_id = ?
    GROUP BY p.player_id
  `);
  
  const getPlayerInfo = (playerId: string) => {
    let record = stmt.get(playerId) as any;
    if (!record) {
      const dbBr = getDb('brasileirao');
      const stmtBr = dbBr.prepare(`
        SELECT p.given_name, p.family_name, p.face_url, MAX(t.team_name) as team_name, MAX(s.position_code) as position_code
        FROM players p
        LEFT JOIN squads s ON p.player_id = s.player_id
        LEFT JOIN teams t ON s.team_id = t.team_id
        WHERE p.player_id = ?
        GROUP BY p.player_id
      `);
      record = stmtBr.get(playerId) as any;
    }
    return record;
  };

  const playerRecord = getPlayerInfo(puzzle.startingPlayerId);
  const givenName = playerRecord?.given_name === 'not applicable' ? '' : (playerRecord?.given_name || '');
  const familyName = playerRecord?.family_name === 'not applicable' ? '' : (playerRecord?.family_name || '');
  
  const startingPlayer = {
    id: puzzle.startingPlayerId,
    name: `${givenName} ${familyName}`.trim(),
    country: playerRecord?.team_name || 'N/A',
    positionCode: playerRecord?.position_code || 'MF',
    overall: getPlayerOverall(puzzle.startingPlayerId),
    face_url: playerRecord?.face_url || null,
  };

  const tomorrowStr = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const { data: nextPuzzleData } = await supabaseAdmin
    .from('daily_puzzles')
    .select('starting_player_id')
    .eq('date', tomorrowStr)
    .single();

  const nextPuzzleId = nextPuzzleData ? nextPuzzleData.starting_player_id : 'P-38906';
  const nextPlayerRecord = getPlayerInfo(nextPuzzleId);
  
  let nextCountry = nextPlayerRecord?.team_name;
  if (nextCountry) {
    // Limpa o ano se for time brasileiro (ex: São Paulo 1992 -> São Paulo)
    nextCountry = nextCountry.replace(/\s\d{4}$/, '').trim();
  } else {
    nextCountry = 'desconhecido';
  }
  
  const nextTeaser = `Próximo puzzle em breve — começa com um craque de: ${nextCountry} ⏳`;

  return <GameClient puzzle={puzzle} startingPlayer={startingPlayer} mode="puzzle" nextTeaser={nextTeaser} />;
}
