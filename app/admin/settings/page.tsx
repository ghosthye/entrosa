"use client";

import { Settings, Save, Bell, Shield, Database } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="text-4xl font-display text-white uppercase tracking-wide mb-2 flex items-center gap-3">
          <Settings className="text-blue-500" size={32} />
          Configurações do Sistema
        </h1>
        <p className="text-slate-400">Ajustes globais do aplicativo Entrosa.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#040b1c] border border-blue-900/30 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Database className="text-blue-500" /> Manutenção de Dados
          </h2>
          <p className="text-slate-400 text-sm mb-6">Limpe logs antigos ou otimize tabelas.</p>
          <button disabled className="w-full bg-blue-600/50 cursor-not-allowed text-white py-3 rounded-xl border border-blue-500/30">
            Limpar Puzzles Expirados (Em breve)
          </button>
        </div>

        <div className="bg-[#040b1c] border border-blue-900/30 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="text-blue-500" /> Regras de Jogo
          </h2>
          <p className="text-slate-400 text-sm mb-6">Ajuste de penalidades e pontuações globais.</p>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#0a142c] p-4 rounded-lg border border-blue-900/30">
              <span className="text-slate-300 text-sm">Pontos por Puzzle</span>
              <span className="text-amarelo-gol font-mono">100</span>
            </div>
            <div className="flex justify-between items-center bg-[#0a142c] p-4 rounded-lg border border-blue-900/30">
              <span className="text-slate-300 text-sm">Timer do Draft</span>
              <span className="text-slate-500 font-mono italic">Desativado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
