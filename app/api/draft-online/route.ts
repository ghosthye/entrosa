import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { mode, format, settings, hostName, teamName, hostId } = await req.json();

    // Generate a 6-character short code (uppercase alphanumeric)
    const short_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create room
    const { data: room, error: roomError } = await supabaseAdmin
      .from('draft_rooms')
      .insert({
        short_code,
        mode,
        format,
        settings,
        host_id: hostId,
      })
      .select('id')
      .single();

    if (roomError) throw roomError;

    // Add host as first player
    const { data: player, error: playerError } = await supabaseAdmin
      .from('draft_room_players')
      .insert({
        room_id: room.id,
        player_id: hostId,
        player_name: hostName,
        team_name: teamName,
        is_host: true,
      })
      .select('id')
      .single();

    if (playerError) throw playerError;

    return NextResponse.json({ roomId: room.id, shortCode: short_code, playerId: player.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  // Join Room by short_code or id
  try {
    const { shortCode, roomId, playerName, teamName, playerId } = await req.json();

    let query = supabaseAdmin.from('draft_rooms').select('id, status');
    
    if (shortCode) {
      query = query.eq('short_code', shortCode.toUpperCase());
    } else if (roomId) {
      query = query.eq('id', roomId);
    } else {
      throw new Error('Código ou Link da sala não fornecido.');
    }

    const { data: room, error: roomError } = await query.single();

    if (roomError || !room) throw new Error('Sala não encontrada.');
    if (room.status !== 'lobby') throw new Error('A partida já começou.');

    // Verificar Limite de Jogadores
    const { count: playerCount, error: countError } = await supabaseAdmin
      .from('draft_room_players')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', room.id);

    if (countError) throw countError;
    if (playerCount !== null && playerCount >= 16) {
      throw new Error('A sala está cheia! (Limite: 16 jogadores).');
    }

    const { data: player, error: playerError } = await supabaseAdmin
      .from('draft_room_players')
      .insert({
        room_id: room.id,
        player_id: playerId,
        player_name: playerName,
        team_name: teamName,
        is_host: false,
      })
      .select('id')
      .single();

    if (playerError) throw playerError;

    return NextResponse.json({ roomId: room.id, playerId: player.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
