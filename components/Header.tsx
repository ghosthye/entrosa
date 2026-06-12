"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Moon, Sun, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth(); // This initializes the auth session on load
  const pathname = usePathname();
  const isHub = pathname === '/';

  useEffect(() => setMounted(true), []);

  return (
    <div className="w-full max-w-5xl flex justify-between items-center z-20 mb-4 sm:mb-8">
      <Link href="/">
        <img src="/logo.png" alt="ENTROSA" className="h-16 md:h-28 w-auto drop-shadow-md hover:scale-105 transition-transform cursor-pointer" />
      </Link>
      <div className="flex items-center gap-2 sm:gap-3">
        {user && !user.is_anonymous && (
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <span className="text-sm font-bold text-cinza-borda">{user.user_metadata?.full_name?.split(' ')[0]}</span>
            {user.user_metadata?.avatar_url && (
              <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border border-border-color shadow-sm" />
            )}
          </div>
        )}
        {pathname === '/links' && (
          <Link href="/regras">
            <button
              className="p-2.5 bg-surface hover:bg-surface/80 border border-border-color rounded-full transition-colors shadow-sm flex items-center justify-center"
              title="Manual do Técnico (Regras - Entrosa)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary hover:text-primary"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </button>
          </Link>
        )}
        {pathname === '/draft' && (
          <Link href="/regras-draft">
            <button
              className="p-2.5 bg-surface hover:bg-surface/80 border border-border-color rounded-full transition-colors shadow-sm flex items-center justify-center"
              title="Manual do Técnico (Regras - Draft)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary hover:text-primary"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </button>
          </Link>
        )}
        {pathname === '/links' && (
          <Link href="/ranking">
            <button
              className="p-2.5 bg-surface hover:bg-surface/80 border border-border-color rounded-full transition-colors shadow-sm flex items-center justify-center"
              title="Hall da Fama (Ranking)"
            >
              <Trophy className="w-5 h-5 text-secondary hover:text-amarelo-gol" />
            </button>
          </Link>
        )}
        {(role === 'admin' || role === 'super_admin') && (
          <Link href="/admin">
            <button
              className="p-2.5 bg-blue-900/50 hover:bg-blue-600/50 border border-blue-500/50 rounded-full transition-colors shadow-[0_0_10px_rgba(37,99,235,0.3)] flex items-center justify-center"
              title="Painel Administrativo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 hover:text-white"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </button>
          </Link>
        )}
        <Link href="/perfil">
          <button
            className="p-2.5 bg-surface hover:bg-surface/80 border border-border-color rounded-full transition-colors shadow-sm flex items-center justify-center"
            title="Meu Perfil"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary hover:text-primary"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
          </button>
        </Link>
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2.5 bg-surface hover:bg-surface/80 border border-border-color rounded-full transition-colors shadow-sm"
            title="Alternar Tema"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-secondary hover:text-primary" /> : <Moon className="w-5 h-5 text-secondary hover:text-primary" />}
          </button>
        )}
      </div>
    </div>
  );
}
