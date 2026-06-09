import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDailyPuzzle } from '@/lib/daily';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    if (!dateStr) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const todayPuzzle = getDailyPuzzle(dateStr);
    
    // Calculate tomorrow's date
    const today = new Date(dateStr);
    today.setDate(today.getDate() + 1);
    const tomorrowStr = today.toISOString().split('T')[0];
    const tomorrowPuzzle = getDailyPuzzle(tomorrowStr);

    const db = getDb();
    
    // Get info about tomorrow's player for the teaser
    const stmt = db.prepare(`
      SELECT p.given_name, p.family_name, p.face_url, MAX(t.team_name) as team_name, MAX(s.position_code) as position_code
      FROM players p
      LEFT JOIN squads s ON p.player_id = s.player_id
      LEFT JOIN teams t ON s.team_id = t.team_id
      WHERE p.player_id = ?
      GROUP BY p.player_id
    `);
    
    const playerRecord = stmt.get(tomorrowPuzzle.startingPlayerId) as any;
    let nextCountry = 'desconhecido';
    if (playerRecord) {
       nextCountry = playerRecord.team_name;
    }

    return NextResponse.json({
      today: todayPuzzle,
      nextTeaser: `Amanhã: O craque é da seleção de ${nextCountry}! ⏳`
    });
  } catch (error) {
    console.error('Error fetching daily puzzle API:', error);
    return NextResponse.json({ error: 'Failed to fetch puzzle' }, { status: 500 });
  }
}
