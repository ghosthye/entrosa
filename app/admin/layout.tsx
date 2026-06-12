"use client";

import { useAuth } from '@/lib/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, Users, Trophy, Settings, LogOut, LayoutDashboard, Puzzle } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user || user.is_anonymous) {
        router.replace('/');
      } else {
        supabase.from('profiles').select('role').eq('id', user.id).single()
          .then(({ data }) => {
            if (data && (data.role === 'admin' || data.role === 'super_admin')) {
              setIsAuthorized(true);
            } else {
              router.replace('/');
            }
            setChecking(false);
          });
      }
    }
  }, [user, loading, router]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-[#020617] text-blue-500 flex flex-col items-center justify-center">
        <Shield size={48} className="animate-pulse mb-4" />
        <span className="font-mono tracking-widest uppercase">Autenticando Módulo de Comando...</span>
      </div>
    );
  }

  if (!isAuthorized) return null;

  const navItems = [
    { name: 'Visão Geral', href: '/admin', icon: LayoutDashboard },
    { name: 'Jogadores', href: '/admin/users', icon: Users },
    { name: 'Saves Ativos', href: '/admin/saves', icon: Trophy },
    { name: 'Daily Puzzle', href: '/admin/puzzle', icon: Puzzle },
    { name: 'Configurações', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#020617] text-slate-300 font-sans">
      {/* Sidebar Fixo */}
      <aside className="w-64 border-r border-blue-900/30 bg-[#040b1c] flex flex-col">
        <div className="p-6 border-b border-blue-900/30 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="font-display text-xl text-white tracking-wide uppercase">Entrosa</h1>
            <span className="text-xs text-blue-400 font-mono tracking-widest">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                    : 'hover:bg-blue-900/20 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-900/30">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0a142c] rounded-xl border border-blue-900/30">
            <img src={user?.user_metadata?.avatar_url || ''} alt="Avatar" className="w-8 h-8 rounded-full border border-blue-500/50" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.user_metadata?.full_name}</p>
              <p className="text-xs text-blue-400 truncate">Super Admin</p>
            </div>
            <button onClick={() => router.push('/')} className="text-slate-500 hover:text-red-400 transition-colors" title="Voltar ao Jogo">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Área Central - Conteúdo da Página */}
      <main className="flex-1 overflow-auto bg-[#020617]">
        {children}
      </main>
    </div>
  );
}
