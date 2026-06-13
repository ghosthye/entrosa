# CHANGELOG_AI

## 2026-06-12 (Parte 2 - Multiplayer)

### Implementado
- **Draft Multiplayer em Tempo Real:** Criada a arquitetura completa de Salas (`draft_rooms` e `draft_room_players`) utilizando Supabase Realtime para WebSockets. Permite que múltiplos jogadores (Logados e Anônimos) entrem via código curto (Short Code) e realizem picks alternados nas roletas.
- **Auto-Simulação de Liga com Host Delegado:** A Arena agora sincroniza a `competition_state` globalmente via canais. O Host (criador da sala) assume a execução da Engine do Jogo no client-side para evitar custos de servidor, e dispara as atualizações que são consumidas instantaneamente pelos demais jogadores da sala via WebSockets.
- **Modo Offline 1:1 na Arena Online:** Refeita toda a UI do Arena Multiplayer para ser identicamente pixel-perfect ao modo Offline: Barra de carregamento laranja, dropdown de velocidade de simulação turbo, tabelas dinâmicas, renderização de Campo 2D (`Field` component extraído de `team_json`), modal de resumos de fim de temporada, e cards de exportação.
- **Exportação Social:** Integrada a funcionalidade `html2canvas` nas Arenas offline e online permitindo baixar os elencos de forma nativa e estéticamente premium para postagem no WhatsApp / Instagram.

## 2026-06-13 (Parte 3 - Refinamentos e Balanceamento)

### Implementado
- **Modal de Transmissão PvP Ao Vivo:** Refatorada a UI das partidas Ao Vivo no modo Multiplayer. Agora, partidas de humanos são extraídas da aba de "Partidas" e jogadas em uma Fila (`liveMatchQueue`) que engatilha um `<AnimatePresence>` Modal gigantesco em tela cheia com fundo preto desfocado, impedindo que os jogadores percam o momento do gol caso estivessem em outra aba.
- **Resiliência contra o Modo Turbo:** O controle de fluxo na Arena Multiplayer (`processedRound`) garante que mesmo que o Host pule da Rodada 10 para a 38 num piscar de olhos, o cliente enfileire cronologicamente cada duelo humano e passe eles na tela sequencialmente antes de exibir o card de Fim de Temporada.
- **Nerf Global de Overalls (Rebalanceamento):** Introduzido um multiplicador de `0.90` (redução de 10%) direto no núcleo (`lib/overall.ts`). Todos os astros (Ex: Pelé de 99 para 89) e jogadores normais (Ex: de 75 para 67) caíram de produção, tornando o Draft consideravelmente mais difícil de montar "times apelões" (Galácticos), trazendo maior imersão e realismo sem destruir a hierarquia entre os craques.

## 2026-06-12 (Parte 2 - Multiplayer)

### Implementado
- **RBAC no Supabase:** Perfis na tabela `profiles` agora contam com o campo `role` (`user`, `admin`, `super_admin`), protegido por gatilhos PostgreSQL via `SECURITY DEFINER` que impedem "role escalation" por parte do cliente.
- **Painel Administrativo:** Criadas páginas seguras `/admin/users` (gerência de usuários exclusivas para Super Admins) e `/admin/puzzle` (gerência de conteúdo de desafios diários para Admins).
- **Daily Puzzle na Nuvem:** Criada a tabela `daily_puzzles` no Supabase e movido o fluxo lógico do quebra-cabeças para leitura real-time da nuvem, abandonando dependência de arquivos rígidos locais.
- **Cloud Auto-Save (Cross-Device):** Adicionada tabela `saves` no Supabase. O jogo agora utiliza o `lib/saveManager.ts` para capturar a sessão local e enviá-la para a nuvem de modo assíncrono. Permite ao usuário retomar Ligas inacabadas de qualquer dispositivo logado na mesma conta.
- **Feature de Debug (Debug Fill):** Botão injetado na tela do Draft restrito para Admins que preenche automaticamente as 11 vagas com jogadores fantasmas (RNG) para viabilizar testes rápidos do gerador de torneios.

### Alterado
- Lógica de Loading do Auto-Save na `DraftLanding.tsx`: Agora o componente checa ativamente as datas (`last_synced_at`) e importa da nuvem se o save cloud for mais recente que o local.
- Frequência do Sync Automático em `LeagueModal.tsx` e `CopaModal.tsx`: Atualizado para engatilhar um envio à nuvem a cada rodada simulada e não mais apenas em rodadas múltiplas de 5.

### Corrigido
- Falha onde jogadores genéricos (ex: goleiro reserva) herdassem "Overall 99" devido a IDs de colisão (ex: `'ronaldo'`).
- Crash no mobile ao abrir `LeagueModal` através de um Cloud Save (problema resolvido criando initial slots falsos para satisfazer regras de renderização do campinho tático antes de mostrar o painel da liga).
- Bug de comportamento de cache no Next.js (Browser Cache): Adicionado `cache: 'no-store'` e gerador de cache buster `&t=Date.now()` para evitar que o `/api/league/teams` devolvesse a mesma sequência de times sempre que o cache do browser ou servidor intervinha, o que criava um "falso espelhamento" de saves anteriores.
- Bloqueio de Build Vercel: Falha tratada no `supabaseAdmin.ts` quando o `SUPABASE_SERVICE_ROLE_KEY` está nulo no escopo de CI/CD pre-render.
- Bug onde criar Novo Draft sobrescrevia a ID de um save antigo na nuvem por ausência de instrução para limpar `localStorage`.

### Decisões Arquiteturais
- Adotamos uma política "Local First, Cloud Second" para as simulações do torneio. LocalStorage permanece dono do estado ao vivo do jogo para garantir transições a 60fps sem interrupções de Request HTTP, e a sincronização atua apenas como sombra (shadow sync).
