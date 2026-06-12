import React, { useEffect, useState } from 'react';
import { Dice3, Trophy, Shield, RefreshCcw, Swords, PlayCircle } from 'lucide-react';
import { SaveManager, EntrosaSave } from '@/lib/saveManager';

type DraftLandingProps = {
  onStart: () => void;
  onLoadSave?: (save: Partial<EntrosaSave>) => void;
};

export function DraftLanding({ onStart, onLoadSave }: DraftLandingProps) {
  const [localSave, setLocalSave] = useState<Partial<EntrosaSave> | null>(null);

  useEffect(() => {
    const save = SaveManager.loadLocally();
    if (save && save.status === 'in_progress') {
      setLocalSave(save);
    }
  }, []);

  return (
    <div className="w-full flex flex-col items-center pb-20 relative z-10 px-4 sm:px-8">
      {/* Hero Section */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-12 mt-4 sm:mt-12">
        <div className="flex-1 text-center md:text-left">
          <h1 className="font-display text-7xl md:text-8xl lg:text-9xl text-blue-600 leading-[0.85] tracking-tight mb-6">
            DRAFT<br/>
            <span className="text-primary">HISTÓRICO</span>
          </h1>
          <p className="font-sans text-lg sm:text-xl md:text-2xl text-secondary font-medium max-w-lg mx-auto md:mx-0 mb-10 leading-snug">
            Role o dado para descobrir qual Seleção Histórica você vai controlar. Monte um esquadrão imbatível e prove seu valor na Copa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            {localSave && onLoadSave && (
              <button onClick={() => onLoadSave(localSave)} className="bg-amarelo-gol text-black font-bold text-lg sm:text-xl px-8 py-4 rounded-xl hover:scale-105 transition-transform active:scale-95 uppercase tracking-wider text-center shadow-[0_0_15px_rgba(255,214,0,0.4)] flex items-center justify-center gap-2">
                <PlayCircle size={24} /> Continuar {localSave.mode === 'brasileirao' ? 'Brasileirão' : 'Copa'}
              </button>
            )}
            <button onClick={onStart} className="bg-blue-600 text-white font-bold text-lg sm:text-xl px-8 py-4 rounded-xl hover:bg-blue-500 transition-transform active:scale-95 uppercase tracking-wider text-center shadow-[0_0_15px_rgba(37,99,235,0.3)]">
              Novo Draft
            </button>
          </div>
        </div>
        
        {/* Right Side - Hero Image / Dice Card */}
        <div className="w-full max-w-[320px] bg-[#051530] border-4 border-blue-600 rounded-2xl shadow-[0_20px_50px_rgba(37,99,235,0.3)] relative flex flex-col transform md:rotate-3 transition-transform hover:rotate-0 duration-500 overflow-hidden">
           <div className="bg-[#030a1c] p-4 text-center border-b-2 border-blue-600">
             <div className="text-blue-400 font-mono text-xs font-bold tracking-widest uppercase mb-1">RNG Ativado</div>
             <div className="text-white text-sm font-medium">Sorte ou Tática?</div>
           </div>
           
           <div className="p-6 flex flex-col items-center justify-center relative flex-1 min-h-[220px]">
             <div className="absolute inset-2 border-2 border-white/10 rounded-lg pointer-events-none"></div>
             
             <div className="text-white/60 text-xs font-bold tracking-widest uppercase mb-4 text-center">
               O seu destino está<br/>nas mãos do dado
             </div>
             
             <div className="bg-[#0a0f1a] border border-blue-500/30 rounded-xl p-4 w-full text-center relative shadow-[0_0_20px_rgba(59,130,246,0.15)] flex flex-col items-center">
                <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center text-white font-display text-xl mx-auto -mt-8 mb-2 border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-bounce">
                  <Dice3 size={32} />
                </div>
                <h3 className="text-white font-display text-2xl uppercase leading-tight mb-2 mt-2">Brazil 2002?</h3>
                <h3 className="text-white/40 font-display text-xl uppercase leading-tight line-through">Zaire 1974!</h3>
             </div>
           </div>
        </div>
      </div>

      {/* Como Jogar Section */}
      <div id="como-funciona" className="w-full max-w-5xl mt-24 mb-16 z-10 px-4">
        <div className="flex flex-col items-center mb-16">
          <h2 className="font-display text-4xl sm:text-5xl text-primary text-center uppercase tracking-wide">Como Jogar?</h2>
          <div className="w-24 h-1 bg-blue-600 mt-4 rounded-full"></div>
          <p className="text-secondary mt-6 max-w-2xl text-center text-lg">O Draft do Entrosa é o modo perfeito para testar sua capacidade de se adaptar e montar times com os recursos que a sorte te der.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-surface p-8 rounded-2xl border border-border-color shadow-lg hover:border-blue-500/50 transition-colors relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-900/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-600/10 transition-colors"></div>
             <div className="text-4xl mb-4">⚙️</div>
             <h3 className="font-bold text-xl mb-3 text-primary uppercase tracking-wide">A Tática</h3>
             <p className="text-secondary font-medium leading-relaxed">Antes de rolar os dados, você escolhe o seu esquema tático (Ex: 4-4-2, 4-3-3). Escolha com sabedoria, pois você precisará preencher essas exatas 11 posições, e nem toda seleção que você sortear terá pontas ou volantes de ofício!</p>
          </div>
          
          <div className="bg-surface p-8 rounded-2xl border border-border-color shadow-lg hover:border-blue-500/50 transition-colors relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-900/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-600/10 transition-colors"></div>
             <div className="text-4xl mb-4">🎲</div>
             <h3 className="font-bold text-xl mb-3 text-primary uppercase tracking-wide">Os Giros</h3>
             <p className="text-secondary font-medium leading-relaxed">Em cada turno, você clica no dado e o jogo sorteia um elenco histórico das Copas (Ex: Itália 2006). Você analisa os jogadores disponíveis na lista e escolhe um para preencher uma das suas 11 vagas.</p>
          </div>
          
          <div className="bg-surface p-8 rounded-2xl border border-border-color shadow-lg hover:border-blue-500/50 transition-colors relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-900/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-600/10 transition-colors"></div>
             <div className="text-4xl mb-4">⏭️</div>
             <h3 className="font-bold text-xl mb-3 text-primary uppercase tracking-wide">Os Skips</h3>
             <p className="text-secondary font-medium leading-relaxed">Você é <strong>obrigado</strong> a escolher alguém de toda seleção que cair... a não ser que você use um "Skip". Se você cair no Irã de 2014 e não quiser ninguém de lá, aperte o botão de Pular. Mas cuidado: os Skips são limitados!</p>
          </div>

          <div className="bg-surface p-8 rounded-2xl border border-border-color shadow-lg hover:border-blue-500/50 transition-colors relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-900/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-600/10 transition-colors"></div>
             <div className="text-4xl mb-4">🏆</div>
             <h3 className="font-bold text-xl mb-3 text-primary uppercase tracking-wide">O Fim de Jogo</h3>
             <p className="text-secondary font-medium leading-relaxed">Se o seu time preencher os 11 espaços, você avança para a simulação do Torneio. Se você ficar preso por falta de posição ou jogadores ruins, paciência... seu Overall vai refletir suas más escolhas na hora do vamos ver!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
