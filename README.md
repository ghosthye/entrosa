<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/swords.svg" width="80" height="80" alt="Logo Entrosa" />
  <h1 align="center">ENTROSA ⚽️</h1>
  <p align="center">
    O simulador definitivo de times históricos, química entre jogadores e torneios acirrados.
    <br />
    <a href="https://entrosa.vercel.app"><strong>Jogue agora »</strong></a>
  </p>

  <p align="center">
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-Auth_&_DB-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" /></a>
  </p>
</div>

<hr />

## 📖 Sobre o Projeto

**Entrosa** é uma plataforma que mistura conhecimento de futebol histórico, mecânicas de *Draft* (Sorteio) de cartas e simulação tática. Como um treinador, sua missão é combinar craques de Seleções Históricas (ex: *Brasil de 2002*, *Espanha de 2010*), lidar com a sorte nos dados e tentar conquistar a taça no Brasileirão ou na Copa do Mundo.

## ✨ Modos de Jogo e Funcionalidades

- 🎲 **Draft Histórico (Brasileirão & Copa):** Escolha uma formação tática e rode o dado. Você será obrigado a escolher um jogador da seleção sorteada para montar seu time, prestando atenção no entrosamento (país em comum) e posição de ofício!
- 🧩 **Daily Puzzle (Quebra-Cabeça Diário):** Todo dia à meia-noite, um novo jogador é escolhido como "ponto de partida" e uma nova formação tática é liberada. Tente fechar o campo usando apenas links perfeitos (jogadores que jogaram no mesmo time ou dividem nacionalidade)!
- ⚔️ **Duelos x1 (Real-time):** Gere um link e mande para seu amigo. Vocês montarão um draft lado a lado e o simulador vai calcular quem tem o esquadrão mais poderoso em uma batalha frenética!
- 💾 **Cross-Save (Local & Nuvem):** Pare de jogar no celular enquanto vai para o trabalho e continue de onde parou no computador. Tudo salvo usando localStorage aliado a sincronização na nuvem.
- 👑 **Painel Administrativo:** Controle de estatísticas dos jogadores, logs de atividades recentes em tempo real, monitoramento de torneios ativos e agendamento dos Puzzles Diários.

## 🛠️ Tecnologias Utilizadas

- **Front-end:** React, Next.js 15 (App Router), TailwindCSS, Lucide Icons.
- **Back-end/Banco de Dados:** SQLite (base offline local pesada de milhares de jogadores da EA FC) + Supabase PostgreSQL (autenticação, multiplayer, progresso na nuvem, RLS e Triggers).
- **Hospedagem & CI/CD:** Vercel.
- **Segurança:** Autenticação via Email/Senha com Row Level Security (RLS) impenetrável no banco de dados.

## 🚀 Como Rodar Localmente

Se você quiser clonar e rodar o Entrosa na sua máquina:

1. **Clone o repositório**
   ```bash
   git clone https://github.com/ghosthye/entrosa.git
   cd entrosa
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente**
   Crie um arquivo `.env.local` na raiz do projeto contendo as chaves do seu banco Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_key_anon_aqui
   SUPABASE_SERVICE_ROLE_KEY=sua_role_key_aqui
   ```

4. **Inicie o Servidor**
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

## 🧠 Arquitetura: Híbrido Cloud-Local

Uma das coisas mais legais do Entrosa é sua arquitetura. Para evitar custos absurdos de leitura na nuvem (já que os drafts leem tabelas de jogadores milhares de vezes por partida), a **base de dados bruta de jogadores e times fica toda emulada em um banco SQLite embarcado diretamente no Node do servidor Next.js**, garantindo latência zero na busca.
Já o **progresso, saves, multiplayer, usuários e tabelas de ranking ficam armazenados remotamente no Supabase**, de forma leve e barata.

---
Feito com muito código, ódio de bugs e paixão por futebol. ⚽️💻
