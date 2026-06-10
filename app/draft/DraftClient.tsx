'use client';

import { useState } from 'react';
import { Dice3, RefreshCcw, AlertCircle, Shield, Swords, Settings, CheckCircle2, Trophy } from 'lucide-react';
import { Field, FormationNode } from '@/components/Field';
import { SlotStatus } from '@/components/PlayerSlot';
import { CopaModal } from '@/components/CopaModal';
import { DraftLanding } from '@/components/DraftLanding';
import { motion } from 'framer-motion';

type Player = {
  id: string;
  name: string;
  face_url: string | null;
  position: string;
  shirtNumber: number;
  overall: number; // Added overall
};

type RollResult = {
  team: { name: string; year: number; tournament: string };
  roster: Player[];
};

type SlotDef = {
  id: string;
  expectedPositions: string[];
  label: string;
};

type Slot = SlotDef & {
  player: Player | null;
};

type FormationData = {
  name: string;
  slots: SlotDef[];
  layout: string[][];
};

const FORMATIONS: Record<string, FormationData> = {
  '4-3-3': {
    name: '4-3-3',
    slots: [
      { id: 'pos_9', expectedPositions: ['PE', 'ATA', 'SA', 'MD', 'ME'], label: 'PE' },
      { id: 'pos_10', expectedPositions: ['CA', 'ATA', 'SA'], label: 'CA' },
      { id: 'pos_11', expectedPositions: ['PD', 'ATA', 'SA', 'MD', 'ME'], label: 'PD' },
      { id: 'pos_7', expectedPositions: ['MC', 'MEI', 'ME', 'MD', 'VOL'], label: 'MC' },
      { id: 'pos_6', expectedPositions: ['VOL', 'MC', 'MEI'], label: 'VOL' },
      { id: 'pos_8', expectedPositions: ['MC', 'MEI', 'ME', 'MD', 'VOL'], label: 'MC' },
      { id: 'pos_2', expectedPositions: ['LE', 'LAD', 'ME', 'ZAG'], label: 'LE' },
      { id: 'pos_3', expectedPositions: ['ZAG', 'LE', 'LD', 'LAD', 'VOL'], label: 'ZAG' },
      { id: 'pos_4', expectedPositions: ['ZAG', 'LE', 'LD', 'LAD', 'VOL'], label: 'ZAG' },
      { id: 'pos_5', expectedPositions: ['LD', 'LAD', 'MD', 'ZAG'], label: 'LD' },
      { id: 'pos_1', expectedPositions: ['GOL'], label: 'GOL' },
    ],
    layout: [
      ['pos_9', 'pos_10', 'pos_11'],
      ['pos_7', 'pos_6', 'pos_8'],
      ['pos_2', 'pos_3', 'pos_4', 'pos_5'],
      ['pos_1']
    ]
  },
  '4-4-2': {
    name: '4-4-2',
    slots: [
      { id: 'pos_9', expectedPositions: ['CA', 'ATA', 'SA'], label: 'ATA' },
      { id: 'pos_10', expectedPositions: ['CA', 'ATA', 'SA'], label: 'ATA' },
      { id: 'pos_7', expectedPositions: ['ME', 'MC', 'PE', 'MEI'], label: 'ME' },
      { id: 'pos_6', expectedPositions: ['VOL', 'MC', 'MEI'], label: 'MC' },
      { id: 'pos_8', expectedPositions: ['VOL', 'MC', 'MEI'], label: 'MC' },
      { id: 'pos_11', expectedPositions: ['MD', 'MC', 'PD', 'MEI'], label: 'MD' },
      { id: 'pos_2', expectedPositions: ['LE', 'LAD', 'ZAG'], label: 'LE' },
      { id: 'pos_3', expectedPositions: ['ZAG', 'LE', 'LD', 'LAD', 'VOL'], label: 'ZAG' },
      { id: 'pos_4', expectedPositions: ['ZAG', 'LE', 'LD', 'LAD', 'VOL'], label: 'ZAG' },
      { id: 'pos_5', expectedPositions: ['LD', 'LAD', 'ZAG'], label: 'LD' },
      { id: 'pos_1', expectedPositions: ['GOL'], label: 'GOL' },
    ],
    layout: [
      ['pos_9', 'pos_10'],
      ['pos_7', 'pos_6', 'pos_8', 'pos_11'],
      ['pos_2', 'pos_3', 'pos_4', 'pos_5'],
      ['pos_1']
    ]
  }
};

