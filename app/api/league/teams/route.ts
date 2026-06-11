import { NextResponse } from 'next/server';
import { getAllBrasileiraoTeams } from '@/lib/historicTeams';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const count = parseInt(searchParams.get('count') || '19');

  try {
    const allTeams = getAllBrasileiraoTeams();
    
    // Embaralhar e pegar os N primeiros
    const shuffled = allTeams.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    return NextResponse.json(selected.map(t => ({
      name: t.teamName,
      year: t.tournamentYear,
      ovr: t.averageOverall,
      playerNames: t.playerNames,
      positionCodes: t.playerPositions
    })));
  } catch (error) {
    console.error('Error fetching league teams:', error);
    return NextResponse.json({ error: 'Failed to fetch league teams' }, { status: 500 });
  }
}
