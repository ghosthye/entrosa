import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getConnections } from '@/lib/connections';
import { ConnectionRule } from '@/lib/rules';
import { getPlayerOverall } from '@/lib/overall';

const isPositionMatch = (dbPos: string, uiPos: string) => {
  if (uiPos === 'GOL' && dbPos === 'GOL') return true;
  if ((uiPos === 'ZAG' || uiPos === 'LAT') && dbPos === 'ZAG') return true;
  if (uiPos === 'MEI' && dbPos === 'MEI') return true;
  if (uiPos === 'ATA' && dbPos === 'ATA') return true;
  return false;
};

export async function POST(request: Request) {
  try {
    const { adjacentPlayers, boardPlayers, activeRules, targetPosition } = await request.json() as { adjacentPlayers: string[], boardPlayers: string[], activeRules: ConnectionRule[], targetPosition?: string };
    
    if (!adjacentPlayers || adjacentPlayers.length === 0) {
      return NextResponse.json({ error: 'No adjacent players' }, { status: 400 });
    }

    const db = getDb();
    
    // Para ser extremamente rápido, vamos pegar os top 500 jogadores mais famosos (que mais jogaram) 
    // e os LEGEND_OVERRIDES.
    const stmt = db.prepare(`
      SELECT p.player_id, p.given_name, p.family_name, 
             MAX(t.team_name) as team_name, MAX(s.position_code) as position_code
      FROM players p
      LEFT JOIN squads s ON p.player_id = s.player_id
      LEFT JOIN teams t ON s.team_id = t.team_id
      LEFT JOIN appearances a ON p.player_id = a.player_id
      GROUP BY p.player_id
      ORDER BY COUNT(DISTINCT a.match_id) DESC
      LIMIT 1000
    `);
    
    const candidates = stmt.all() as any[];

    // Adiciona lendas hardcoded caso não estejam no top 1000 (ex: Pelé, que jogou poucas partidas)
    const legendIds = ['P-38906', 'P-80404', 'P-62722', 'P-56430', 'P-50564', 'P-72864', 'P-46080', 'P-61251', 'P-57361', 'P-74261', 'P-08939', 'P-37483'];
    const legendsStmt = db.prepare(`
      SELECT p.player_id, p.given_name, p.family_name, MAX(t.team_name) as team_name, MAX(s.position_code) as position_code
      FROM players p
      LEFT JOIN squads s ON p.player_id = s.player_id
      LEFT JOIN teams t ON s.team_id = t.team_id
      WHERE p.player_id IN (${legendIds.map(() => '?').join(',')})
      GROUP BY p.player_id
    `);
    const legends = legendsStmt.all(...legendIds) as any[];
    
    // Mesclar e remover duplicados
    const allCandidates = [...legends, ...candidates].reduce((acc, curr) => {
       if (!acc.some((c: any) => c.player_id === curr.player_id)) {
           acc.push(curr);
       }
       return acc;
    }, [] as any[]);

    // Avaliar Overall de cada um e ordenar
    const candidatesWithOvr = allCandidates.map((c: any) => {
       return {
          ...c,
          overall: getPlayerOverall(c.player_id)
       };
    }).sort((a: any, b: any) => b.overall - a.overall);

    // Encontrar o primeiro que conecta com TODOS os adjacentes?
    // Não, basta conectar com QUALQUER UM dos adjacentes para ser válido.
    for (const candidate of candidatesWithOvr) {
       // Se uma posição foi fornecida, o jogador DEVE atuar nela
       if (targetPosition && !isPositionMatch(candidate.position_code, targetPosition)) {
          continue;
       }

       // Não sugira jogadores que já estão no tabuleiro (incluindo os adjacentes)
       const playersToIgnore = boardPlayers || adjacentPlayers;
       if (playersToIgnore.includes(candidate.player_id)) continue;

       // Verificar se ele conecta com algum
       for (const adjId of adjacentPlayers) {
          const connections = getConnections(adjId, candidate.player_id, activeRules);
          if (connections.length > 0) {
             const given = candidate.given_name === 'not applicable' ? '' : candidate.given_name;
             const name = `${given} ${candidate.family_name}`.trim();
             
             return NextResponse.json({ 
                hint: {
                   letters: name.substring(0, 3).toUpperCase(),
                   country: candidate.team_name,
                   overall: candidate.overall
                }
             });
          }
       }
    }

    return NextResponse.json({ error: 'No hint found' }, { status: 404 });
  } catch (error) {
    console.error('Hint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
