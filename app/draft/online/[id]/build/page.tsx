"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Dice3, RefreshCcw, AlertCircle, Users, CheckCircle2, LogOut } from 'lucide-react';
import { Field, FormationNode } from '@/components/Field';
import { SlotStatus } from '@/components/PlayerSlot';
import { TeamSpinner } from '@/components/TeamSpinner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { Header } from '@/components/Header';

// Tipos básicos
type Player = {
  id: string;
  name: string;
  face_url: string | null;
  position: string;
  shirtNumber: number;
  overall: number;
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

// ... copiando as formações do DraftClient para manter a compatibilidade
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
  // Pode adicionar as outras formações depois (simplificando por enquanto)
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

export default function DraftOnlineClient() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  const { user, role } = useAuth();
  
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [currentRoll, setCurrentRoll] = useState<RollResult | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [skipsLeft, setSkipsLeft] = useState(3);
  const [mustPick, setMustPick] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const isDraftComplete = slots.length > 0 && slots.every(s => s.player !== null);
  const isReady = players.find(p => p.id === localPlayerId)?.is_ready || false;

  useEffect(() => {
    const storedPlayerId = localStorage.getItem(`draft_player_${roomId}`);
    setLocalPlayerId(storedPlayerId);

    const fetchRoom = async () => {
      const { data: roomData } = await supabase.from('draft_rooms').select('*').eq('id', roomId).single();
      if (roomData) {
        setRoom(roomData);
        setSkipsLeft(roomData.settings.skips || 3);
        setSlots(prev => {
          if (prev.length === 0) {
            const formationData = FORMATIONS['4-3-3']; 
            return formationData.slots.map(s => ({ ...s, player: null }));
          }
          return prev;
        });
      }

      const { data: playersData } = await supabase.from('draft_room_players').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
      if (playersData) setPlayers(playersData);
    };

    fetchRoom();

    const playersChannel = supabase.channel(`room_${roomId}_players_build`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_room_players', filter: `room_id=eq.${roomId}` }, (payload) => {
        fetchRoom();
      })
      .subscribe();
      
    const roomChannel = supabase.channel(`room_${roomId}_status_build`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'draft_rooms', filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.new.status === 'simulating') {
          router.push(`/draft/online/${roomId}/arena`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [roomId, router]);

  // Se todos estão prontos, o Host pode iniciar a simulação!
  useEffect(() => {
    if (room && players.length > 0) {
      const allReady = players.every(p => p.is_ready);
      const isHost = players.find(p => p.id === localPlayerId)?.is_host;
      if (allReady && isHost && room.status === 'drafting') {
        supabase.from('draft_rooms').update({ status: 'simulating' }).eq('id', roomId).then();
      }
    }
  }, [players, room, localPlayerId, roomId]);

  // Handle finalização do draft do jogador atual
  useEffect(() => {
    if (isDraftComplete && !isReady && localPlayerId) {
      const finishMyDraft = async () => {
        const formationData = FORMATIONS['4-3-3'];
        const nodes: FormationNode[][] = formationData.layout.map(rowIds => {
          return rowIds.map(id => {
            const slot = slots.find(s => s.id === id)!;
            return {
              id: slot.id,
              position: slot.label as any,
              status: 'filled',
              playerName: slot.player?.name,
              faceUrl: slot.player?.face_url,
              playerOvr: slot.player?.overall,
            };
          });
        });

        const overall = Math.round(slots.reduce((acc, s) => acc + (s.player?.overall || 0), 0) / 11);

        await supabase.from('draft_room_players').update({
          is_ready: true,
          team_json: nodes,
          overall: overall
        }).eq('id', localPlayerId);
      };
      finishMyDraft();
    }
  }, [isDraftComplete, isReady, localPlayerId, slots]);

  if (!room) return <div className="min-h-screen bg-background flex items-center justify-center animate-pulse text-white">Carregando Sala...</div>;

  const handleRoll = async () => {
    if (mustPick) {
      if (skipsLeft <= 0) return;
      setSkipsLeft(s => s - 1);
    }
    
    setIsSpinning(true);
    setSelectedPlayer(null);
    setMustPick(true);

    try {
      const url = new URL('/api/draft/roll', window.location.origin);
      if (room.mode) url.searchParams.append('league', room.mode);
      
      const res = await fetch(url.toString());
      const data = await res.json();
      
      setTimeout(() => {
        setCurrentRoll(data);
        setIsSpinning(false);
      }, 2000);
    } catch (e) {
      console.error(e);
      setIsSpinning(false);
    }
  };

  const handleSelectPlayer = (player: Player) => setSelectedPlayer(player);

  const canAssignToSlot = (slot: Slot, player: Player | null) => {
    if (!player) return false;
    if (slot.player !== null) return false;
    return slot.expectedPositions.includes(player.position);
  };

  const handleAssignToSlot = (slotId: string) => {
    if (!selectedPlayer) return;
    const targetSlot = slots.find(s => s.id === slotId);
    if (!targetSlot || !canAssignToSlot(targetSlot, selectedPlayer)) return;

    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, player: selectedPlayer } : s));
    setMustPick(false);
    setCurrentRoll(null);
    setSelectedPlayer(null);
  };

  const isHard = room?.settings?.difficulty === 'hard';

  const formationData = FORMATIONS['4-3-3'];
  const nodes: FormationNode[][] = formationData.layout.map(rowIds => {
    return rowIds.map(id => {
      const slot = slots.find(s => s.id === id)!;
      const isAvailable = canAssignToSlot(slot, selectedPlayer);
      let status: SlotStatus = 'locked';
      if (slot.player) status = 'filled';
      else if (selectedPlayer) status = isAvailable ? 'selected' : 'locked';
      else status = 'empty';

      return {
        id: slot.id,
        position: slot.label as any,
        status,
        playerName: slot.player?.name,
        faceUrl: slot.player?.face_url,
        playerOvr: isHard ? undefined : slot.player?.overall,
        tooltipInfo: isAvailable ? 'Clique para escalar' : undefined
      };
    });
  });

  const handleLeaveRoom = async () => {
    if (localPlayerId) {
      await supabase.from('draft_room_players').delete().eq('id', localPlayerId);
      localStorage.removeItem(`draft_player_${roomId}`);
    }
    router.push('/draft/online');
  };

  const handleDebugFill = () => {
    setSlots(prev => prev.map((s, i) => ({
      ...s,
      player: {
        id: `debug-${i}`,
        name: `Debug Player ${i}`,
        face_url: null,
        position: s.label,
        shirtNumber: i + 1,
        overall: 80 + Math.floor(Math.random() * 10)
      }
    })));
  };

  return (
    <main className="min-h-screen bg-[var(--bg-background)] flex flex-col items-center">
      <Header />
      <div className="flex-1 w-full flex flex-col lg:flex-row gap-8 lg:gap-16 h-full max-w-[1400px] mx-auto items-start px-4 sm:px-8 py-4">
        
        {/* Left Area - Controls */}
        <div className="w-full lg:w-[420px] flex flex-col gap-6 shrink-0 lg:sticky lg:top-4 z-10">
          {/* Header Multiplayer Status */}
          <div className="bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="font-display text-xl text-white uppercase flex items-center gap-2"><Users className="w-5 h-5 text-blue-500"/> Status da Sala</h3>
            <div className="flex flex-col gap-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                  <span className={`font-bold text-sm ${p.id === localPlayerId ? 'text-blue-400' : 'text-white/80'}`}>{p.player_name}</span>
                  {p.is_ready ? (
                    <span className="text-xs bg-verde-grama/20 text-verde-grama px-2 py-1 rounded flex items-center gap-1 font-bold uppercase"><CheckCircle2 className="w-3 h-3"/> Pronto</span>
                  ) : (
                    <span className="text-xs bg-amarelo-gol/20 text-amarelo-gol px-2 py-1 rounded font-bold uppercase animate-pulse">Montando...</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <button onClick={handleDebugFill} className="w-full bg-red-600/20 text-red-500 border border-red-500/50 rounded-xl py-2 font-bold uppercase text-xs hover:bg-red-600/40 transition-colors">
            Debug: Preencher Elenco
          </button>


          {isReady ? (
            <div className="bg-surface border border-amarelo-gol rounded-2xl p-6 shadow-[0_0_30px_rgba(255,214,0,0.15)] text-center">
              <h2 className="font-display text-2xl text-[var(--text-primary)] uppercase tracking-wider mb-2">Seu Draft Terminou!</h2>
              <p className="text-secondary mb-4">Aguardando os outros jogadores terminarem para iniciarmos a simulação...</p>
              <div className="animate-spin w-8 h-8 border-4 border-amarelo-gol border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <div className="bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <h2 className="font-display text-3xl text-white uppercase tracking-wider leading-none">Draft</h2>
                  <p className="text-secondary text-[10px] font-mono uppercase tracking-widest mt-1">Modo Multiplayer</p>
                </div>
                <div className="flex items-center gap-2">
                  {(role === 'admin' || role === 'super_admin') && (
                    <button 
                      onClick={() => {
                        setSlots(prev => prev.map((s, i) => s.player ? s : {
                          ...s,
                          player: { id: `DBG-${i}`, name: `Debug ${i}`, face_url: null, position: s.expectedPositions[0], shirtNumber: i + 1, overall: 85 }
                        }));
                        setMustPick(false);
                        setCurrentRoll(null);
                      }}
                      className="text-[9px] bg-red-600/20 text-red-400 border border-red-600/50 px-2 py-1 rounded-lg uppercase font-bold hover:bg-red-600 hover:text-white transition-colors"
                    >
                      Debug Fill
                    </button>
                  )}
                  <button onClick={handleLeaveRoom} className="text-red-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors" title="Sair da Sala">
                    <LogOut size={20} />
                  </button>
                </div>
              </div>

              {mustPick && skipsLeft > 0 && !isSpinning ? (
                <div className="flex flex-col gap-3 relative z-10">
                  <button 
                    onClick={handleRoll}
                    disabled={isSpinning}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-white/10 hover:border-white/30 hover:bg-white/5 text-secondary hover:text-white font-display text-base uppercase transition-all"
                  >
                    <RefreshCcw className="w-4 h-4" /> Pular ({skipsLeft} restantes)
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleRoll}
                  disabled={isSpinning || (mustPick && skipsLeft === 0)}
                  className={`relative z-10 w-full flex items-center justify-center gap-2 py-4 rounded-xl font-display text-xl uppercase tracking-widest transition-all
                    ${isSpinning ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 
                      mustPick && skipsLeft === 0 ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5' :
                      'bg-gradient-to-r from-amarelo-gol to-yellow-400 text-black hover:scale-[1.03]'
                    }`}
                >
                  {isSpinning ? 'Sorteando...' : <><Dice3 className="w-8 h-8" /> Rolar Equipe</>}
                </button>
              )}

              {/* Roster List */}
              {isSpinning ? (
                <TeamSpinner league={room.mode} />
              ) : currentRoll?.team ? (
                <div className="mt-4 bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col overflow-hidden max-h-[300px] shadow-2xl relative">
                  <div className="p-3 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10 relative">
                    <h3 className="font-display text-xl text-white leading-none tracking-wide drop-shadow-md">
                      {currentRoll.team.name} <span className="text-amarelo-gol">{currentRoll.team.year}</span>
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {currentRoll.roster.map(player => {
                      const isSelected = selectedPlayer?.id === player.id;
                      const isAlreadyDrafted = slots.some(s => s.player?.id === player.id);
                      return (
                        <button
                          key={player.id}
                          onClick={() => !isAlreadyDrafted && handleSelectPlayer(player)}
                          disabled={isAlreadyDrafted}
                          className={`w-full flex items-center justify-between px-3 py-2 mb-0.5 rounded-xl text-left transition-all duration-200
                            ${isAlreadyDrafted ? 'opacity-20 cursor-not-allowed grayscale' :
                              isSelected ? 'bg-verde-grama/20 border border-verde-grama/40 shadow-[inset_0_0_20px_rgba(29,158,117,0.2)] pl-5' : 'hover:bg-white/5 border border-transparent hover:border-white/10'}`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`font-mono text-xs w-5 shrink-0 text-center ${isSelected ? 'text-amarelo-gol' : 'text-white/30'}`}>#{player.shirtNumber}</span>
                            <span className={`font-bold truncate text-xs tracking-wide ${isSelected ? 'text-amarelo-gol' : 'text-white'}`}>
                              {player.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isHard && (
                              <div className="flex flex-col items-end justify-center w-8">
                                <span className={`text-sm font-display font-bold leading-none ${player.overall >= 90 ? 'text-amarelo-gol drop-shadow-[0_0_5px_rgba(255,214,0,0.5)]' : player.overall >= 80 ? 'text-white' : 'text-white/40'}`}>
                                  {player.overall}
                                </span>
                              </div>
                            )}
                            <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded text-center border ${isSelected ? 'bg-amarelo-gol/20 text-amarelo-gol border-amarelo-gol/50' : 'bg-white/5 text-white/70 border-white/10'}`}>
                              {player.position}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Right Area: Pitch */}
        <div className="flex-1 flex justify-center lg:justify-end w-full min-w-0 transform lg:scale-90 origin-top -mt-2">
          <Field nodes={nodes} onSlotClick={handleAssignToSlot} />
        </div>
      </div>
    </main>
  );
}
