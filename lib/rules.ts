export type ConnectionRule = 
  | 'national_team_same_year' 
  | 'opponent_same_match' 
  | 'club_same_year'
  | 'national_team_any_year'
  | 'club_any_year'
  | 'same_cup'
  | 'same_continent'
  | 'same_position'
  | 'same_language';

export type ConnectionType = ConnectionRule;

export interface Connection {
  type: ConnectionType;
  points: number;
  detail: string;
}

export const PRESETS: Record<string, ConnectionRule[]> = {
  'Fácil': [
    'national_team_same_year', 'opponent_same_match', 'club_same_year',
    'national_team_any_year', 'club_any_year', 'same_cup',
    'same_continent', 'same_position', 'same_language'
  ],
  'Médio': [
    'national_team_same_year', 'opponent_same_match', 'club_same_year',
    'national_team_any_year', 'club_any_year', 'same_cup'
  ],
  'Difícil': [
    'national_team_same_year', 'opponent_same_match', 'club_same_year'
  ]
};
