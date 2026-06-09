import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scoreParam = searchParams.get('score');
    
    let hypotheticalRank = null;

    if (scoreParam) {
      const score = parseInt(scoreParam, 10);
      if (!isNaN(score)) {
        // Find how many people have a strictly higher score
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('total_score', score);
          
        if (!countError && count !== null) {
          hypotheticalRank = count + 1;
        }
      }
    }

    // Fetch top 100 players
    const { data: topPlayers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, total_score, flawless_puzzles')
      .order('total_score', { ascending: false })
      .limit(100);

    if (fetchError) throw fetchError;

    return NextResponse.json({
      topPlayers,
      hypotheticalRank
    });
  } catch (error) {
    console.error('Error fetching ranking:', error);
    return NextResponse.json({ error: 'Failed to fetch ranking' }, { status: 500 });
  }
}
