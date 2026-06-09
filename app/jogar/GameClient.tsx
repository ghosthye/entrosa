"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Field } from '@/components/Field';
import { SearchInput, PlayerSearchResult } from '@/components/SearchInput';
import { ChainBar, ChainNode } from '@/components/ChainBar';
import { ScoreCard } from '@/components/ScoreCard';
import { Settings, X, Moon, Sun, Trophy } from 'lucide-react';
import { ConnectionRule, PRESETS } from '@/lib/rules';
import { useTheme } from 'next-themes';
import { CopaModal } from '@/components/CopaModal';
import Link from 'next/link';

const formationsMap: Record<string, string[][]> = {
  '4-3-3': [['ATA', 'ATA', 'ATA'], ['MEI', 'MEI', 'MEI'], ['LAT', 'ZAG', 'ZAG', 'LAT'], ['GOL']],
  '4-4-2': [['ATA', 'ATA'], ['MEI', 'MEI', 'MEI', 'MEI'], ['LAT', 'ZAG', 'ZAG', 'LAT'], ['GOL']],
  '3-5-2': [['ATA', 'ATA'], ['MEI', 'MEI', 'MEI', 'MEI', 'MEI'], ['ZAG', 'ZAG', 'ZAG'], ['GOL']],
  '4-2-3-1': [['ATA'], ['MEI', 'MEI', 'MEI'], ['MEI', 'MEI'], ['LAT', 'ZAG', 'ZAG', 'LAT'], ['GOL']],
  '5-3-2': [['ATA', 'ATA'], ['MEI', 'MEI', 'MEI'], ['LAT', 'ZAG', 'ZAG', 'ZAG', 'LAT'], ['GOL']],
};

interface GameClientProps {
  mode: 'puzzle' | 'livre';
  puzzle: {
    formation: string;
    puzzleNumber: number;
    startingPlayerId?: string;
  };
  startingPlayer?: {
    id: string;
    name: string;
    country: string;
    positionCode: string;
    overall?: number;
    face_url?: string | null;
  };
}

const isPositionMatch = (dbPos: string, uiPos: string) => {
  if (uiPos === 'GOL' && dbPos === 'GOL') return true;
  if ((uiPos === 'ZAG' || uiPos === 'LAT') && dbPos === 'ZAG') return true;
  if (uiPos === 'MEI' && dbPos === 'MEI') return true;
  if (uiPos === 'ATA' && dbPos === 'ATA') return true;
  return false;
};

// Extends ChainNode to store slotId so we can find adjacency easily
interface GameChainNode extends ChainNode {
  slotId: string;
}

