# CHANGELOG_AI

## 2026-06-12

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
