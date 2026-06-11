import Link from 'next/link';
import { Header } from '@/components/Header';
import { FloatingTeams } from '@/components/FloatingTeams';
import { Play, RotateCw } from 'lucide-react';

export default function GlobalHub() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-8 relative overflow-hidden transition-colors">
      <FloatingTeams />
      <Header />

      {/* Texture background */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      <div className="flex-1 w-full max-w-6xl flex flex-col items-center justify-center mt-12 z-10">
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-center text-primary leading-[0.85] tracking-tight mb-4">
          ENTROSA <span className="text-amarelo-gol drop-shadow-md">HUB</span>
        </h1>
        <p className="font-sans text-xl text-secondary font-medium text-center max-w-2xl mb-16">
          O console definitivo de mini-games de futebol. Escolha o seu universo e mostre que você domina a história da bola.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
          
          {/* Card: LINKS */}
          <div className="group relative bg-[#0a3a1f]/40 backdrop-blur-sm border-2 border-verde-grama rounded-3xl overflow-hidden hover:border-amarelo-gol transition-all duration-300 hover:scale-105 shadow-[0_10px_40px_rgba(26,107,58,0.3)] hover:shadow-[0_20px_60px_rgba(234,179,8,0.2)]">
            <div className="absolute inset-0 bg-gradient-to-t from-[#051c0e] to-transparent z-10 pointer-events-none"></div>
            <div className="p-8 relative z-20 flex flex-col h-full">
              <div className="flex justify-between items-start mb-12">
                <div className="bg-verde-grama text-white font-mono text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                  Clássico
                </div>
                <Play className="w-8 h-8 text-amarelo-gol group-hover:scale-110 transition-transform" />
              </div>
              
              <div className="mt-auto">
                <h2 className="font-display text-4xl text-white uppercase tracking-wide mb-2 group-hover:text-amarelo-gol transition-colors">
                  Modo Links
                </h2>
                <p className="text-white/70 font-medium mb-6">
                  Conecte 11 craques formando uma teia tática através de clubes, seleções e copas. O verdadeiro teste de química.
                </p>
                <Link href="/links" className="inline-flex items-center justify-center w-full bg-amarelo-gol text-black font-bold text-lg px-6 py-4 rounded-xl hover:bg-yellow-400 transition-colors uppercase tracking-wider shadow-[0_5px_15px_rgba(255,214,0,0.3)]">
                  Entrar no Lobby
                </Link>
              </div>
            </div>
          </div>

          {/* Card: DRAFT */}
          <div className="group relative bg-[#111]/40 backdrop-blur-sm border-2 border-blue-600 rounded-3xl overflow-hidden hover:border-blue-400 transition-all duration-300 hover:scale-105 shadow-[0_10px_40px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_60px_rgba(59,130,246,0.2)] opacity-80 hover:opacity-100">
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none"></div>
            <div className="p-8 relative z-20 flex flex-col h-full">
              <div className="flex justify-between items-start mb-12">
                <div className="bg-blue-600 text-white font-mono text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg animate-pulse">
                  Modo Online em breve!
                </div>
                <RotateCw className="w-8 h-8 text-blue-500 group-hover:rotate-180 transition-transform duration-700" />
              </div>
              
              <div className="mt-auto">
                <h2 className="font-display text-4xl text-white uppercase tracking-wide mb-2 group-hover:text-blue-400 transition-colors">
                  Modo Draft <span className="text-xl opacity-50">🎲</span>
                </h2>
                <p className="text-white/70 font-medium mb-6">
                  Gire o dado, receba elencos históricos e feche o seu esquadrão dos sonhos para batalhar nas ligas contra seus amigos.
                </p>
                <Link href="/draft" className="inline-flex items-center justify-center w-full bg-blue-600 text-white font-bold text-lg px-6 py-4 rounded-xl hover:bg-blue-500 transition-colors uppercase tracking-wider shadow-[0_5px_15px_rgba(37,99,235,0.3)]">
                  Começar Draft
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <footer className="w-full max-w-5xl text-center py-8 flex flex-col items-center border-t border-border-color mt-24 z-10 text-xs sm:text-sm">
        <div className="font-mono tracking-widest text-secondary font-bold">
          ENTROSA HUB CONSOLE V2.0
        </div>
      </footer>
    </main>
  );
}
