import { getDailyPuzzle } from '@/lib/daily';
import { getDb } from '@/lib/db';
import { getPlayerOverall } from '@/lib/overall';
import GameClient from './GameClient';

export const dynamic = 'force-dynamic';

export default function JogarPage() {
  const today = new Date().toISOString().split('T')[0];
  const puzzle = getDailyPuzzle(today);
  
  const db = getDb();
  const stmt = db.prepare(`
    SELECT p.given_name, p.family_name, p.face_url, MAX(t.team_name) as team_name, MAX(s.position_code) as position_code
    FROM players p
    LEFT JOIN squads s ON p.player_id = s.player_id
    LEFT JOIN teams t ON s.team_id = t.team_id
    WHERE p.player_id = ?
    GROUP BY p.player_id
  `);
  
  const playerRecord = stmt.get(puzzle.startingPlayerId) as any;
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
  const nextPuzzle = getDailyPuzzle(tomorrowStr);
  const nextPlayerRecord = stmt.get(nextPuzzle.startingPlayerId) as any;
  const nextCountry = nextPlayerRecord ? nextPlayerRecord.team_name : 'desconhecido';
  const nextTeaser = `Próximo puzzle em breve — começa com um craque de: ${nextCountry} ⏳`;

  return <GameClient puzzle={puzzle} startingPlayer={startingPlayer} mode="puzzle" nextTeaser={nextTeaser} />;
}
