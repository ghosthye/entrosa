import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { loadUserStats, updateUserStats, getTopPlayer, getTopConnection, getTopClub, getTopNation, getTopTactic } from './storage';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'user' | 'admin' | 'super_admin'>('user');
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
      if (data?.role) setRole(data.role);
    } catch (e) {}
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        signInAnonymously();
      } else {
        syncDataIfNecessary(session.user);
        if (!session.user.is_anonymous) fetchRole(session.user.id);
        setLoading(false);
      }
    });

    // Listen for changes on auth state (log in, log out, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' && session?.user) {
        await syncDataIfNecessary(session.user);
        if (!session.user.is_anonymous) await fetchRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAnonymously = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) console.error('Error signing in anonymously', error);
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.href : undefined
      }
    });
    if (error) console.error('Error with Google Login', error);
  };

  const syncDataIfNecessary = async (currentUser: User) => {
    // Only sync if they are a real user (not anonymous)
    if (currentUser.is_anonymous) return;

    const stats = loadUserStats();
    if (stats.completedPuzzles === 0) return; // Nothing to sync

    // Try to insert their local stats into the profiles table
    // If they already exist, we might just update or ignore. For now, simple upsert.
    const topPlayer = getTopPlayer(stats);
    const topConn = getTopConnection(stats);
    const topClub = getTopClub(stats);
    const topNation = getTopNation(stats);
    const topTactic = getTopTactic(stats);

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: currentUser.id,
        name: currentUser.user_metadata?.full_name || 'Anônimo',
        avatar_url: currentUser.user_metadata?.avatar_url || '',
        total_score: stats.totalScore,
        current_streak: stats.currentStreak,
        highest_streak: stats.maxStreak,
        favorite_player: topPlayer ? topPlayer[0] : null,
        favorite_connection: topConn ? topConn[0] : null,
        favorite_club: topClub ? topClub[0] : null,
        favorite_nation: topNation ? topNation[0] : null,
        favorite_tactic: topTactic ? topTactic[0] : null,
        flawless_puzzles: stats.flawlessPuzzles || 0
      }, { onConflict: 'id' });

    if (!error) {
      localStorage.setItem('entrosa_cloud_sync_time', Date.now().toString());
    } else {
      console.error("Error syncing stats to Supabase:", error);
    }
  };

  return { user, role, loading, signInWithGoogle };
}
