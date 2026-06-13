# Roadmap de Desenvolvimento

Bem-vindo ao mapa do futuro do **Entrosa**. Estas são as metas organizadas por prazo de execução para manter a visão do app clara para futuros colaboradores e agentes artificiais.

## Curto Prazo (Próximos Passos)
- [ ] **Rankings e Tabela de Líderes Global:** Integrar a coluna `total_score` da tabela `profiles` em uma página pública para os usuários disputarem o Top 100 de solucionadores de Daily Puzzles e campeões de Draft.
- [ ] **Sistema de Conquistas (Achievements):** Distribuir insígnias (ex: "Invicto na Copa", "Acertou puzzle de primeira 10x seguidas").
- [x] **Compartilhamento em Redes Sociais:** Gerar imagens do elenco de Draft via HTML Canvas para um belo layout compartilhável via Twitter/WhatsApp.

## Médio Prazo (Escalabilidade & Features Core)
- [x] **Modos de Jogo Multipayer Simultâneos:** Permitir que 2 usuários rodem uma liga juntos, gerando um "código de sala" onde cada rodada avança simultaneamente no navegador de ambos via Supabase Realtime (WebSockets).
- [ ] **Novos Universos de Draft:** Adicionar Liga dos Campeões e Premier League (expandindo o DB SQLite de times).
- [ ] **Engine de Substituições:** Adicionar banco de reservas real no Draft, permitindo troca de jogadores machucados ou cansados entre rodadas.

## Longo Prazo (Visão de Platô)
- [ ] **App Nativo Móvel:** Migrar o Next.js Web para React Native utilizando expo, integrando o mesmo backend no Supabase.
- [ ] **Monetização Sustentável:** Remoção de anúncios invasivos e aposta em pacotes cosméticos ou "Passes de Temporada" retro-futebol para alterar estágios do layout.
- [ ] **Integração de IA para Dicas:** Nos puzzles diários, usar LLMs para oferecer "pistas dinâmicas" que não estraguem o jogo diretamente baseando-se nas falhas anteriores do jogador em achar o jogador certo.
