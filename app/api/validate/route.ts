import { NextResponse } from 'next/server';
import { getConnections, getBestConnection } from '@/lib/connections';

export async function POST(request: Request) {
  try {
    const { playerAId, playerBId, activeRules } = await request.json();

    if (!playerAId || !playerBId) {
      return NextResponse.json({ error: 'Missing player IDs' }, { status: 400 });
    }

    const rules = activeRules || ['national_team_same_year', 'opponent_same_match', 'club_same_year'];
    const connections = getConnections(playerAId, playerBId, rules);
    const bestConnection = getBestConnection(connections);

    if (bestConnection) {
      return NextResponse.json({ valid: true, connection: bestConnection });
    } else {
      return NextResponse.json({ valid: false });
    }
  } catch (err) {
    console.error('Validate error:', err);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
