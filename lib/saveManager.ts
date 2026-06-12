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

const LOCAL_STORAGE_KEY = 'entrosa_active_save';

/**
 * Função de migração segura para o futuro.
 */
export function migrateSaveData(rawData: any): BaseSaveState {
  let data = { ...rawData };
  
  if (!data.version) {
    data.version = 1;
  }
  
  // Future versions migrations will live here:
  // if (data.version === 1) {
  //   data = convertV1toV2(data);
  // }
  
  return data;
}

export const SaveManager = {
  
  /**
   * Salva o estado da liga inteiramente em memória local.
   * Não bate no Supabase, garantindo 0 delay para o simulador.
   */
  saveLocally: (saveData: Partial<EntrosaSave>) => {
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      let existing = {};
      if (existingStr) existing = JSON.parse(existingStr);

      const merged = {
        ...existing,
        ...saveData,
        last_synced_at: new Date().toISOString()
      };
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
    } catch (err) {
      console.warn('Erro ao salvar no LocalStorage:', err);
    }
  },

  /**
   * Carrega o save da memória local
   */
  loadLocally: (): Partial<EntrosaSave> | null => {
    try {
      const dataStr = localStorage.getItem(LOCAL_STORAGE_KEY);
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

  /**
   * Limpa o cache local (ideal após upload para a nuvem em saves finalizados)
   */
  clearLocalSave: () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  },

  /**
   * Event-Driven Sync: Tenta enviar o LocalStorage atual pro Supabase silenciosamente.
   * Se o id não estiver no banco, o upsert cria um novo UUID (se deixarmos o banco cuidar)
   * mas para prevenir duplicidade de id nulo, assumimos que id só é nulo no primeiríssimo insert.
   */
  syncToCloud: async (): Promise<boolean> => {
    try {
      const localData = SaveManager.loadLocally();
      if (!localData) return false;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      // Se id está faltando, a UI deve ter setado um ID provisório ou vamos deixar o supabase gerar
      // Se tivermos um id, faz update.
      const payload: any = { ...localData };
      payload.user_id = session.user.id;
      payload.last_synced_at = new Date().toISOString(); // carimba hora do sync
      
      const { data, error } = await supabase
        .from('saves')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
        
      if (error) {
        console.error('Falha no Sync Cloud:', error);
        return false;
      }

      // Se inseriu um novo save que não tinha ID, salva o UUID gerado no local storage
      if (!localData.id && data?.id) {
        SaveManager.saveLocally({ id: data.id });
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
