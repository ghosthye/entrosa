import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { duelId, role } = await request.json();
    
    if (!duelId || !role) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const db = getDb();
    const row = db.prepare('SELECT settings FROM duels WHERE duel_id = ?').get(duelId) as any;
    
    if (!row) return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
    
    const settings = JSON.parse(row.settings);
    if (role === 'creator') settings.creatorReady = true;
    if (role === 'challenger') settings.challengerReady = true;
    
    // Se ambos estiverem prontos, define o momento exato de início da partida (3 segundos no futuro)
    if (settings.creatorReady && settings.challengerReady && !settings.matchStartTime) {
      settings.matchStartTime = Date.now() + 3000;
    }
    
    const stmt = db.prepare('UPDATE duels SET settings = ? WHERE duel_id = ?');
    stmt.run(JSON.stringify(settings), duelId);

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating ready status:', error);
    return NextResponse.json({ error: 'Failed to update ready status' }, { status: 500 });
  }
}
