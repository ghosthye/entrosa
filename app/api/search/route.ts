import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getPlayerOverall } from '@/lib/overall';
import Fuse from 'fuse.js';

let fuseInstance: Fuse<any> | null = null;
let allPlayersCache: any[] = [];

function initializeFuse() {
  if (fuseInstance) return;
  const db = getDb();
  // We use GROUP_CONCAT to get all cups. MAX() for position and team just gets one of them, 
  // which is fine for the preview.
  const stmt = db.prepare(`
    SELECT p.player_id, p.given_name, p.family_name, p.face_url,
           GROUP_CONCAT(DISTINCT tr.year) as cups,
           MAX(s.position_code) as position_code,
           MAX(t.team_name) as team_name,
           MAX(t.region_name) as region_name,
           COUNT(DISTINCT a.match_id) as matches,
           COUNT(DISTINCT s.tournament_id) as tournaments
    FROM players p
    LEFT JOIN squads s ON p.player_id = s.player_id
    LEFT JOIN tournaments tr ON s.tournament_id = tr.tournament_id
    LEFT JOIN teams t ON s.team_id = t.team_id
    LEFT JOIN appearances a ON p.player_id = a.player_id
    GROUP BY p.player_id
  `);
  const rawPlayers = stmt.all() as any[];
  
  allPlayersCache = rawPlayers.map(p => {
    const givenName = p.given_name === 'not applicable' ? '' : (p.given_name || '');
    const familyName = p.family_name === 'not applicable' ? '' : (p.family_name || '');
    
    let overall = 65 + (p.matches * 1.5) + (p.tournaments * 3);
    if (overall > 99) overall = 99;

    return {
      id: p.player_id,
      name: `${givenName} ${familyName}`.trim(),
      face_url: p.face_url || null,
      cups: p.cups ? p.cups.split(',').map(Number).sort() : [],
      position: p.position_code || 'N/A',
      team: p.team_name || 'N/A',
      region: p.region_name || 'N/A',
      overall: Math.floor(overall)
    };
  });

  fuseInstance = new Fuse(allPlayersCache, {
    keys: ['name'],
    threshold: 0.3,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    if (!fuseInstance) {
      initializeFuse();
    }

    const results = fuseInstance!.search(q, { limit: 10 });
    return NextResponse.json(results.map(r => r.item));
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
