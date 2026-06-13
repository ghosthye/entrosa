# Architecture Notes

Este documento desmistifica o *porquê* e o *como* de cada módulo gigante do projeto. Ele responde por que tomamos decisões que, à primeira vista, podem parecer pouco convencionais, mas que protegem o projeto contra limites de custo e fornecem melhor UX.

## 1. Fonte da Verdade: Supabase (Serverless PostgreSQL)
O Supabase armazena **apenas estados dinâmicos mutáveis**, isto é, dados de evolução de usuários. 
Não guardamos os "Catálogos de Times Históricos" nele! Se cada roleta do draft exigisse ir no banco de dados baixar os elencos de times dos anos 80, o consumo de banda de banco de dados seria violento e lento.

Para evitar isso, mantemos dados imutáveis empacotados num micro-db estático (SQLite lido no Serverless ou JSON) na própria build do Next.js. O Supabase entra em cena estritamente para lidar com: Identidades (Auth), Permissões (RBAC), Ligas Salvas, e Progresso do Daily Puzzle.

## 2. A Ilusão do Tempo Real: LocalStorage vs Cloud Saves
Nossa estratégia de Sincronização do modo Draft é **Local First (Event-Driven Cloud)**.

**Como funciona:**
1. A cada rodada que um usuário joga no Brasileirão, o React emite atualizações numéricas instantâneas. Salvar isso no banco com Latência HTTP quebraria a fluidez da UI.
2. Então nós **sempre** gravamos o Payload total da Liga (State object com todos os confrontos) diretamente no `LocalStorage` do navegador, síncrono e instantâneo.
3. *Em paralelo*, chamamos a instrução silenciosa `SaveManager.syncToCloud()` que envia o Payload no modo "Fire and Forget" para um Upsert no Supabase.

Se o usuário atualizar a página de repente, ou o Vercel perder conexão com o banco, o LocalStorage resgata a renderização. Quando ele reestabelece a rede, um "Cloud Sync" na página de Lobby faz merge do LocalStorage contra o campo de Data de Sincronia (`last_synced_at`) no Supabase. 
> "A UI é sempre servida do LocalStorage, a nuvem atua como sombra."

## 3. Segurança Client-Side e RLS (Row Level Security)
Em vez de focar energia construindo dezenas de Server Actions para "verificar antes de deixar o usuário alterar", a API está praticamente aberta graças ao RLS do PostgreSQL.
O componente client pode, se quiser, invocar livremente o objeto supabase client para `INSERT` ou `UPDATE` nas tabelas `saves` ou `profiles` e ele não conseguirá vazar nada porque as _Policies_ forçam `user_id = auth.uid()` com JWT tokens validados no edge.

## 4. O Sistema de Admin e RBAC
Painéis administrativos (`/admin`) vivem isolados. Usam HOCs (Higher Order Components / Hooks) ou Middleware Next.js para re-validar no servidor se o usuário possui os privilégios certos.
1. O Front-end oculta os botões se `useAuth().role` não for `admin` ou `super_admin`.
2. Para operações massivas e perigosas feitas pela plataforma de Gestão (ex: Deletar Puzzles Antigos, Rebaixar Roles de Moderadores Infratores), nós abdicamos da segurança do JWT Client-Side e injetamos o `SUPABASE_SERVICE_ROLE_KEY` através do pacote `@/lib/supabaseAdmin`. Ele só atua em rotas de API isoladas (`/api/admin/...`).

## 5. Simulações Completamente Matemáticas
A liga e a copa não dependem do servidor para "calcular a próxima partida". As regras esportivas, geradores e matrizes (funções puras do arquivo `leagueSimulation.ts`) rodam **inteiramente no navegador** do cliente. A nuvem não consome CPU processando saldo de gols, apenas armazena a foto do resultado. Isso é essencial para que 10.000 usuários possam jogar a Liga ao mesmo tempo no Vercel sem custo.

## 6. Sincronização Multiplayer em Tempo Real
O Supabase Realtime (WebSockets via Postgres Changes) é empregado para criar os canais de "Salas de Draft" (ex: `draft_rooms`).
A sincronização é inteiramente Event-Driven (orientada a eventos).
- **Lobby:** Listeners aguardam o status `is_ready` dos jogadores mudarem.
- **Drafting:** Um index `current_turn_index` dita quem é a vez. Quando um jogador escolhe uma carta, o cliente dele invoca um UPDATE no Supabase que emite um broadcat para os demais clientes travando as escolhas alheias.
- **Arena:** O Host assume a "Calculadora de Simulação Matemática" listada na etapa 5. Ele roda a simulação da partida localmente no navegador e empurra o Payload pro Supabase, que então replica o Payload finalizado para as telas dos convidados simultaneamente através do canal Realtime. O servidor nunca joga os dados, ele só serve de roteador rápido entre o Host e os Guest Clients.
