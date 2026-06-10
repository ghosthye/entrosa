import React, { useState } from 'react';
import { X, UserMinus } from 'lucide-react';
import { motion } from 'framer-motion';

interface ConnectionInfo {
  withName: string;
  type: string;
  detail: string;
}

interface PlayerDetailsModalProps {
  player: {
    id: string;
    name: string;
    country: string;
    overall?: number;
    face_url?: string | null;
  };
  connections: ConnectionInfo[];
  removalCost: number;
  onRemove: () => void;
  onClose: () => void;
}

export function PlayerDetailsModal({ player, connections, removalCost, onRemove, onClose }: PlayerDetailsModalProps) {
  const [imgError, setImgError] = useState(false);
  
  // Calcular pontos que este jogador rendeu no momento da inserção
  let totalPoints = connections.reduce((sum, c) => {
    // A pontuação base por tipo de conexão pode ser derivada, mas como não temos os pontos exatos
    // salvos no state, vamos fazer uma aproximação baseada nas regras ou apenas mostrar as strings
    let pts = 0;
    if (c.type === 'same_cup') pts = 8;
    else if (c.type === 'opponent_same_match') pts = 8;
    else if (c.type === 'club_same_year') pts = 7;
    else if (c.type === 'national_team_same_year') pts = 6;
    else if (c.type === 'club_any_year') pts = 5;
    else if (c.type === 'national_team_any_year') pts = 4;
    else if (c.type === 'same_continent') pts = 2;
    else if (c.type === 'same_position') pts = 2;
    else if (c.type === 'same_language') pts = 1;
    return sum + pts;
  }, 0);
  
  if (connections.length > 1) {
    totalPoints = Math.floor(totalPoints * (1 + (connections.length - 1) * 0.5));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.15)]"
      >
        <div className="p-6 relative flex flex-col items-center border-b border-[var(--border-color)] bg-[var(--bg-background)]">
          <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <X size={24} />
          </button>
          
          {player.face_url && !imgError ? (
            <img 
              src={`/api/image?url=${encodeURIComponent(player.face_url)}`} 
              alt={player.name} 
              className="w-24 h-24 object-contain mb-4 drop-shadow-lg" 
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-verde-grama flex items-center justify-center text-white font-display text-4xl mb-4 border-2 border-amarelo-gol shadow-lg">
              {player.name.charAt(0)}
            </div>
          )}
          
          <h2 className="font-display text-3xl uppercase text-[var(--text-primary)] text-center leading-tight mb-2">
            {player.name}
          </h2>
          
          <div className="flex gap-3">
            <span className="text-xs font-bold px-3 py-1 bg-cinza-leve text-[var(--text-primary)] border border-[var(--border-color)] rounded-full uppercase tracking-wider">
              {player.country}
            </span>
            {player.overall && (
              <span className="text-xs font-bold px-3 py-1 bg-amarelo-gol text-black rounded-full uppercase tracking-wider">
                OVR {player.overall}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 text-[var(--text-primary)]">
          <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Nota Fiscal de Entrosamento</h3>
          
          {connections.length === 0 ? (
            <div className="bg-[var(--bg-background)] border border-[var(--border-color)] rounded-lg p-4 text-center text-sm text-[var(--text-secondary)] italic">
              Jogador inicial do desafio. Não requer conexões.
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {connections.map((conn, idx) => (
                <div key={idx} className="bg-[var(--bg-background)] border border-[var(--border-color)] rounded-lg p-3 text-sm">
                  <div className="font-bold text-amarelo-gol mb-1">
                    Conexão com {conn.withName}
                  </div>
                  <div className="text-[var(--text-primary)]">
                    {conn.detail}
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between items-center bg-amarelo-gol/10 border border-amarelo-gol/30 rounded-lg p-3 font-bold text-amarelo-gol mt-4">
                <span>Total Rendido na Inserção:</span>
                <span className="text-lg">+{totalPoints} pts</span>
              </div>
            </div>
          )}

          <button
            onClick={onRemove}
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3 rounded-xl font-bold uppercase tracking-wider transition-colors mt-6 dark:bg-red-950/40 dark:text-red-500 dark:border-red-900/50 dark:hover:bg-red-900/60"
          >
            <UserMinus size={18} />
            Remover Jogador (-{removalCost} pts)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
