# Project Memory

## Resumo do Projeto
O **Entrosa (Goleada App)** é um simulador de futebol web voltado para conhecimento histórico. O jogador monta elencos baseados em roletas (Draft) de times clássicos e simula torneios (Brasileirão e Copa), ou resolve quebra-cabeças diários ("Daily Puzzles"). O foco é em nostalgia, tática e conhecimento futebolístico.

## Stack Utilizada
- **Front-end:** Next.js (App Router), React, Tailwind CSS, Framer Motion, Lucide React.
- **Back-end:** Next.js API Routes (Serverless Functions), Node.js.
- **Banco de Dados / Auth:** Supabase (PostgreSQL, Authentication com Google/OAuth, Row Level Security).
- **Banco Estático (Read-Only):** SQLite local para busca de times/jogadores históricos (para evitar estourar cota do Supabase em queries estáticas pesadas).
- **Hospedagem:** Vercel.

## Principais Funcionalidades
1. **Modo Draft (Copa/Brasileirão):** Sorteio de times via RNG. O jogador escolhe posições e monta um XI ideal para competir em simulações.
2. **Modo Daily Puzzle:** Um quebra-cabeça diário estilo Wordle onde o jogador deve adivinhar o jogador oculto de um elenco histórico com base em dicas.
3. **Admin Panel:** Interface segura exclusiva para `admin` e `super_admin` criarem novos Puzzles diários e gerenciarem os papéis de outros usuários.
4. **Cloud Auto-Save:** O progresso no modo Draft salva de forma síncrona na memória do dispositivo (LocalStorage) e assíncrona na Nuvem (Supabase), permitindo cross-device play ("Continuar Brasileirão" em outro dispositivo).

## Sistemas Existentes
- **LeagueSimulation:** Algoritmo matemático para simular jogos (round-robin), classificar times, atualizar estatísticas (V/E/D, Gols) de forma determinística via OVR (Overall Rating).
- **SaveManager:** Controlador unificado (`lib/saveManager.ts`) que gerencia a serialização do estado (matches, round, elenco) para o `localStorage` e orquestra uploads para o Supabase.
- **useAuth Hook:** Gerencia estado reativo de login, retornando não apenas a sessão mas a `role` oficial puxada da tabela `profiles`.

## Arquitetura Atual
- **Decoplamento de Dados:** Dados imutáveis (elencos de 1980 a 2024, overalls) vivem em Vercel SQLite / JSON statics para leitura veloz e cacheável. Dados mutáveis de usuários vivem no Supabase.
- **Segurança (RLS):** Toda a segurança é orientada pelo Supabase Row Level Security. O Frontend confia cegamente que o backend não deixará ele ler o que não deve.

## Regras de Negócio Importantes
- **Privilégios:** Existem `user`, `admin`, e `super_admin`. O nível de autorização (Role) é fonte da verdade no Supabase (coluna `role` de `profiles`). Apenas Super Admins podem promover outros a Admin. Admins podem gerenciar o jogo, mas não usuários.
- **Sync Local-First:** O simulador do jogo NUNCA trava esperando rede. Ele atualiza o LocalStorage e agenda um fetch "fire and forget" pro Supabase a cada rodada.

## Convenções do Projeto
- **Aesthetics (UI/UX):** O design é premium, utilizando modo escuro, texturas "glassmorphism", sombras de neon e cores vibrantes (`amarelo-gol`, `verde-grama`, azul brilhante).
- Componentes e ícones são extraídos do Lucide React.
- Telas de loading usam animações do Framer Motion e spinners amigáveis.
