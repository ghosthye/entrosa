import React from 'react';
import { ConnectionType } from '@/lib/rules';

interface ConnectionBadgeProps {
  type: ConnectionType;
  label?: string;
}

export function ConnectionBadge({ type, label }: ConnectionBadgeProps) {
  const config: Record<string, any> = {
    national_team_same_year: { bg: 'bg-green-100', text: 'text-green-800', icon: '🏳️', defaultLabel: 'Mesma seleção' },
    national_team_any_year: { bg: 'bg-green-50', text: 'text-green-700', icon: '🏳️', defaultLabel: 'Mesma seleção (anos dif.)' },
    opponent_same_match: { bg: 'bg-red-100', text: 'text-red-800', icon: '⚔️', defaultLabel: 'Adversários' },
    club_same_year: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '👕', defaultLabel: 'Mesmo Clube' },
    club_any_year: { bg: 'bg-blue-50', text: 'text-blue-700', icon: '👕', defaultLabel: 'Mesmo Clube (anos dif.)' },
    same_continent: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '🌍', defaultLabel: 'Mesmo continente' },
    same_cup: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🏆', defaultLabel: 'Mesma Copa' },
    same_position: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '⚽', defaultLabel: 'Mesma Posição' },
    same_language: { bg: 'bg-zinc-100', text: 'text-zinc-800', icon: '🗣️', defaultLabel: 'Mesmo Idioma' },
  };

  const style = config[type] || config.national_team_same_year;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${style.bg} ${style.text}`}>
      <span>{style.icon}</span>
      <span>{label || style.defaultLabel}</span>
    </span>
  );
}
