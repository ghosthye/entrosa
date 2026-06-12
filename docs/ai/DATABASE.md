# Supabase Database Documentation

Este arquivo mapeia toda a arquitetura de dados (Tabelas, RLS e Policies) hospedada na plataforma do Supabase para o Entrosa.

## Tabelas

### `profiles`
Contém as informações espelhadas do sistema de Autenticação (`auth.users`) aliadas às métricas públicas dos jogadores e privilégios.
- `id` (uuid, FK para auth.users.id) - Chave primária.
- `name` (text) - Nome de display público do usuário.
- `email` (text) - Email do usuário.
- `avatar_url` (text) - Link para foto de perfil.
- `role` (text) - Define a permissão. Pode ser `user`, `admin` ou `super_admin`. Padrão é `user`.
- `total_score` (numeric) - Soma de todos os pontos adquiridos em desafios.
- `updated_at` (timestamp) - Controle de última alteração.

**Políticas RLS:** 
- Leitura: Público (`SELECT`).
- Escrita: O próprio usuário pode atualizar o próprio perfil (`UPDATE` restrito). Porém, um gatilho de segurança impede edição da própria `role`. Modificações de `role` só podem ser feitas via RPC/Service Key, ou por usuários com `role = 'super_admin'`.

### `daily_puzzles`
Armazena a chave e os metadados dos quebra-cabeças que atualizam diariamente.
- `id` (uuid) - Chave Primária.
- `target_player_id` (text) - ID estrito do jogador que é a "resposta" do dia (ex: `romario`, `ronaldinhogaucho`).
- `date` (date) - Data em que este desafio estará ativo.
- `config` (jsonb) - Estrutura de dicas, modo, clube alvo (ex: time titular, ano, dificuldade).
- `difficulty` (text) - 'Fácil', 'Médio', 'Difícil'.
- `target_name` (text) - Nome legível do jogador resposta (Apenas pra referências em painel).
- `created_at` (timestamp)

**Políticas RLS:**
- Leitura: Público (`SELECT`).
- Escrita: Restrito a `admin` e `super_admin`.

### `user_puzzles`
Responsável por persistir o progresso/vitórias de usuários específicos em desafios diários para evitar que eles ganhem pontos duas vezes e gerir rankings.
- `id` (uuid) - PK.
- `user_id` (uuid, FK para auth.users.id).
- `puzzle_id` (uuid, FK para daily_puzzles.id).
- `completed` (boolean) - Define se o jogador adivinhou a charada.
- `attempts` (integer) - Quantas tentativas o jogador demorou.
- `start_time` (timestamp) - Hora que ele começou a jogar.
- `end_time` (timestamp) - Hora que ele acertou (usado para tier-breakers em rankings de velocidade).

**Políticas RLS:**
- Leitura: Usuários só leem suas próprias linhas (`user_id = auth.uid()`).
- Escrita/Atualização: Usuários só mexem nas próprias linhas.

### `saves`
Guarda os famosos "Cloud Saves" do Draft/Liga em andamento (O sistema "Cross-Device").
- `id` (uuid) - Chave primária.
- `user_id` (uuid, FK para auth.users.id) - Dono do save.
- `save_name` (text) - Título (opcional para o usuário).
- `mode` (text) - 'brasileirao' ou 'worldcup'.
- `status` (text) - 'in_progress', 'finished' ou 'archived'.
- `custom_team_name` (text) - Nome batizado no Lobby.
- `team_overall` (integer) - OVR médio da equipe baseada nos 11 sorteados.
- `nodes_2d` (jsonb) - Guarda as coordenadas X e Y dos jogadores na formação tática do campo, junto com imagens e posições.
- `competition_state` (jsonb) - A Tabela completa do torneio! (Lista de 20 times, Array de centenas de confrontos com placares, pontuações atuais V/E/D, mapa de artilheiros e a rodada exata onde o jogador parou).
- `final_position`, `is_champion`, `season_goals`, `season_conceded` - Métricas para tela de fim de jogo.
- `last_synced_at` (timestamp) - Timestamp crítico. Se o LocalStorage for mais velho que isso, ele puxa esse dado para o LocalStorage. Se for o contrário, ele envia.

**Políticas RLS:**
- Leitura: Somente o dono (`auth.uid() = user_id`).
- Inserção/Atualização: Restrito ao dono (`auth.uid() = user_id`).

## Triggers & Functions (Gatilhos)

### `on_auth_user_created`
Quando alguém se loga pela primeira vez e cria uma conta no Google/Auth Supabase, este Trigger injeta automaticamente uma linha na tabela `profiles` com `role = 'user'`, garantindo integridade e presença no leaderboard.

### `check_role_escalation`
Um gatilho embutido como `SECURITY DEFINER` que escuta qualquer `UPDATE` feito na tabela `profiles`. Ele examina se `NEW.role != OLD.role`. Se a resposta for verdadeira e o usuário fazendo a alteração NÃO for um super admin autenticado através da UI (ou de um Server Client protegido), ele rejeita o `UPDATE`.
Isso cimenta e blinda o projeto contra acessos hackers client-side.
