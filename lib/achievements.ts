import { Trophy, Flame, Users, Star, LayoutGrid, Medal, Lock } from 'lucide-react';
import { UserStats, loadUserStats } from './storage';
import { SaveManager } from './saveManager';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: any; // Lucide icon component
  color: string;
  bgColor: string;
  borderColor: string;
  condition: (data: { 
    cloudStats?: any; 
    localStats?: UserStats; 
    saves?: any[]; 
  }) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'invicto',
    name: 'Invicto',
    description: 'Vença um torneio Draft.', // Simplified for now since we don't track 0 losses easily
    icon: Trophy,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    condition: ({ saves }) => {
      return Array.isArray(saves) && saves.some(s => s.is_champion);
    }
  },
  {
    id: 'streak_7',
    name: '7 Dias Seq.',
    description: 'Jogue o Puzzle Diário por 7 dias seguidos.',
    icon: Flame,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    condition: ({ cloudStats, localStats }) => {
      const streak = cloudStats?.current_streak || localStats?.currentStreak || 0;
      return streak >= 7;
    }
  },
  {
    id: 'multiplayer_1',
    name: '1ª Sala Multi',
    description: 'Jogue pelo menos uma partida no modo Draft.',
    icon: Users,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    condition: ({ cloudStats, localStats }) => {
      // Mocking for now since we don't have a direct count of multiplayer matches vs offline matches easily accessible
      const matches = cloudStats?.draft_total_matches || 0;
      return matches > 0;
    }
  },
  {
    id: 'ovr_90',
    name: 'OVR 90+',
    description: 'Monte um time com Overall médio igual ou superior a 90.',
    icon: Star,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    condition: ({ cloudStats }) => {
      const highest = cloudStats?.draft_highest_overall || 0;
      return highest >= 90;
    }
  },
  {
    id: 'puzzle_30',
    name: 'Puzzle 30x',
    description: 'Acerte 30 quebra-cabeças.',
    icon: LayoutGrid,
    color: 'text-verde-grama',
    bgColor: 'bg-verde-grama/10',
    borderColor: 'border-verde-grama/30',
    condition: ({ cloudStats, localStats }) => {
      const score = cloudStats?.total_score || localStats?.totalScore || 0;
      const completed = Math.max(0, Math.floor(score / 50));
      return completed >= 30;
    }
  },
  {
    id: 'galactico',
    name: 'Galáctico',
    description: 'Monte um time com Overall médio impressionante de 95+.',
    icon: Star,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    condition: ({ cloudStats }) => {
      const highest = cloudStats?.draft_highest_overall || 0;
      return highest >= 95;
    }
  },
  {
    id: 'hat_trick',
    name: 'Hat Trick',
    description: 'Conquiste 3 títulos de Draft.',
    icon: Trophy,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    condition: ({ cloudStats }) => {
      const titles = cloudStats?.draft_tournaments_won || 0;
      return titles >= 3;
    }
  },
  {
    id: 'top_10',
    name: 'Top 10',
    description: 'Vença 10 torneios do Draft.',
    icon: Medal,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    condition: ({ cloudStats }) => {
      const titles = cloudStats?.draft_tournaments_won || 0;
      return titles >= 10;
    }
  }
];

const LOCAL_STORAGE_KEY = 'entrosa_unlocked_achievements';

/**
 * Puxa a lista de IDs de conquistas que o usuário já destravou no passado.
 */
export function getUnlockedAchievementIds(): string[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
}

/**
 * Avalia de forma silenciosa todas as conquistas em background.
 * Se houver conquistas novas (não mapeadas no cache local), ele:
 * 1. Adiciona no cache.
 * 2. Dispara um CustomEvent para o ToastComponent capturar.
 */
export function evaluateAndNotifyAchievements(data?: { cloudStats?: any; localStats?: UserStats; saves?: any[] }) {
  if (typeof window === 'undefined') return;

  const localStats = data?.localStats || loadUserStats();
  const saves = data?.saves || SaveManager.loadAllLocally();
  const cloudStats = data?.cloudStats; // Could be null locally if not injected, but saves/localStats cover most

  const previouslyUnlocked = getUnlockedAchievementIds();
  const newlyUnlocked: AchievementDef[] = [];

  ACHIEVEMENTS.forEach(ach => {
    // Se ainda não estava destravado...
    if (!previouslyUnlocked.includes(ach.id)) {
      // E agora atende a condição...
      if (ach.condition({ cloudStats, localStats, saves })) {
        newlyUnlocked.push(ach);
        previouslyUnlocked.push(ach.id);
      }
    }
  });

  // Salva o novo estado
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(previouslyUnlocked));

  // Dispara pop-ups para cada conquista nova
  newlyUnlocked.forEach(ach => {
    // Um leve atraso sequencial pode ser feito pelo frontend que escuta, ou aqui.
    // Vamos disparar imediatamente. O Componente vai enfileirar se necessário.
    window.dispatchEvent(new CustomEvent('achievementUnlocked', { detail: ach }));
  });
}
