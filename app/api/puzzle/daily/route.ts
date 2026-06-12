import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    if (!dateStr) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const launchDate = new Date('2026-06-08');
    const currentDate = new Date(dateStr);
    const diffTime = currentDate.getTime() - launchDate.getTime();
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    // Calculate tomorrow's date
    const today = new Date(dateStr);
    today.setDate(today.getDate() + 1);
    const tomorrowStr = today.toISOString().split('T')[0];

    // Buscar no Supabase os desafios de hoje e de amanhã
    const { data: puzzles, error } = await supabaseAdmin
      .from('daily_puzzles')
      .select('*')
      .in('date', [dateStr, tomorrowStr]);

    let todayPuzzleData = puzzles?.find(p => p.date === dateStr);
    let tomorrowPuzzleData = puzzles?.find(p => p.date === tomorrowStr);

    const todayPuzzle = todayPuzzleData ? {
      formation: todayPuzzleData.formation,
      startingPlayerId: todayPuzzleData.starting_player_id,
      puzzleNumber: diffDays
    } : {
      formation: '4-3-3',
      startingPlayerId: 'P-38906', // Pelé fallback
      puzzleNumber: diffDays
    };

    const tomorrowPuzzle = tomorrowPuzzleData ? {
      formation: tomorrowPuzzleData.formation,
      startingPlayerId: tomorrowPuzzleData.starting_player_id,
      puzzleNumber: diffDays + 1
    } : {
      formation: '4-3-3',
      startingPlayerId: 'P-38906',
      puzzleNumber: diffDays + 1
    };

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
