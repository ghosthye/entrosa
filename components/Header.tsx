"use client";

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="w-full max-w-5xl flex justify-between items-center z-20 mb-4 sm:mb-8">
      <Link href="/">
        <img src="/logo.png" alt="ENTROSA" className="h-16 md:h-28 w-auto drop-shadow-md hover:scale-105 transition-transform cursor-pointer" />
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
  );
}
