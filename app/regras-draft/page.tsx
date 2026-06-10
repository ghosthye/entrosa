"use client";

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Dice3, Trophy, Shield, FastForward, ArrowLeft } from 'lucide-react';

export default function RegrasDraftPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-8">
      <Header />
      
      <div className="w-full max-w-3xl mt-8">
        <Link href="/draft">
          <button className="flex items-center gap-2 text-secondary hover:text-primary transition-colors mb-6 font-bold uppercase tracking-widest text-sm">
            <ArrowLeft size={16} /> Voltar para o Draft
          </button>
        </Link>
        
        <h1 className="font-display text-4xl md:text-5xl text-blue-500 uppercase mb-4">Manual do Técnico</h1>
        <p className="text-secondary text-lg mb-10 border-b border-border-color pb-8">
          Aprenda a dominar o mercado de transferências histórico e construa a sua dinastia no modo Draft.
        </p>

        <div className="space-y-12 mb-16">
          {/* Regra 1 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0 mt-1">
              <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Shield size={24} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary mb-2 uppercase tracking-wide">1. Escolha a Tática</h2>
              <p className="text-secondary leading-relaxed">
                Antes de iniciar o sorteio, você precisa definir a formação do seu time (ex: 4-3-3, 4-4-2, 3-5-2). Pense bem: você terá exatamente 11 posições para preencher e não poderá mudar de formação depois. Se escolher jogar sem pontas, ignore os atacantes de beirada que caírem nos sorteios!
              </p>
            </div>
          </div>

          {/* Regra 2 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0 mt-1">
              <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Dice3 size={24} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary mb-2 uppercase tracking-wide">2. Role os Dados (RNG)</h2>
              <p className="text-secondary leading-relaxed mb-4">
                O coração do Draft. Ao clicar em Rolar Dado, o sistema sorteará um elenco histórico inteiro de uma Copa do Mundo (ex: Brasil 2002). Você deverá escolher <strong>APENAS UM</strong> jogador dessa lista para ocupar um espaço no seu campo.
              </p>
              <div className="bg-surface p-4 rounded-xl border border-border-color text-sm text-secondary">
                <strong>Atenção às Posições:</strong> Um jogador só rende 100% do seu Overall se estiver na posição nativa dele. Colocar um Atacante no Gol ou um Zagueiro na Ponta vai diminuir as chances do seu time no simulador.
              </div>
            </div>
          </div>

          {/* Regra 3 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0 mt-1">
              <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <FastForward size={24} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary mb-2 uppercase tracking-wide">3. O Poder do Skip</h2>
              <p className="text-secondary leading-relaxed">
                Caiu uma seleção muito fraca e você não quer sujar seu time com bagres? Você pode pular a rodada apertando o botão de Skip. Mas cuidado: eles são <strong>limitados</strong> por Draft! Use-os estrategicamente quando realmente não tiver ninguém que preste ou quando você precisar de posições específicas.
              </p>
            </div>
          </div>

          {/* Regra 4 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0 mt-1">
              <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Trophy size={24} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary mb-2 uppercase tracking-wide">4. Simulação de Ligas e Copas</h2>
              <p className="text-secondary leading-relaxed">
                Quando você fechar os 11 espaços, o seu time ganha um Overall Total baseado na química e força dos jogadores escolhidos. A partir daí, você leva essa panela para a simulação contra outros times na disputa pela Taça. Monte times fortes e garanta vitórias nas competições multiplayer para subir no Ranking!
              </p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