export default function GameClient({ puzzle, startingPlayer, mode }: GameClientProps) {
  const [currentFormation, setCurrentFormation] = useState(puzzle.formation);
  const formationRows = formationsMap[currentFormation] || formationsMap['4-3-3'];
  
  const slotDefinitions = useMemo(() => {
    const defs: { id: string, position: string, rowIndex: number, colIndex: number }[] = [];
    let idCounter = 0;
    for (let r = formationRows.length - 1; r >= 0; r--) {
      for (let c = 0; c < formationRows[r].length; c++) {
        defs.push({
          id: `slot-${idCounter++}`,
          position: formationRows[r][c],
          rowIndex: r,
          colIndex: c,
        });
      }
    }
    return defs;
  }, [formationRows]);

  const initialSlotIndex = useMemo(() => {
    if (!startingPlayer) return -1;
    return slotDefinitions.findIndex(s => isPositionMatch(startingPlayer.positionCode, s.position));
  }, [slotDefinitions, startingPlayer]);

  const [chain, setChain] = useState<any[]>(() => {
    if (startingPlayer && initialSlotIndex > -1) {
      return [{
        player: startingPlayer,
        slotId: slotDefinitions[initialSlotIndex].id,
        connections: []
      }];
    }
    return [];
  });
  
  const [filledSlots, setFilledSlots] = useState<Record<string, {name: string, country: string, id: string, overall?: number, face_url?: string | null}>>(() => {
    if (startingPlayer && initialSlotIndex > -1) {
      return { [slotDefinitions[initialSlotIndex].id]: { name: startingPlayer.name, country: startingPlayer.country, id: startingPlayer.id, overall: startingPlayer.overall, face_url: startingPlayer.face_url } };
    }
    return {};
  });

  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set());
  
  const [activeSlotId, setActiveSlotId] = useState<string>('');
  const [errors, setErrors] = useState(0); 
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [validating, setValidating] = useState(false);
  const [errorNodeId, setErrorNodeId] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showCopaModal, setShowCopaModal] = useState(false);
  
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [showSettings, setShowSettings] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<string>('Difícil');
  const [customRules, setCustomRules] = useState<ConnectionRule[]>(PRESETS['Difícil'] as ConnectionRule[]);

  const activeRules = difficulty === 'Custom' ? customRules : (PRESETS[difficulty as keyof typeof PRESETS] || PRESETS['Difícil']);

  const RULE_LABELS: Record<ConnectionRule, string> = {
    'national_team_same_year': 'Mesma Seleção (Exato Mesmo Ano)',
    'opponent_same_match': 'Adversários na Mesma Partida',
    'club_same_year': 'Mesmo Clube (Exato Mesmo Ano)',
    'national_team_any_year': 'Mesma Seleção (Qualquer Ano)',
    'club_any_year': 'Mesmo Clube (Qualquer Ano)',
    'same_cup': 'Mesma Edição da Copa',
    'same_continent': 'Mesmo Continente',
    'same_position': 'Mesma Posição',
    'same_language': 'Falam a Mesma Língua'
  };

  // Handle changing formation (only available in livre mode)
  const handleFormationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (chain.length > 0) {
      if (!confirm("Mudar a formação vai resetar o seu progresso. Tem certeza?")) return;
    }
    setCurrentFormation(e.target.value);
    setChain([]);
    setFilledSlots({});
    setBlockedSlots(new Set());
    setActiveSlotId('');
    setScore(0);
    setErrors(0);
    setStatusMessage('');
  };

  const isAdjacent = (defA: any, defB: any) => {
    if (!defA || !defB) return false;
    const rowDiff = Math.abs(defA.rowIndex - defB.rowIndex);
    const colDiff = Math.abs(defA.colIndex - defB.colIndex);
    
    if (rowDiff === 0) {
      return colDiff === 1; // Mesma linha, colunas adjacentes
    }
    if (rowDiff === 1) {
      // Linhas adjacentes: como o layout é centralizado (ex: 2 atacantes, 4 meias), 
      // a diferença de colunas não pode ser muito grande.
      // O ideal é permitir colDiff <= 1 para manter a proximidade visual real.
      return colDiff <= 1; 
    }
    return false;
  };

  // Determine which slots are clickable (empty + adjacent to at least one filled slot)
  const getClickableSlots = () => {
    const filledIds = Object.keys(filledSlots);
    if (filledIds.length === 0) {
      return slotDefinitions.map(s => s.id); // all are clickable
    }
    
    return slotDefinitions.filter(s => {
      if (filledSlots[s.id] || blockedSlots.has(s.id)) return false;
      return filledIds.some(fId => {
        const fDef = slotDefinitions.find(d => d.id === fId);
        return isAdjacent(s, fDef);
      });
    }).map(s => s.id);
  };

  const clickableSlotIds = getClickableSlots();
  
  // Auto-select first clickable if active is invalid
  useEffect(() => {
    if (isGameOver) return;
    if (!activeSlotId || !clickableSlotIds.includes(activeSlotId)) {
      if (clickableSlotIds.length > 0) {
        setActiveSlotId(clickableSlotIds[0]);
      } else {
        if (chain.length < slotDefinitions.length && chain.length > 0) {
          // No more clickable slots but game not technically full (got stuck!)
          setIsGameOver(true);
        } else if (chain.length === slotDefinitions.length) {
          setIsGameOver(true); // Won
        }
      }
    }
  }, [clickableSlotIds, activeSlotId, isGameOver, chain.length, slotDefinitions.length]);

  const activeSlotDef = slotDefinitions.find(s => s.id === activeSlotId);

  const handleSlotClick = (id: string) => {
    if (isGameOver || validating) return;
    
    if (filledSlots[id]) {
      // Allow removal if it's not the starting player
      if (startingPlayer && id === slotDefinitions[initialSlotIndex > -1 ? initialSlotIndex : 0].id) {
         setStatusMessage("O jogador inicial não pode ser removido!");
         return;
      }
      
      if (confirm(`Remover ${filledSlots[id].name} e tentar outro jogador no lugar? Você perderá 15 pontos.`)) {
         const newFilled = { ...filledSlots };
         delete newFilled[id];
         setFilledSlots(newFilled);
         setScore(Math.max(0, score - 15));
         setChain(chain.filter(c => c.slotId !== id));
         setActiveSlotId('');
         setStatusMessage('');
      }
      return;
    }
    
    if (blockedSlots.has(id)) return;
    
    if (!clickableSlotIds.includes(id)) {
      setStatusMessage("Você só pode escalar jogadores em posições adjacentes a alguém do time!");
      return;
    }
    setActiveSlotId(id);
    setErrors(0);
    setStatusMessage('');
  };

  const handlePlayerSelect = async (player: PlayerSearchResult) => {
    if (isGameOver || validating || !activeSlotDef) return;
    
    if (!isPositionMatch(player.position, activeSlotDef.position)) {
      setStatusMessage(`O jogador atua como ${player.position}, não como ${activeSlotDef.position}!`);
      setErrorNodeId(activeSlotDef.id);
      setTimeout(() => setErrorNodeId(undefined), 1500);
      return; 
    }

    setValidating(true);
    setErrorNodeId(undefined);
    setStatusMessage('');

    try {
      if (Object.keys(filledSlots).length === 0) {
        setChain([{
          player: { id: player.id, name: player.name, country: player.team, overall: player.overall, face_url: player.face_url },
          slotId: activeSlotId,
          connections: []
        }]);
        setFilledSlots({ [activeSlotId]: { name: player.name, country: player.team, id: player.id, overall: player.overall, face_url: player.face_url } });
        setScore(score + 10);
        setErrors(0);
        return;
      }

      // Find all adjacent filled slots
      const adjacentFilledIds = Object.keys(filledSlots).filter(fId => {
        const fDef = slotDefinitions.find(d => d.id === fId);
        return isAdjacent(activeSlotDef, fDef);
      });

      // Validar com todos os vizinhos
      const validations = await Promise.all(adjacentFilledIds.map(async (fId) => {
        const fPlayer = filledSlots[fId];
        const res = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            puzzleNumber: puzzle.puzzleNumber,
            playerAId: fPlayer.id,
            playerBId: player.id,
            activeRules: activeRules
          }),
        });
        const data = await res.json();
        return { fId, valid: data.valid, connection: data.connection, fPlayerName: fPlayer.name };
      }));

      const successfulValidations = validations.filter(v => v.valid && v.connection);

      if (successfulValidations.length > 0) {
        let newPoints = successfulValidations.reduce((sum, v) => sum + v.connection.points, 0);
        if (successfulValidations.length > 1) {
          // Bônus multiplicador para múltiplas conexões (ex: 2 conexões = 1.5x)
          newPoints = Math.floor(newPoints * (1 + (successfulValidations.length - 1) * 0.5));
        }

        const newChain = [...chain];
        newChain.push({
          player: { id: player.id, name: player.name, country: player.team, overall: player.overall, face_url: player.face_url },
          slotId: activeSlotId,
          connections: successfulValidations.map(v => ({ withName: v.fPlayerName, type: v.connection.type, detail: v.connection.detail }))
        });
        
        setChain(newChain);
        setFilledSlots(prev => ({ ...prev, [activeSlotId]: { id: player.id, name: player.name, country: player.team, overall: player.overall, face_url: player.face_url } }));
        setScore(score + newPoints);
        setErrors(0);
      } else {
        const newErrors = errors + 1;
        setErrors(newErrors);
        setStatusMessage('Sem química com nenhum vizinho! Conexão inválida.');
        setErrorNodeId(activeSlotId);
        
        if (newErrors >= 3) {
          const newBlocked = new Set(blockedSlots);
          newBlocked.add(activeSlotId);
          setBlockedSlots(newBlocked);
          setErrors(0);
          setStatusMessage('Posição bloqueada!');
        }
        setTimeout(() => setErrorNodeId(undefined), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setValidating(false);
    }
  };

  const handleShare = () => {
    let text = mode === 'puzzle' ? `ENTROSA #${puzzle.puzzleNumber}` : `ENTROSA (Modo Livre)`;
    text += ` — ${score} pts\n\n`;
    alert("Copiado para a área de transferência!\n\n" + text);
  };

  const nodes2D = useMemo(() => {
    const grid: any[][] = formationRows.map(row => row.map(() => null));
    for (let i = 0; i < slotDefinitions.length; i++) {
      const def = slotDefinitions[i];
      let status: any = 'locked'; // default for empty and non-adjacent
      let pName = undefined;
      let pCountry = undefined;
      let pTooltip = undefined;
      let pFaceUrl = undefined;
      
      const filled = filledSlots[def.id];
      if (filled) {
        // Is it the revealed starting player?
        if (startingPlayer && def.id === slotDefinitions[initialSlotIndex > -1 ? initialSlotIndex : 0].id) {
           status = 'revealed';
        } else {
           status = 'filled';
        }
        pName = filled.name;
        pCountry = filled.country;
        pFaceUrl = filled.face_url;
      } else if (blockedSlots.has(def.id)) {
        status = 'filled';
        pName = 'BLOQUEADO';
      } else if (def.id === activeSlotId && !isGameOver) {
        status = 'selected';
        
        const filledIds = Object.keys(filledSlots);
        if (filledIds.length > 0) {
          const adjacentFilled = filledIds.filter(fId => isAdjacent(def, slotDefinitions.find(d => d.id === fId)));
          const names = adjacentFilled.map(fId => filledSlots[fId].name.split(' ').pop()).join(' ou ');
          
          if (names) {
            if (difficulty === 'Fácil') {
               pTooltip = `Link c/ ${names}: Seleção, Clube, Liga ou Continente.`;
            } else if (difficulty === 'Médio') {
               pTooltip = `Link c/ ${names}: Seleção, Clube (MESMO ANO) ou Copa.`;
            } else if (difficulty === 'Difícil') {
               pTooltip = `Link c/ ${names}: Seleção (MESMO ANO), Clube (MESMO ANO) ou Adversários na Copa.`;
            } else {
               pTooltip = `Link c/ ${names} usando regras personalizadas.`;
            }
          }
        }

      } else if (clickableSlotIds.includes(def.id) && !isGameOver) {
        status = 'empty';
      }

      grid[def.rowIndex][def.colIndex] = {
        id: def.id,
        position: def.position,
        status,
        playerName: pName,
        playerCountry: pCountry,
        tooltipInfo: pTooltip,
        faceUrl: pFaceUrl,
      };
    }
    return grid;
  }, [formationRows, slotDefinitions, activeSlotId, isGameOver, filledSlots, blockedSlots, clickableSlotIds, startingPlayer, initialSlotIndex, chain, difficulty]);

  return (
    <div className="min-h-screen bg-background text-primary flex flex-col md:flex-row relative">
      {/* PRE-GAME MODAL */}
      {!hasStarted && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] border-2 border-amarelo-gol shadow-[0_0_40px_rgba(234,179,8,0.2)] rounded-2xl max-w-lg w-full p-8 flex flex-col gap-6">
            <div className="text-center">
              <h2 className="text-3xl font-display text-primary uppercase mb-2">Preparação Tática</h2>
              <p className="text-secondary font-medium">Escolha a dificuldade das conexões antes de entrar em campo.</p>
            </div>
            
            {mode === 'livre' && (
              <div className="flex flex-col gap-2 mb-2">
                <span className="font-bold text-primary uppercase tracking-wide text-sm">Sua Formação</span>
                <select
                  value={currentFormation}
                  onChange={handleFormationChange}
                  className="bg-background border-2 border-border-color rounded-lg px-4 py-3 text-lg font-bold text-primary focus:outline-none focus:border-amarelo-gol w-full"
                >
                  {Object.keys(formationsMap).map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <span className="font-bold text-primary uppercase tracking-wide text-sm">Dificuldade</span>
              {(['Fácil', 'Médio', 'Difícil'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => {
                    setDifficulty(diff);
                    setCustomRules(PRESETS[diff] as ConnectionRule[]);
                    setHasStarted(true);
                  }}
                  className="flex flex-col items-start text-left p-4 rounded-xl border-2 border-border-color hover:border-amarelo-gol hover:bg-amarelo-gol/5 transition-colors group"
                >
                  <span className={`font-display text-xl uppercase tracking-wide mb-1 ${diff === 'Fácil' ? 'text-green-500' : diff === 'Médio' ? 'text-yellow-500' : 'text-red-500'}`}>
                    {diff}
                  </span>
                  <span className="text-xs text-secondary font-medium leading-relaxed">
                    {diff === 'Fácil' && "Conexões liberadas: Mesma Seleção, Mesmo Clube, Copas, Continente, Posição, Idioma."}
                    {diff === 'Médio' && "Conexões restritas: Seleções ou Clubes (mesmo ano ou não), Copas."}
                    {diff === 'Difícil' && "Somente: Mesma Seleção (mesmo ano), Mesmo Clube (mesmo ano) ou Adversários na mesma partida."}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`flex-1 p-4 sm:p-8 flex items-center justify-center bg-[var(--bg-surface)]/30 relative ${!hasStarted ? 'blur-md pointer-events-none' : ''}`}>
        {/* Logo Top Left */}
        <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-10">
          <Link href="/">
            <img src="/logo.png" alt="ENTROSA" className="h-10 sm:h-16 md:h-24 w-auto drop-shadow-lg hover:scale-105 transition-transform cursor-pointer" />
          </Link>
        </div>
        <Field nodes={nodes2D} onSlotClick={handleSlotClick} errorNodeId={errorNodeId} />
      </div>
      
      <div className="w-full md:w-[400px] lg:w-[480px] bg-background border-l-2 border-border-color p-6 flex flex-col h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <Link href="/">
              <img src="/logo.png" alt="ENTROSA" className="h-8 md:h-12 w-auto cursor-pointer hover:scale-105 transition-transform" />
            </Link>
            <h1 className="font-display text-4xl text-primary uppercase">
              {mode === 'puzzle' ? `ENTROSA #${puzzle.puzzleNumber}` : 'MODO LIVRE'}
            </h1>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-6 text-sm font-bold text-secondary border-b-2 border-border-color pb-4">
          <div className="flex items-center gap-2">
            <span>Formação:</span>
            {mode === 'livre' ? (
              <span className="font-bold text-amarelo-gol bg-background px-3 py-1 rounded border border-border-color">{currentFormation}</span>
            ) : (
              <span>{puzzle.formation}</span>
            )}
            
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-[var(--bg-surface)] rounded-full transition-colors ml-2"
              title="Configurações e Dificuldade"
            >
              <Settings className="w-5 h-5 text-secondary hover:text-primary" />
            </button>
            
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 hover:bg-[var(--bg-surface)] rounded-full transition-colors"
                title="Alternar Tema"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-secondary hover:text-primary" /> : <Moon className="w-5 h-5 text-secondary hover:text-primary" />}
              </button>
            )}
          </div>
          <span>Score: <span className="text-amarelo-gol text-lg">{score}</span></span>
        </div>

        {!isGameOver ? (
          <>
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2">Próxima Posição: {activeSlotDef?.position || 'Nenhuma'}</h3>
              
              {chain.length === 0 ? (
                 <div className="text-sm font-bold text-verde-grama mb-4 bg-green-50 p-2 rounded border border-green-200">
                    Comece conectando seu primeiro jogador!
                 </div>
              ) : activeSlotDef ? (
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3].map(attempt => (
                    <div 
                      key={attempt} 
                      className={`w-4 h-4 rounded-full ${attempt <= (3 - errors) ? 'bg-verde-grama' : 'bg-cinza-borda/30'}`} 
                    />
                  ))}
                  <span className="text-xs text-cinza-borda ml-2 leading-4">{(3 - errors)} tentativas<br/>nesta posição</span>
                </div>
              ) : null}
              
              {statusMessage && (
                <div className="text-vermelho-erro font-bold text-sm mb-2 p-2 bg-red-50 rounded border border-red-200">{statusMessage}</div>
              )}
              
              <SearchInput 
                onSelect={handlePlayerSelect} 
                disabled={validating || !activeSlotDef}
                showOverall={difficulty !== 'Difícil'} 
              />
            </div>
            
            <div className="flex-1 flex flex-col justify-end">
              <h3 className="font-bold text-cinza-borda mb-2 uppercase text-xs tracking-wider">Seu Caminho Atual</h3>
              <div className="bg-cinza-leve rounded-xl p-2 min-h-[120px]">
                 {chain.length > 0 ? (
                   <ChainBar nodes={chain} />
                 ) : (
                   <div className="h-full flex items-center justify-center text-cinza-borda font-bold text-sm text-center">
                     Seu time começa aqui.<br/>Clique em uma posição e escale seu primeiro jogador!
                   </div>
                 )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <ScoreCard 
              score={score} 
              maxScorePossible={11 * 5 * 1.35} 
              chainLength={chain.length}
              onShare={handleShare}
              onPlayFree={() => window.location.href = '/livre'}
            />
            {Object.keys(filledSlots).length === 11 && (
              <button 
                onClick={() => setShowCopaModal(true)}
                className="w-full max-w-sm py-4 bg-verde-campo text-white border-4 border-verde-grama font-bold text-xl rounded-xl hover:bg-verde-grama transition-colors uppercase tracking-wider shadow-[0_10px_30px_rgba(26,107,58,0.4)] flex items-center justify-center gap-3 animate-pulse"
              >
                <Trophy size={28} /> DISPUTAR COPA
              </button>
            )}
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-auto pt-8 flex flex-col items-center justify-center text-center opacity-30 hover:opacity-100 transition-opacity">
          <img src="/logo.png" alt="ENTROSA" className="h-6 w-auto mb-2 grayscale" />
          <span className="font-mono text-[10px] font-bold tracking-widest text-primary uppercase">jogar em entrosa.app</span>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Dificuldade</h2>
              <button onClick={() => setShowSettings(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[var(--text-secondary)]">Preset de Regras</label>
                <select 
                  value={difficulty}
                  onChange={(e) => {
                    setDifficulty(e.target.value);
                    if (e.target.value !== 'Custom') {
                      setCustomRules(PRESETS[e.target.value] as ConnectionRule[]);
                    }
                  }}
                  className="bg-[var(--bg-background)] border border-[var(--border-color)] text-[var(--text-primary)] p-3 rounded-lg focus:outline-none focus:border-amarelo-gol"
                >
                  <option value="Fácil" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Fácil (Para Iniciantes)</option>
                  <option value="Médio" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Médio (Desafiador)</option>
                  <option value="Difícil" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Difícil (Hardcore/Real)</option>
                  <option value="Custom" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Personalizado (Custom)</option>
                </select>

                {difficulty === 'Fácil' && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-color)]">
                    <strong className="text-[var(--text-primary)]">Modo Fácil:</strong> Permite conexões mais flexíveis. Você pode conectar jogadores pela <strong>Região de Nascimento</strong>, <strong>Continente</strong>, e <strong>Clubes de qualquer época</strong> (eles não precisam ter jogado juntos no mesmo ano). Ideal para entender a dinâmica do jogo e fechar o elenco rapidamente.
                  </p>
                )}
                {difficulty === 'Médio' && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-color)]">
                    <strong className="text-[var(--text-primary)]">Modo Médio:</strong> Um bom desafio. As conexões de Clube agora exigem que os jogadores tenham jogado no clube <strong>no mesmo ano</strong> (Companheiros de Clube). Você também pode usar Companheiros de Seleção (mesmo ano). O <em>Overall (Força)</em> dos jogadores fica visível para ajudar a montar uma equipe forte para a Copa.
                  </p>
                )}
                {difficulty === 'Difícil' && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 bg-[var(--bg-surface)] p-3 rounded-lg border border-vermelho-erro/30">
                    <strong className="text-vermelho-erro">Modo Difícil:</strong> O modo definitivo! Exige conhecimento real. Você só pode conectá-los se foram <strong>Companheiros de Seleção</strong> (mesmo ano), <strong>Companheiros de Clube</strong> (mesmo ano), ou se foram <strong>Adversários na mesma partida</strong> de Copa do Mundo. <br/><br/>⚠️ <strong>O Overall (Força) dos jogadores fica oculto!</strong> Você terá que escalar os melhores jogadores "às cegas" confiando na sua intuição para tentar vencer a Copa!
                  </p>
                )}
              </div>

              {difficulty === 'Custom' && (
                <div className="mt-4 max-h-[40vh] overflow-y-auto space-y-2 border border-[var(--border-color)] p-4 rounded-lg bg-[var(--bg-background)]">
                  <p className="text-xs text-amarelo-gol mb-2">Selecione quais links são válidos:</p>
                  {(Object.entries(RULE_LABELS) as [ConnectionRule, string][]).map(([key, label]) => (
                    <label key={key} className="flex items-start gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={customRules.includes(key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCustomRules([...customRules, key]);
                          } else {
                            setCustomRules(customRules.filter(r => r !== key));
                          }
                        }}
                        className="mt-1 w-4 h-4 rounded bg-[var(--bg-surface)] border-[var(--border-color)] text-amarelo-gol focus:ring-amarelo-gol"
                      />
                      <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCopaModal && (
        <CopaModal 
          playerTeam={chain} 
          nodes2D={nodes2D}
          onClose={() => setShowCopaModal(false)} 
        />
      )}
    </div>
  );
}
