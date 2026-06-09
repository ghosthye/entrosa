import React from 'react';
import { ConnectionBadge } from './ConnectionBadge';
import { ConnectionType } from '@/lib/rules';

export interface ChainNode {
  player: { id: string; name: string; country: string; overall?: number };
  slotId: string;
  connections?: { withName: string; type: string; detail: string }[];
}

interface ChainBarProps {
  nodes: ChainNode[];
}

export function ChainBar({ nodes }: ChainBarProps) {
  if (nodes.length === 0) return null;

  return (
    <div className="w-full flex overflow-x-auto py-4 px-2 gap-4 items-start hide-scrollbar">
      {nodes.map((node, index) => (
        <React.Fragment key={index}>
          {/* Player Node */}
          <div className="flex flex-col items-center flex-shrink-0 z-10 bg-branco rounded-lg px-2 pt-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-preto text-branco flex items-center justify-center font-display text-xl border-2 border-cinza-borda shadow-sm">
              {node.player.name.charAt(0)}
            </div>
            <div className="text-[10px] sm:text-xs font-bold mt-1 max-w-[60px] sm:max-w-[80px] truncate text-center text-preto">
              {node.player.name.split(' ').pop()}
            </div>
            <div className="text-[9px] sm:text-[10px] text-cinza-borda font-bold pb-2">
              {node.player.country}
            </div>
          </div>

          {/* Connections (Web) */}
          {node.connections && node.connections.length > 0 && (
            <div className="flex flex-col items-center flex-shrink-0 px-1 gap-1 justify-center h-full pt-2">
              {node.connections.map((conn, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <span className="text-[9px] sm:text-[10px] text-cinza-borda/80 font-bold mb-0.5">link c/ {conn.withName.split(' ').pop()}</span>
                  <ConnectionBadge type={conn.type as ConnectionType} label={conn.detail} />
                </div>
              ))}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
