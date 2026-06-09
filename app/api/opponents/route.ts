import { NextResponse } from 'next/server';
import { getRandomHistoricTeams } from '@/lib/historicTeams';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const teams = getRandomHistoricTeams(31); // Group Stage has 3 opponents
    return NextResponse.json(teams);
  } catch (err) {
    console.error('Opponents API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch opponents' }, { status: 500 });
  }
}
