import { supabase } from '@/lib/supabase';
import { FormationNode } from '@/components/Field';

export type SaveStatus = 'in_progress' | 'finished' | 'archived';

export interface BaseSaveState {
  version: number;
  // Payload genérico de competição (Brasileirão ou Copa)
  currentRound: number;
  totalRounds: number;
  teams: any[];
  matches: any[];
  scorersMap: Record<string, any>;
  [key: string]: any;
}

export interface EntrosaSave {
  id: string; // Gerado pelo Supabase (UUID)
  user_id: string;
  save_name: string;
  mode: 'brasileirao' | 'worldcup';
  status: SaveStatus;
  custom_team_name: string;
  team_overall: number;
  nodes_2d: FormationNode[][];
  competition_state: BaseSaveState;
  final_position?: number;
  is_champion?: boolean;
  season_goals?: number;
  season_conceded?: number;
  last_synced_at: string;
  created_at: string;
}

const getLocalKey = (mode: string) => `entrosa_active_save_${mode}`;

/**
 * Função de migração segura para o futuro.
 */
export function migrateSaveData(rawData: any): BaseSaveState {
  let data = { ...rawData };
  
  if (!data.version) {
    data.version = 1;
  }
  
  return data;
}

export const SaveManager = {
  
  saveLocally: (saveData: Partial<EntrosaSave>) => {
    try {
      const mode = saveData.mode || 'brasileirao';
      const key = getLocalKey(mode);
      const existingStr = localStorage.getItem(key);
      let existing = {};
      if (existingStr) existing = JSON.parse(existingStr);

      const merged = {
        ...existing,
        ...saveData,
        last_synced_at: new Date().toISOString()
      };
      
      localStorage.setItem(key, JSON.stringify(merged));
    } catch (err) {
      console.warn('Erro ao salvar no LocalStorage:', err);
    }
  },

  loadAllLocally: (): Partial<EntrosaSave>[] => {
    // Migration from old key to mode-specific key
    const oldStr = localStorage.getItem('entrosa_active_save');
    if (oldStr) {
      try {
        const oldData = JSON.parse(oldStr);
        const mode = oldData.mode || 'brasileirao';
        localStorage.setItem(getLocalKey(mode), oldStr);
        localStorage.removeItem('entrosa_active_save');
      } catch(e) {}
    }

    const modes = ['brasileirao', 'worldcup'];
    const saves: Partial<EntrosaSave>[] = [];
    for (const mode of modes) {
      try {
         const str = localStorage.getItem(getLocalKey(mode));
         if (str) {
           const data = JSON.parse(str);
           if (data.competition_state) {
             data.competition_state = migrateSaveData(data.competition_state);
           }
           saves.push(data);
         }
      } catch(e) {}
    }
    return saves;
  },

  loadLocally: (mode?: string): Partial<EntrosaSave> | null => {
    if (!mode) return SaveManager.loadAllLocally()[0] || null;
    try {
      const dataStr = localStorage.getItem(getLocalKey(mode));
      if (!dataStr) return null;
      
      const data = JSON.parse(dataStr);
      if (data.competition_state) {
        data.competition_state = migrateSaveData(data.competition_state);
      }
      return data;
    } catch {
      return null;
    }
  },

  clearLocalSave: (mode?: string) => {
    if (mode) {
      localStorage.removeItem(getLocalKey(mode));
    } else {
      localStorage.removeItem(getLocalKey('brasileirao'));
      localStorage.removeItem(getLocalKey('worldcup'));
      localStorage.removeItem('entrosa_active_save'); // limpar resquícios
    }
  },

  syncToCloud: async (mode?: string): Promise<boolean> => {
    try {
      const localSaves = SaveManager.loadAllLocally();
      const localData = mode ? localSaves.find(s => s.mode === mode) : localSaves[0];
      if (!localData) return false;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const payload: any = { ...localData };
      payload.user_id = session.user.id;
      payload.last_synced_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('saves')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
        
      if (error) {
        console.error('Falha no Sync Cloud:', error);
        return false;
      }

      if (!localData.id && data?.id) {
        SaveManager.saveLocally({ id: data.id, mode: localData.mode });
      }

      return true;
    } catch (e) {
      console.error('Erro de Sync Cloud catch:', e);
      return false;
    }
  },

  /**
   * Ao abrir o site em outro aparelho, puxa todos os saves do Supabase para comparar e listar.
   */
  fetchCloudSaves: async (userId: string): Promise<EntrosaSave[]> => {
    const { data, error } = await supabase
      .from('saves')
      .select('*')
      .eq('user_id', userId)
      .order('last_synced_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar saves da nuvem:', error);
      return [];
    }

    // Aplica a migration routine para cada save vindo do banco
    return data.map(save => ({
      ...save,
      competition_state: migrateSaveData(save.competition_state)
    })) as EntrosaSave[];
  }
};
