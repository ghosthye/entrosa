import Link from 'next/link';
import { Header } from '@/components/Header';
import { getDailyPuzzle } from '@/lib/daily';
import { getDb } from '@/lib/db';
import { FloatingTeams } from '@/components/FloatingTeams';

export default function Home() {
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];
  const puzzle = getDailyPuzzle(todayStr);
  
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { 
    day: 'numeric', 
    month: 'long' 
  }).format(todayDate);
  
  const db = getDb();
  const stmt = db.prepare(`
    SELECT p.given_name, p.family_name, p.face_url, MAX(t.team_name) as team_name, MAX(s.position_code) as position_code
    FROM players p
    LEFT JOIN squads s ON p.player_id = s.player_id
    LEFT JOIN teams t ON s.team_id = t.team_id
    WHERE p.player_id = ?
    GROUP BY p.player_id
  `);
  
  const playerRecord = stmt.get(puzzle.startingPlayerId) as any;
  const givenName = playerRecord?.given_name === 'not applicable' ? '' : (playerRecord?.given_name || '');
  const familyName = playerRecord?.family_name === 'not applicable' ? '' : (playerRecord?.family_name || '');
  const playerName = `${givenName} ${familyName}`.trim() || 'JOGADOR MISTÉRIO';
  const playerPosition = playerRecord?.position_code || '??';
  const playerCountry = playerRecord?.team_name || 'Desconhecido';
  const faceUrl = playerRecord?.face_url || null;

  // Fetch tomorrow's teaser
  const tomorrowStr = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const nextPuzzle = getDailyPuzzle(tomorrowStr);
  const nextPlayerRecord = stmt.get(nextPuzzle.startingPlayerId) as any;
  const nextCountry = nextPlayerRecord ? nextPlayerRecord.team_name : 'desconhecido';
  const nextTeaser = `O craque de amanhã é da seleção de ${nextCountry}!`;

  return (
    <main className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-8 relative overflow-hidden transition-colors">
      <FloatingTeams />
      <Header />

      {/* Texture background */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      <div className="flex-1 w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-12 mt-4 sm:mt-12 z-10">
        <div className="flex-1 text-center md:text-left">
          <h1 className="font-display text-7xl md:text-8xl lg:text-9xl text-verde-campo leading-[0.85] tracking-tight mb-6">
            MONTE SUA<br/>
            <span className="text-primary">SELEÇÃO</span>
          </h1>
          <p className="font-sans text-lg sm:text-xl md:text-2xl text-secondary font-medium max-w-lg mx-auto md:mx-0 mb-10 leading-snug">
            Sua missão é conectar 11 craques da Copa do Mundo, mas cada escolha precisa ter algo em comum com a anterior.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Link href="/jogar" className="bg-amarelo-gol text-black font-bold text-lg sm:text-xl px-8 py-4 rounded-xl hover:bg-yellow-400 transition-transform active:scale-95 uppercase tracking-wider text-center shadow-[0_0_15px_rgba(255,214,0,0.3)]">
              Jogar Desafio #{puzzle.puzzleNumber}
            </Link>
            <Link href="/livre" className="bg-surface text-primary font-bold text-lg sm:text-xl px-8 py-4 rounded-xl hover:bg-surface/80 transition-colors uppercase tracking-wider text-center border-2 border-border-color">
              Modo Livre
            </Link>
            <Link href="/duelo" className="bg-blue-600 text-white font-bold text-lg sm:text-xl px-8 py-4 rounded-xl hover:bg-blue-700 transition-colors uppercase tracking-wider text-center shadow-[0_0_15px_rgba(37,99,235,0.3)]">
              Duelo Online
            </Link>
          </div>
        </div>
        
        {/* Dynamic Puzzle Card */}
        <div className="w-full max-w-[320px] bg-verde-campo border-4 border-verde-grama rounded-2xl shadow-[0_20px_50px_rgba(26,107,58,0.5)] relative flex flex-col transform md:rotate-3 transition-transform hover:rotate-0 duration-500 overflow-hidden">
           {/* Card Header */}
           <div className="bg-[#0a3a1f] p-4 text-center border-b-2 border-verde-grama">
             <div className="text-amarelo-gol font-mono text-xs font-bold tracking-widest uppercase mb-1">Puzzle Diário #{puzzle.puzzleNumber}</div>
             <div className="text-white text-sm font-medium">{formattedDate}</div>
           </div>
           
           {/* Card Body - Player Reveal */}
           <div className="p-6 flex flex-col items-center justify-center relative flex-1 min-h-[220px]">
             {/* Lines */}
             <div className="absolute inset-2 border-2 border-white/10 rounded-lg pointer-events-none"></div>
             <div className="absolute w-20 h-20 border-2 border-white/10 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
             
             <div className="text-white/60 text-xs font-bold tracking-widest uppercase mb-4 text-center">
               O desafio de hoje<br/>começa com:
             </div>
             
             <div className="bg-[#0a0f0a] border border-amarelo-gol/30 rounded-xl p-4 w-full text-center relative shadow-[0_0_20px_rgba(234,179,8,0.15)] flex flex-col items-center">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amarelo-gol text-black text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-sm">{playerPosition}</span>
                {faceUrl ? (
                  <img src={faceUrl} alt={playerName} referrerPolicy="no-referrer" className="w-16 h-16 object-contain -mt-8 mb-2 drop-shadow-md" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-verde-grama flex items-center justify-center text-white font-display text-xl mx-auto -mt-6 mb-2 border-2 border-amarelo-gol shadow-md">
                    {playerName.charAt(0)}
                  </div>
                )}
                <h3 className="text-white font-display text-2xl uppercase leading-tight">{playerName}</h3>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className="text-[10px] text-white/70 bg-white/10 px-2 py-0.5 rounded-sm uppercase tracking-wide">{playerCountry.substring(0,3)}</span>
                  <span className="text-[10px] text-white/50">{puzzle.formation}</span>
                </div>
             </div>
           </div>
        </div>
      </div>

      <div id="como-funciona" className="w-full max-w-5xl mt-24 mb-16 z-10 px-4">
        <div className="flex flex-col items-center mb-16">
          <h2 className="font-display text-4xl sm:text-5xl text-primary text-center uppercase tracking-wide">Como Jogar?</h2>
          <div className="w-24 h-1 bg-amarelo-gol mt-4 rounded-full"></div>
          <p className="text-secondary mt-6 max-w-2xl text-center text-lg">O ENTROSA não é só um jogo de adivinhação, é um quebra-cabeça de química e conhecimento futebolístico.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-surface p-8 rounded-2xl border border-border-color shadow-lg hover:border-amarelo-gol/50 transition-colors relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-verde-campo/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-amarelo-gol/10 transition-colors"></div>
             <div className="text-4xl mb-4">1️⃣</div>
             <h3 className="font-bold text-xl mb-3 text-primary uppercase tracking-wide">O Ponto de Partida</h3>
             <p className="text-secondary font-medium leading-relaxed">No <strong>Puzzle Diário</strong>, nós te damos a formação tática e um craque misterioso para começar. No <strong>Modo Livre</strong>, você é o treinador: escolhe o esquema tático e quem será o primeiro a pisar no gramado verde.</p>
          </div>
          
          <div className="bg-surface p-8 rounded-2xl border border-border-color shadow-lg hover:border-amarelo-gol/50 transition-colors relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-verde-campo/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-amarelo-gol/10 transition-colors"></div>
             <div className="text-4xl mb-4">🔗</div>
             <h3 className="font-bold text-xl mb-3 text-primary uppercase tracking-wide">O Entrosamento</h3>
             <p className="text-secondary font-medium leading-relaxed">A regra de ouro: para escalar um novo jogador, ele precisa ter <strong>ligação direta com pelo menos um jogador vizinho</strong> já em campo. A química funciona por Seleção, Clube ou confrontos na Copa. Fez link com vários vizinhos ao mesmo tempo? Você ganha <strong>bônus multiplicadores</strong>!</p>
          </div>
          
          <div className="bg-surface p-8 rounded-2xl border border-border-color shadow-lg hover:border-amarelo-gol/50 transition-colors relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-verde-campo/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-amarelo-gol/10 transition-colors"></div>
             <div className="text-4xl mb-4">🎯</div>
             <h3 className="font-bold text-xl mb-3 text-primary uppercase tracking-wide">A Teia Tática</h3>
             <p className="text-secondary font-medium leading-relaxed">Você constrói o time como uma teia, escolhendo posições livres ao redor dos seus jogadores. Ficou sem saída ou quer testar um nome melhor para maximizar o Overall? <strong>Clique em um jogador já escalado para removê-lo</strong> (mas cuidado, custa 15 pontos do Score!).</p>
          </div>

          <div className="bg-surface p-8 rounded-2xl border border-border-color shadow-lg hover:border-amarelo-gol/50 transition-colors relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-verde-campo/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-amarelo-gol/10 transition-colors"></div>
             <div className="text-4xl mb-4">🏆</div>
             <h3 className="font-bold text-xl mb-3 text-primary uppercase tracking-wide">A Copa Entrosa</h3>
             <p className="text-secondary font-medium leading-relaxed">Conseguiu fechar os 11? O Overall (OVR) do seu time será calculado baseado na força das suas escolhas. Você entrará no mata-mata da Copa simulando partidas contra seleções históricas reais. Mostre que sua panela é campeã!</p>
          </div>
        </div>
      </div>
      
      <footer className="w-full max-w-5xl text-center py-8 flex flex-col md:flex-row items-center justify-between border-t border-border-color z-10 text-xs sm:text-sm">
        <div className="text-secondary font-medium mb-4 md:mb-0">
          Dados: <a href="https://github.com/jfjelstul/worldcup" target="_blank" rel="noreferrer" className="underline hover:text-primary transition-colors">Fjelstul World Cup Database</a>
        </div>
        <div className="font-mono tracking-widest text-amarelo-gol/80 font-bold">
          ENTROSA.APP
        </div>
      </footer>
    </main>
  );
}
