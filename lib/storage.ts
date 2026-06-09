export interface GameState {
  puzzleNumber: number;
  chain: any[];
  filledSlots: Record<string, any>;
  score: number;
  errors: number;
  blockedSlots: string[]; // Set can't be JSON serialized easily
}

export interface UserStats {
  completedPuzzles: number;
  totalScore: number;
  playersUsed: Record<string, number>;
  connectionsUsed: Record<string, number>;
  lastPlayedDate: string; // ISO Date YYYY-MM-DD
  currentStreak: number;
  maxStreak: number;
}

const GAME_STATE_KEY = 'entrosa_game_state';
const USER_STATS_KEY = 'entrosa_user_stats';

export function saveGameState(state: GameState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
}

export function loadGameState(currentPuzzleNumber: number): GameState | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(GAME_STATE_KEY);
  if (!saved) return null;
  
  try {
    const parsed = JSON.parse(saved) as GameState;
    if (parsed.puzzleNumber === currentPuzzleNumber) {
      return parsed;
    }
    // If it's a new puzzle, clear the old state
    localStorage.removeItem(GAME_STATE_KEY);
    return null;
  } catch (e) {
    return null;
  }
}

export function clearGameState() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GAME_STATE_KEY);
}

export function loadUserStats(): UserStats {
  const defaultStats: UserStats = {
    completedPuzzles: 0,
    totalScore: 0,
    playersUsed: {},
    connectionsUsed: {},
    lastPlayedDate: '',
    currentStreak: 0,
    maxStreak: 0,
  };
  
  if (typeof window === 'undefined') return defaultStats;
  const saved = localStorage.getItem(USER_STATS_KEY);
  if (!saved) return defaultStats;
  
  try {
    return { ...defaultStats, ...JSON.parse(saved) };
  } catch (e) {
    return defaultStats;
  }
}

export function updateUserStats(updates: Partial<UserStats> | ((prev: UserStats) => UserStats)) {
  if (typeof window === 'undefined') return;
  const current = loadUserStats();
  const next = typeof updates === 'function' ? updates(current) : { ...current, ...updates };
  localStorage.setItem(USER_STATS_KEY, JSON.stringify(next));
}

export function updateDailyStreak() {
  const today = new Date().toISOString().split('T')[0];
  const stats = loadUserStats();
  
  if (stats.lastPlayedDate === today) return; // Already played today
  
  let newStreak = 1;
  if (stats.lastPlayedDate) {
    const lastDate = new Date(stats.lastPlayedDate);
    const currentDate = new Date(today);
    const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      // Consecutive day!
      newStreak = stats.currentStreak + 1;
    }
  }
  
  updateUserStats({
    lastPlayedDate: today,
    currentStreak: newStreak,
    maxStreak: Math.max(newStreak, stats.maxStreak)
  });
}

export function getTopPlayer(stats: UserStats) {
  if (!stats.playersUsed || Object.keys(stats.playersUsed).length === 0) return null;
  return Object.entries(stats.playersUsed).sort((a, b) => b[1] - a[1])[0];
}

export function getTopConnection(stats: UserStats) {
  if (!stats.connectionsUsed || Object.keys(stats.connectionsUsed).length === 0) return null;
  return Object.entries(stats.connectionsUsed).sort((a, b) => b[1] - a[1])[0];
}
