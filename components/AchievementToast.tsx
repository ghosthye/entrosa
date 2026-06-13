"use client";

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AchievementDef } from '@/lib/achievements';

export function AchievementToast() {
  const [queue, setQueue] = useState<AchievementDef[]>([]);

  useEffect(() => {
    const handleUnlock = (e: Event) => {
      const customEvent = e as CustomEvent<AchievementDef>;
      if (customEvent.detail) {
        setQueue(prev => [...prev, customEvent.detail]);
      }
    };

    window.addEventListener('achievementUnlocked', handleUnlock);
    return () => window.removeEventListener('achievementUnlocked', handleUnlock);
  }, []);

  // Remove the oldest notification after 5 seconds
  useEffect(() => {
    if (queue.length > 0) {
      const timer = setTimeout(() => {
        setQueue(prev => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [queue]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {queue.map((ach, idx) => {
          const Icon = ach.icon;
          return (
            <motion.div
              key={`${ach.id}-${idx}`}
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`flex items-center gap-4 p-4 rounded-2xl border bg-[#050705]/90 backdrop-blur-md shadow-2xl overflow-hidden relative pointer-events-auto w-[300px] sm:w-[350px] ${ach.borderColor}`}
            >
              {/* Glow background */}
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -z-10 ${ach.bgColor}`}></div>
              
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${ach.bgColor} ${ach.borderColor} ${ach.color}`}>
                <Icon size={24} />
              </div>
              
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Conquista Desbloqueada</span>
                <span className={`font-display text-lg tracking-wide ${ach.color}`}>{ach.name}</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
