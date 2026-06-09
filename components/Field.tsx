import React from 'react';
import { PlayerSlot, SlotStatus } from './PlayerSlot';

export interface FormationNode {
  id: string;
  position: 'ATA' | 'MEI' | 'LAT' | 'ZAG' | 'GOL' | 'DEF';
  status: SlotStatus;
  playerName?: string;
  playerCountry?: string;
  playerYear?: string | number;
  playerOvr?: number;
  tooltipInfo?: string;
  faceUrl?: string | null;
}

interface FieldProps {
  nodes: FormationNode[][];
  onSlotClick?: (id: string) => void;
  errorNodeId?: string;
}

export function Field({ nodes, onSlotClick, errorNodeId }: FieldProps) {
  return (
    <div className="w-full max-w-2xl mx-auto bg-verde-campo rounded-2xl p-4 sm:p-8 relative shadow-2xl border-4 border-verde-grama">
      {/* Field Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center p-4 overflow-hidden rounded-xl">
        <div className="w-full h-full border-2 border-branco"></div>
        <div className="absolute w-full h-px bg-branco top-1/2 -translate-y-1/2"></div>
        <div className="absolute w-24 h-24 sm:w-32 sm:h-32 border-2 border-branco rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute w-2 h-2 bg-branco rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
        {/* Penalty areas */}
        <div className="absolute top-4 w-32 sm:w-48 h-16 border-2 border-branco border-t-0 left-1/2 -translate-x-1/2"></div>
        <div className="absolute bottom-4 w-32 sm:w-48 h-16 border-2 border-branco border-b-0 left-1/2 -translate-x-1/2"></div>
      </div>

      <div className="relative z-10 flex flex-col gap-4 sm:gap-6 items-center py-2 w-full">
        {nodes.map((row, rowIndex) => (
          <div key={rowIndex} className="flex flex-row justify-center gap-3 sm:gap-6 w-full">
            {row.map((node) => (
              <PlayerSlot
                key={node.id}
                status={node.status}
                positionLabel={node.position}
                playerName={node.playerName}
                playerCountry={node.playerCountry}
                playerYear={node.playerYear}
                playerOvr={node.playerOvr}
                isError={errorNodeId === node.id}
                onClick={() => onSlotClick?.(node.id)}
                tooltipInfo={node.tooltipInfo}
                faceUrl={node.faceUrl}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
