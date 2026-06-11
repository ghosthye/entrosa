const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Copia o db original para uma versão limpa
const src = path.join(__dirname, '..', 'data', 'brasileirao.db');
const dst = path.join(__dirname, '..', 'data', 'brasileirao_clean.db');

fs.copyFileSync(src, dst);
console.log('Copiado brasileirao.db -> brasileirao_clean.db');

const db = new Database(dst);

// Força consolidar o WAL journal para dentro do arquivo principal
try {
  db.pragma('wal_checkpoint(TRUNCATE)');
} catch(e) {
  console.log('WAL checkpoint skip (pode não estar em WAL mode):', e.message);
}

// Muda para journal mode DELETE (mais simples, sem arquivos extras)
db.pragma('journal_mode = DELETE');
console.log('Journal mode:', db.pragma('journal_mode')[0].journal_mode);

// Verifica integridade
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

const playerCount = db.prepare('SELECT COUNT(*) as c FROM players').get();
console.log('Players:', playerCount.c);

const squadCount = db.prepare('SELECT COUNT(DISTINCT team_id || tournament_id) as c FROM squads').get();
console.log('Distinct squads:', squadCount.c);

// VACUUM para compactar o banco
db.exec('VACUUM');
console.log('VACUUM done');

db.close();

// Substitui o original pela versão limpa
fs.copyFileSync(dst, src);
fs.unlinkSync(dst);
console.log('brasileirao_clean.db -> brasileirao.db (substituído)');

// Remove WAL/SHM files se existirem
const shmPath = src + '-shm';
const walPath = src + '-wal';
if (fs.existsSync(shmPath)) { fs.unlinkSync(shmPath); console.log('Removido .db-shm'); }
if (fs.existsSync(walPath)) { fs.unlinkSync(walPath); console.log('Removido .db-wal'); }

console.log('PRONTO - banco limpo e compactado para deploy no Vercel!');
