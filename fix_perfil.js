const fs = require('fs');
let content = fs.readFileSync('app/perfil/page.tsx', 'utf8');

// The points fix
content = content.replace(
  "{save.is_champion ? 'Campeão' : save.mode === 'brasileirao' ? `${save.season_goals} pts` : 'Eliminado'}",
  "{save.is_champion ? 'Campeão' : (save.mode === 'brasileirao' || save.mode === 'liga') ? `${save.competition_state?.teams?.find((t) => t.id === 'player')?.stats?.pts || 0} pts` : 'Eliminado'}"
);

// Light mode color fixes
content = content.replace(/bg-\[#0a0f0a\]/g, 'bg-surface');
content = content.replace(/bg-\[#1a231a\]/g, 'bg-surface');
content = content.replace(/bg-\[#050705\]/g, 'bg-surface');
content = content.replace(/bg-white\/\[0\.02\]/g, 'bg-surface hover:bg-black/5 dark:hover:bg-white/5');
content = content.replace(/bg-white\/5/g, 'bg-black/5 dark:bg-white/5');
content = content.replace(/bg-white\/10/g, 'bg-black/10 dark:bg-white/10');
content = content.replace(/border-white\/5/g, 'border-border-color');
content = content.replace(/border-white\/10/g, 'border-border-color');
content = content.replace(/text-white\/20/g, 'text-secondary opacity-50');
content = content.replace(/text-white\/30/g, 'text-secondary opacity-60');
content = content.replace(/text-white\/40/g, 'text-secondary opacity-70');
content = content.replace(/text-white\/50/g, 'text-secondary opacity-80');
content = content.replace(/text-white\/60/g, 'text-secondary opacity-90');
content = content.replace(/text-white\/70/g, 'text-primary');
content = content.replace(/text-white/g, 'text-primary');

// Specific patch for the streak/score text which uses specific colors but were replaced by "text-primary" if they had text-white
// actually we only replaced exact matches or generic ones.

fs.writeFileSync('app/perfil/page.tsx', content);