type SetupConfig = {
  formation: string;
  difficulty: 'easy' | 'hard';
};

export function DraftClient() {
  const [setup, setSetup] = useState<SetupConfig | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  
  const [slots, setSlots] = useState<Slot[]>([]);
  const [currentRoll, setCurrentRoll] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [skipsLeft, setSkipsLeft] = useState(3);
  const [mustPick, setMustPick] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const [showCopaModal, setShowCopaModal] = useState(false);

  const isDraftComplete = slots.length > 0 && slots.every(s => s.player !== null);

  const startDraft = (config: SetupConfig) => {
    setSetup(config);
    const formationData = FORMATIONS[config.formation];
    setSlots(formationData.slots.map(s => ({ ...s, player: null })));
  };

  const handleRoll = async () => {
    if (mustPick) {
      if (skipsLeft <= 0) return;
      setSkipsLeft(s => s - 1);
    }
    
    setIsRolling(true);
    setSelectedPlayer(null);
    try {
      const res = await fetch('/api/draft/roll');
      const data = await res.json();
      setCurrentRoll(data);
      setMustPick(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRolling(false);
    }
  };

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
  };

  const handleAssignToSlot = (slotId: string) => {
    if (!selectedPlayer) return;
    
    const targetSlot = slots.find(s => s.id === slotId);
    if (!targetSlot || !canAssignToSlot(targetSlot, selectedPlayer)) return;

    setSlots(prev => prev.map(s => {
      if (s.id === slotId) {
        return { ...s, player: selectedPlayer };
      }
      return s;
    }));
    
    setMustPick(false);
    setCurrentRoll(null);
    setSelectedPlayer(null);
  };

  const autoFillDebug = () => {
    setSlots(prev => prev.map((s, i) => {
      if (s.player) return s;
      return {
        ...s,
        player: {
          id: `debug_player_${i}`,
          name: `Debug ${s.label}`,
          face_url: null,
          position: s.label,
          shirtNumber: i + 1,
          overall: 80 + Math.floor(Math.random() * 15)
        }
      };
    }));
    setMustPick(false);
  };

  const canAssignToSlot = (slot: Slot, player: Player | null) => {
    if (!player) return false;
    if (slot.player !== null) return false;
    return slot.expectedPositions.includes(player.position);
  };

  // --- LANDING PAGE ---
  if (!hasStarted) {
    return <DraftLanding onStart={() => setHasStarted(true)} />;
  }

  // --- LOBBY UI ---
  if (!setup) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <div className="bg-surface border border-border-color rounded-2xl p-8 shadow-2xl max-w-xl w-full flex flex-col gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amarelo-gol/5 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="text-center">
            <h1 className="font-display text-4xl text-primary mb-2 uppercase tracking-wide">Lobby do Draft</h1>
            <p className="text-secondary">Configure sua tática e dificuldade antes de rolar o dado.</p>
          </div>

          <LobbyForm onStart={startDraft} />
        </div>
      </div>
    );
  }

  // --- DRAFT UI ---
  const formationData = FORMATIONS[setup.formation];
  
  const nodes: FormationNode[][] = formationData.layout.map(rowIds => {
    return rowIds.map(id => {
      const slot = slots.find(s => s.id === id)!;
      const isAvailable = canAssignToSlot(slot, selectedPlayer);
      
      let status: SlotStatus = 'locked';
      if (slot.player) {
        status = 'filled';
      } else if (selectedPlayer) {
        status = isAvailable ? 'selected' : 'locked';
      } else {
        status = 'empty';
      }

      // Se o draft terminou, ou se é modo fácil, mostra o OVR no campo
      const showOvr = isDraftComplete || setup.difficulty === 'easy';

      return {
        id: slot.id,
        position: slot.label as any,
        status,
        playerName: slot.player?.name,
        faceUrl: slot.player?.face_url,
        playerOvr: showOvr ? slot.player?.overall : undefined,
        tooltipInfo: isAvailable ? 'Clique para escalar' : undefined
      };
    });
  });

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 h-full max-w-[1400px] mx-auto w-full items-start px-4 sm:px-8">
      
      {/* Left Sidebar: Draft Control or Summary */}
      <div className="w-full lg:w-[420px] flex flex-col gap-6 shrink-0 lg:sticky lg:top-4 z-10">
        
        {isDraftComplete ? (
          <DraftSummaryPanel slots={slots} onSimulate={() => setShowCopaModal(true)} wasHardMode={setup.difficulty === 'hard'} />
        ) : (
          <>
            {/* Roll Panel (Premium Glassmorphism) */}
            <div className="bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden group">
               {/* Animated glow */}
               <div className="absolute top-0 right-0 w-40 h-40 bg-verde-grama/10 rounded-full blur-[50px] -mr-10 -mt-10 group-hover:bg-verde-grama/20 transition-colors duration-700 pointer-events-none"></div>
               <div className="absolute bottom-0 left-0 w-24 h-24 bg-amarelo-gol/5 rounded-full blur-[40px] -ml-8 -mb-8 pointer-events-none"></div>
               
               <div className="flex justify-between items-end mb-4 relative z-10">
                 <div>
                   <div className="flex items-center gap-3">
                     <h2 className="font-display text-3xl text-white uppercase tracking-wider leading-none">Draft</h2>
                   </div>
                   <p className="text-secondary text-[10px] font-mono uppercase tracking-widest mt-1">Sorteio Histórico</p>
                 </div>
                 <div className="text-right bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                   <div className="text-[9px] font-mono text-secondary uppercase">Formação</div>
                   <div className="text-amarelo-gol font-bold text-sm">{setup.formation}</div>
                 </div>
               </div>

              {mustPick && skipsLeft > 0 ? (
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="flex items-center justify-between text-secondary text-xs font-mono uppercase tracking-widest bg-white/5 p-3 rounded-xl border border-white/5">
                    <span>Ação:</span>
                    <span className="text-amarelo-gol font-bold animate-pulse">Escale um Jogador</span>
                  </div>
                  <button 
                    onClick={handleRoll}
                    disabled={isRolling}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-white/10 hover:border-white/30 hover:bg-white/5 text-secondary hover:text-white font-display text-base uppercase transition-all"
                  >
                    <RefreshCcw className="w-4 h-4" /> Pular ({skipsLeft} restantes)
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleRoll}
                  disabled={isRolling || (mustPick && skipsLeft === 0)}
                  className={`relative z-10 w-full flex items-center justify-center gap-2 py-4 rounded-xl font-display text-xl uppercase tracking-widest transition-all
                    ${isRolling ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 
                      mustPick && skipsLeft === 0 ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5' :
                      'bg-gradient-to-r from-amarelo-gol to-yellow-400 text-black hover:scale-[1.03] shadow-[0_10px_30px_rgba(255,214,0,0.3)] hover:shadow-[0_15px_40px_rgba(255,214,0,0.5)]'
                    }`}
                >
                  {isRolling ? 'Sorteando...' : (
                    <><Dice3 className="w-8 h-8" /> Rolar Equipe</>
                  )}
                </button>
              )}

              {mustPick && skipsLeft === 0 && !isDraftComplete && (
                <p className="relative z-10 text-red-400 text-xs mt-4 flex items-center gap-2 font-medium bg-red-900/20 p-3 rounded-xl border border-red-500/20">
                  <AlertCircle className="w-4 h-4 shrink-0" /> Sem skips disponíveis. Escolha um jogador do elenco.
                </p>
              )}
            </div>

            {/* Roster List (Premium List) */}
            {currentRoll && (
              <div className="bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col overflow-hidden max-h-[380px] shadow-2xl relative">
                {/* Team Header */}
                <div className="p-5 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10 relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="text-secondary font-mono text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-80">
                    {currentRoll.team.tournament}
                  </div>
                  <h3 className="font-display text-3xl text-white leading-none tracking-wide drop-shadow-md">
                    {currentRoll.team.name} <span className="text-amarelo-gol">{currentRoll.team.year}</span>
                  </h3>
                </div>
                
                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                  {currentRoll.roster.map(player => {
                    const isSelected = selectedPlayer?.id === player.id;
                    const isAlreadyDrafted = slots.some(s => s.player?.id === player.id);
                    
                    return (
                      <button
                        key={player.id}
                        onClick={() => !isAlreadyDrafted && handleSelectPlayer(player)}
                        disabled={isAlreadyDrafted}
                        className={`w-full flex items-center justify-between px-4 py-2.5 mb-0.5 rounded-xl text-left transition-all duration-200
                          ${isAlreadyDrafted ? 'opacity-20 cursor-not-allowed grayscale' :
                            isSelected ? 'bg-verde-grama/20 border border-verde-grama/40 shadow-[inset_0_0_20px_rgba(29,158,117,0.2)] pl-5' : 'hover:bg-white/5 border border-transparent hover:border-white/10'}`}
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          <span className={`font-mono text-xs w-6 shrink-0 text-center ${isSelected ? 'text-amarelo-gol' : 'text-white/30'}`}>#{player.shirtNumber}</span>
                          <div className="flex flex-col min-w-0">
                            <span className={`font-bold truncate text-sm tracking-wide ${isSelected ? 'text-amarelo-gol' : 'text-white'}`}>
                              {player.name}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded w-9 text-center border ${isSelected ? 'bg-amarelo-gol/20 text-amarelo-gol border-amarelo-gol/50' : 'bg-white/5 text-white/70 border-white/10'}`}>
                            {player.position}
                          </span>
                          {setup.difficulty === 'easy' && (
                            <div className="flex flex-col items-end justify-center w-8">
                              <span className={`text-sm font-display font-bold leading-none ${player.overall >= 90 ? 'text-amarelo-gol drop-shadow-[0_0_5px_rgba(255,214,0,0.5)]' : player.overall >= 80 ? 'text-white' : 'text-white/40'}`}>
                                {player.overall}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right Area: Pitch (ENTROSA Field) */}
      <div className="flex-1 flex justify-center lg:justify-end w-full min-w-0 transform lg:scale-90 origin-top -mt-2">
        <Field nodes={nodes} onSlotClick={handleAssignToSlot} />
      </div>

      {/* COPA MODAL */}
      {showCopaModal && (
        <CopaModal
          onClose={() => setShowCopaModal(false)}
          playerTeam={slots.map(s => ({
            player: { name: s.player!.name, overall: s.player!.overall },
            slotId: s.id
          })) as any}
          nodes2D={nodes}
        />
      )}

    </div>
  );
}

// --- LOBBY FORM COMPONENT ---
function LobbyForm({ onStart }: { onStart: (config: SetupConfig) => void }) {
  const [formation, setFormation] = useState('4-3-3');
  const [difficulty, setDifficulty] = useState<'easy'|'hard'>('easy');

  return (
    <div className="flex flex-col gap-8">
      {/* Formation Selector */}
      <div>
        <label className="block text-secondary text-xs font-mono uppercase tracking-widest mb-3">
          1. Esquema Tático
        </label>
        <div className="grid grid-cols-2 gap-3">
          {Object.keys(FORMATIONS).map(fmt => (
            <button
              key={fmt}
              onClick={() => setFormation(fmt)}
              className={`py-4 px-4 rounded-xl border-2 transition-all font-display text-xl ${formation === fmt ? 'border-amarelo-gol bg-amarelo-gol/10 text-amarelo-gol' : 'border-border-color bg-black/20 text-white/50 hover:border-white/20'}`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty Selector */}
      <div>
        <label className="block text-secondary text-xs font-mono uppercase tracking-widest mb-3">
          2. Dificuldade da Simulação
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setDifficulty('easy')}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${difficulty === 'easy' ? 'border-verde-grama bg-verde-grama/10 text-verde-grama' : 'border-border-color bg-black/20 text-white/50 hover:border-white/20'}`}
          >
            <Shield className="w-8 h-8" />
            <span className="font-bold text-lg">MODO FÁCIL</span>
            <span className="text-xs text-center opacity-70">Exibe os Overalls (OVR) na lista. IA tolerante.</span>
            {difficulty === 'easy' && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5" />}
          </button>

          <button
            onClick={() => setDifficulty('hard')}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 relative ${difficulty === 'hard' ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-border-color bg-black/20 text-white/50 hover:border-white/20'}`}
          >
            <Swords className="w-8 h-8" />
            <span className="font-bold text-lg">MODO DIFÍCIL</span>
            <span className="text-xs text-center opacity-70">Overalls ocultos (Escalação Cega). IA punitiva.</span>
            {difficulty === 'hard' && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5" />}
          </button>
        </div>
      </div>

      <button
        onClick={() => onStart({ formation, difficulty })}
        className="w-full py-5 rounded-xl bg-amarelo-gol text-black font-display text-2xl uppercase tracking-wider hover:bg-yellow-400 hover:scale-[1.02] transition-all shadow-[0_5px_20px_rgba(255,214,0,0.3)] mt-4"
      >
        Entrar no Vestiário
      </button>
    </div>
  );
}

// --- DRAFT SUMMARY PANEL COMPONENT ---
function DraftSummaryPanel({ slots, onSimulate, wasHardMode }: { slots: Slot[], onSimulate: () => void, wasHardMode: boolean }) {
  const players = slots.map(s => s.player!).filter(Boolean);
  
  const totalOvr = Math.floor(players.reduce((sum, p) => sum + p.overall, 0) / players.length) || 0;
  const bestPlayer = [...players].sort((a, b) => b.overall - a.overall)[0];
  const worstPlayer = [...players].sort((a, b) => a.overall - b.overall)[0];

  return (
    <div className="bg-surface border border-amarelo-gol rounded-2xl p-6 shadow-[0_0_30px_rgba(255,214,0,0.15)] relative overflow-hidden flex flex-col gap-6">
      <div className="absolute top-0 right-0 w-48 h-48 bg-amarelo-gol/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="text-center">
        <h2 className="font-display text-3xl text-[var(--text-primary)] uppercase tracking-wider mb-1">Draft Concluído</h2>
        {wasHardMode && (
          <p className="text-amarelo-gol text-xs font-mono uppercase font-bold animate-pulse">Overalls Revelados!</p>
        )}
      </div>

      <div className="flex flex-col items-center justify-center py-4 border-y border-[var(--border-color)]">
        <div className="text-xs text-secondary font-mono uppercase tracking-widest mb-2">Overall do Time</div>
        <div className="text-6xl font-display text-amarelo-gol drop-shadow-[0_0_15px_rgba(255,214,0,0.5)]">
          {totalOvr}
        </div>
      </div>

      <div className="flex justify-between gap-4">
        {bestPlayer && (
          <div className="flex-1 bg-verde-grama/20 border border-verde-grama/30 p-3 rounded-xl flex flex-col items-center text-center">
            <span className="text-[10px] font-mono text-verde-grama uppercase font-bold mb-1">Craque</span>
            <span className="text-sm text-[var(--text-primary)] font-bold truncate w-full">{bestPlayer.name}</span>
            <span className="text-xl font-display text-verde-grama mt-1">{bestPlayer.overall}</span>
          </div>
        )}
        {worstPlayer && (
          <div className="flex-1 bg-red-900/20 border border-red-500/30 p-3 rounded-xl flex flex-col items-center text-center">
            <span className="text-[10px] font-mono text-red-400 uppercase font-bold mb-1">Bagre</span>
            <span className="text-sm text-[var(--text-primary)] font-bold truncate w-full">{worstPlayer.name}</span>
            <span className="text-xl font-display text-red-400 mt-1">{worstPlayer.overall}</span>
          </div>
        )}
      </div>

      <button
        onClick={onSimulate}
        className="w-full mt-2 py-4 rounded-xl bg-amarelo-gol text-black font-display text-xl uppercase tracking-wider hover:bg-yellow-400 hover:scale-[1.02] transition-all shadow-[0_5px_15px_rgba(255,214,0,0.3)] flex items-center justify-center gap-2"
      >
        <Trophy className="w-5 h-5" /> Simular Copa
      </button>
    </div>
  );
}
