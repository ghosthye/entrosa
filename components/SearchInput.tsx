import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export interface PlayerSearchResult {
  id: string;
  name: string;
  cups: number[];
  position: string;
  team: string;
  region: string;
  overall: number;
  face_url?: string | null;
}

interface SearchInputProps {
  onSelect: (player: PlayerSearchResult) => void;
  disabled?: boolean;
  showOverall?: boolean;
}

export function SearchInput({ onSelect, disabled, showOverall = true }: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
          setResults(data);
          setIsOpen(true);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="relative w-full max-w-md mx-auto" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cinza-borda" size={20} />
        <input
          type="text"
          className="w-full pl-10 pr-10 py-3 rounded-lg border-2 border-cinza-borda focus:border-amarelo-gol focus:outline-none bg-branco text-preto placeholder:text-cinza-borda/80 font-sans disabled:opacity-50 text-lg"
          placeholder="Buscar jogador..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        />
        {query && (
          <button 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cinza-borda hover:text-preto"
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-branco border-2 border-cinza-borda rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {results.map((player) => (
            <div 
              key={player.id}
              className="p-3 border-b border-cinza-leve hover:bg-cinza-leve cursor-pointer flex flex-col gap-1 transition-colors"
              onClick={() => {
                onSelect(player);
                setIsOpen(false);
                setQuery('');
              }}
            >
              <div className="font-bold text-preto flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {player.face_url ? (
                    <img src={`/api/image?url=${encodeURIComponent(player.face_url)}`} alt={player.name} className="w-8 h-8 object-contain rounded-full bg-verde-grama border border-amarelo-gol" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-verde-grama flex items-center justify-center text-white text-xs font-bold border border-amarelo-gol">
                      {player.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm">{player.name}</span>
                  {showOverall && (
                    <span className="text-xs px-2 py-0.5 bg-amarelo-gol/20 text-amarelo-gol rounded-full font-bold">
                      {player.overall}
                    </span>
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 bg-cinza-borda/30 rounded font-mono font-bold text-cinza-borda/80">{player.position}</span>
              </div>
              <div className="text-xs text-cinza-borda flex gap-3 font-semibold">
                <span>🏳️ {player.team}</span>
                <span>🏆 {player.cups.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
