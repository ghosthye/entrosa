"use client";

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { BookOpen, Trophy, Zap, ShieldAlert, Globe2, ChevronLeft } from 'lucide-react';

export default function RegrasPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-8">
      <Header />
      
      <div className="w-full max-w-3xl mt-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-600 p-3 rounded-full text-white shadow-lg">
            <BookOpen size={32} />
          </div>
          <div>
            <h1 className="font-display text-4xl text-primary uppercase tracking-wide">Manual do Técnico</h1>
            <p className="text-secondary font-medium">Entenda as conexões e o sistema de pontuação</p>
          </div>
        </div>

        <div className="space-y-8">
          <section className="bg-surface border border-border-color p-6 md:p-8 rounded-3xl shadow-sm">
            <h2 className="font-display text-2xl text-primary uppercase mb-6 flex items-center gap-2">
              <Trophy className="text-amarelo-gol" /> Conexões de Ouro (Difícil)
            </h2>
            <p className="text-secondary mb-4">Estas são as conexões mais valiosas do jogo. Elas exigem que os jogadores tenham dividido o campo exatamente no mesmo ano.</p>
            <ul className="space-y-4">
              <li className="flex justify-between items-center border-b border-border-color pb-2">
                <span className="font-bold text-primary">Companheiros de Seleção (Mesmo Ano)</span>
                <span className="bg-amarelo-gol/20 text-amarelo-gol font-bold px-3 py-1 rounded-full text-sm">20 pts</span>
              </li>
              <li className="flex justify-between items-center border-b border-border-color pb-2">
                <span className="font-bold text-primary">Adversários em Campo (Se enfrentaram na Copa)</span>
                <span className="bg-amarelo-gol/20 text-amarelo-gol font-bold px-3 py-1 rounded-full text-sm">15 pts</span>
              </li>
              <li className="flex justify-between items-center border-b border-border-color pb-2">
                <span className="font-bold text-primary">Companheiros de Clube (Mesmo Ano)</span>
                <span className="bg-amarelo-gol/20 text-amarelo-gol font-bold px-3 py-1 rounded-full text-sm">15 pts</span>
              </li>
            </ul>
          </section>

          <section className="bg-surface border border-border-color p-6 md:p-8 rounded-3xl shadow-sm">
            <h2 className="font-display text-2xl text-primary uppercase mb-6 flex items-center gap-2">
              <ShieldAlert className="text-blue-500" /> Conexões de Prata (Médio)
            </h2>
            <p className="text-secondary mb-4">Conexões flexíveis para jogadores que defenderam as mesmas cores, mas não necessariamente na mesma época.</p>
            <ul className="space-y-4">
              <li className="flex justify-between items-center border-b border-border-color pb-2">
                <span className="font-bold text-primary">Mesma Seleção (Qualquer Ano)</span>
                <span className="bg-blue-500/20 text-blue-500 font-bold px-3 py-1 rounded-full text-sm">10 pts</span>
              </li>
              <li className="flex justify-between items-center border-b border-border-color pb-2">
                <span className="font-bold text-primary">Mesmo Clube (Qualquer Ano)</span>
                <span className="bg-blue-500/20 text-blue-500 font-bold px-3 py-1 rounded-full text-sm">10 pts</span>
              </li>
              <li className="flex justify-between items-center border-b border-border-color pb-2">
                <span className="font-bold text-primary">Jogaram a Mesma Edição da Copa</span>
                <span className="bg-blue-500/20 text-blue-500 font-bold px-3 py-1 rounded-full text-sm">8 pts</span>
              </li>
            </ul>
          </section>

          <section className="bg-surface border border-border-color p-6 md:p-8 rounded-3xl shadow-sm">
            <h2 className="font-display text-2xl text-primary uppercase mb-6 flex items-center gap-2">
              <Globe2 className="text-verde-grama" /> Conexões de Bronze (Fácil)
            </h2>
            <p className="text-secondary mb-4">Apenas válidas no nível Fácil. Excelentes para completar elencos quando as opções são limitadas.</p>
            <ul className="space-y-4">
              <li className="flex justify-between items-center border-b border-border-color pb-2">
                <span className="font-bold text-primary">Mesmo Idioma Nativo</span>
                <span className="bg-verde-grama/20 text-verde-grama font-bold px-3 py-1 rounded-full text-sm">3 pts</span>
              </li>
              <li className="flex justify-between items-center border-b border-border-color pb-2">
                <span className="font-bold text-primary">Mesmo Continente</span>
                <span className="bg-verde-grama/20 text-verde-grama font-bold px-3 py-1 rounded-full text-sm">2 pts</span>
              </li>
              <li className="flex justify-between items-center border-b border-border-color pb-2">
                <span className="font-bold text-primary">Mesma Posição</span>
                <span className="bg-verde-grama/20 text-verde-grama font-bold px-3 py-1 rounded-full text-sm">2 pts</span>
              </li>
            </ul>
          </section>

          <section className="bg-gradient-to-br from-amarelo-gol/20 to-orange-500/20 border-2 border-amarelo-gol p-6 md:p-8 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
              <Zap size={250} />
            </div>
            <div className="relative z-10">
              <h2 className="font-display text-3xl text-primary uppercase mb-4 flex items-center gap-2">
                <Zap className="text-orange-500 fill-orange-500" /> Bônus Multiplicador
              </h2>
              <p className="text-lg font-medium text-primary mb-6">
                O segredo para pontuações gigantes! Quando você coloca um jogador no campo e ele se conecta com <strong className="text-orange-600">vários vizinhos ao mesmo tempo</strong>, o jogo soma os pontos de todas as conexões e aplica um bônus explosivo:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-background/80 backdrop-blur border border-border-color p-4 rounded-xl text-center">
                  <div className="text-sm font-bold text-secondary uppercase tracking-widest mb-1">2 Vizinhos</div>
                  <div className="text-3xl font-display text-orange-500">+50% Bônus</div>
                  <div className="text-xs text-secondary mt-1 font-mono">(Soma das conexões x 1.5)</div>
                </div>
                <div className="bg-background/80 backdrop-blur border border-border-color p-4 rounded-xl text-center">
                  <div className="text-sm font-bold text-secondary uppercase tracking-widest mb-1">3 Vizinhos</div>
                  <div className="text-3xl font-display text-red-500">+100% Bônus</div>
                  <div className="text-xs text-secondary mt-1 font-mono">(Soma das conexões x 2.0)</div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-12 flex justify-center pb-12">
            <Link href="/">
              <button className="bg-background border-2 border-border-color hover:border-amarelo-gol text-primary font-bold py-3 px-8 rounded-xl uppercase tracking-wider transition-colors flex items-center gap-2">
                <ChevronLeft size={20} /> Voltar ao Início
              </button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
