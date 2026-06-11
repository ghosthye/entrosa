const axios = require('axios');
const cheerio = require('cheerio');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'brasileirao.db');
// Removed unlinkSync to avoid EBUSY from Next.js server

const db = new Database(dbPath);
db.exec('DELETE FROM squads; DELETE FROM players; DELETE FROM teams; DELETE FROM tournaments;');

// Create Schema
db.exec(`
CREATE TABLE IF NOT EXISTS players (
  player_id TEXT PRIMARY KEY,
  family_name TEXT,
  given_name TEXT,
  birth_date TEXT,
  wikipedia_link TEXT,
  face_url TEXT
);
CREATE TABLE IF NOT EXISTS teams (
  team_id TEXT PRIMARY KEY,
  team_name TEXT,
  team_code TEXT,
  region_name TEXT
);
CREATE TABLE IF NOT EXISTS tournaments (
  tournament_id TEXT PRIMARY KEY,
  tournament_name TEXT,
  year INTEGER,
  host_country TEXT
);
CREATE TABLE IF NOT EXISTS squads (
  tournament_id TEXT,
  team_id TEXT,
  player_id TEXT,
  position_name TEXT,
  position_code TEXT,
  shirt_number INTEGER
);
CREATE TABLE IF NOT EXISTS player_clubs (
  player_id TEXT,
  tournament_id TEXT,
  club_name TEXT
);
CREATE TABLE IF NOT EXISTS connections (
  player_a_id TEXT,
  player_b_id TEXT,
  connection_type TEXT,
  tournament_id TEXT,
  detail TEXT,
  points INTEGER
);
`);

const targetSquads = [
  { team_slug: 'flamengo', year: 1981, team_name: 'Flamengo 1981', team_id: 'FLA' },
  { team_slug: 'flamengo', year: 2009, team_name: 'Flamengo 2009', team_id: 'FLA' },
  { team_slug: 'flamengo', year: 2019, team_name: 'Flamengo 2019', team_id: 'FLA' },
  { team_slug: 'sao-paulo', year: 1992, team_name: 'São Paulo 1992', team_id: 'SAO' },
  { team_slug: 'sao-paulo', year: 2005, team_name: 'São Paulo 2005', team_id: 'SAO' },
  { team_slug: 'palmeiras', year: 1999, team_name: 'Palmeiras 1999', team_id: 'PAL' },
  { team_slug: 'palmeiras', year: 2021, team_name: 'Palmeiras 2021', team_id: 'PAL' },
  { team_slug: 'vasco', year: 1998, team_name: 'Vasco 1998', team_id: 'VAS' },
  { team_slug: 'vasco', year: 2000, team_name: 'Vasco 2000', team_id: 'VAS' },
  { team_slug: 'vasco', year: 2011, team_name: 'Vasco 2011', team_id: 'VAS' },
  { team_slug: 'santos', year: 2002, team_name: 'Santos 2002', team_id: 'SAN' },
  { team_slug: 'santos', year: 2010, team_name: 'Santos 2010', team_id: 'SAN' },
  { team_slug: 'santos', year: 2011, team_name: 'Santos 2011', team_id: 'SAN' },
  { team_slug: 'corinthians', year: 1999, team_name: 'Corinthians 1999', team_id: 'COR' },
  { team_slug: 'corinthians', year: 2012, team_name: 'Corinthians 2012', team_id: 'COR' },
  { team_slug: 'cruzeiro', year: 1997, team_name: 'Cruzeiro 1997', team_id: 'CRU' },
  { team_slug: 'cruzeiro', year: 2003, team_name: 'Cruzeiro 2003', team_id: 'CRU' },
  { team_slug: 'cruzeiro', year: 2014, team_name: 'Cruzeiro 2014', team_id: 'CRU' },
  { team_slug: 'atletico-mineiro', year: 1971, team_name: 'Atlético-MG 1971', team_id: 'CAM' },
  { team_slug: 'atletico-mineiro', year: 2013, team_name: 'Atlético-MG 2013', team_id: 'CAM' },
  { team_slug: 'internacional', year: 1979, team_name: 'Internacional 1979', team_id: 'INT' },
  { team_slug: 'internacional', year: 2006, team_name: 'Internacional 2006', team_id: 'INT' },
  { team_slug: 'gremio', year: 1995, team_name: 'Grêmio 1995', team_id: 'GRE' },
  { team_slug: 'gremio', year: 2017, team_name: 'Grêmio 2017', team_id: 'GRE' },
  { team_slug: 'fluminense', year: 2008, team_name: 'Fluminense 2008', team_id: 'FLU' },
  { team_slug: 'fluminense', year: 2012, team_name: 'Fluminense 2012', team_id: 'FLU' },
  { team_slug: 'sport-recife', year: 2008, team_name: 'Sport 2008', team_id: 'SPO' },
  { team_slug: 'botafogo', year: 1995, team_name: 'Botafogo 1995', team_id: 'BOT' },
  { team_slug: 'athletico-paranaense', year: 2001, team_name: 'Athletico-PR 2001', team_id: 'CAP' },
  { team_slug: 'ad-sao-caetano', year: 2002, team_name: 'São Caetano 2002', team_id: 'SCA' },
  { team_slug: 'ec-bahia', year: 1988, team_name: 'Bahia 1988', team_id: 'BAH' }
];

const insertTeam = db.prepare('INSERT OR IGNORE INTO teams (team_id, team_name, team_code, region_name) VALUES (?, ?, ?, ?)');
const insertPlayer = db.prepare('INSERT OR IGNORE INTO players (player_id, family_name, given_name) VALUES (?, ?, ?)');
const insertSquad = db.prepare('INSERT OR IGNORE INTO squads (tournament_id, team_id, player_id, position_code, position_name, shirt_number) VALUES (?, ?, ?, ?, ?, ?)');
const insertConnection = db.prepare('INSERT OR IGNORE INTO connections (player_a_id, player_b_id, connection_type, tournament_id, detail, points) VALUES (?, ?, ?, ?, ?, ?)');

const delay = ms => new Promise(res => setTimeout(res, ms));

async function scrapeSquad(squadInfo) {
  const epoca_id = (squadInfo.year - 1971) + 100;
  const url = `https://www.ogol.com.br/equipe/${squadInfo.team_slug}?epoca_id=${epoca_id}`;

  console.log(`Fetching ${squadInfo.team_name} from ${url}`);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const playersFoundObj = [];
    const seenNames = new Set();
    
    $('.section').each((i, sectionEl) => {
      const sectionText = $(sectionEl).text().trim();
      let positionCode = '⭐';
      if (sectionText === 'Goleiro') positionCode = 'GOL';
      else if (sectionText === 'Defensor') positionCode = 'ZAG';
      else if (sectionText === 'Meia') positionCode = 'MC';
      else if (sectionText === 'Atacante') positionCode = 'ATA';
      else if (sectionText === 'Ala') positionCode = 'MC';
      else if (sectionText === 'Treinador') return; // ignore coach
      
      let sibling = $(sectionEl).next();
      while (sibling.length && !sibling.hasClass('section')) {
        if (sibling.hasClass('staff_line') || sibling.hasClass('staff')) {
          sibling.find('.name a[href*="/jogador/"]').each((j, el) => {
            const name = $(el).text().trim();
            if (name && name.length > 2 && !seenNames.has(name)) {
              seenNames.add(name);
              playersFoundObj.push({ name, positionCode, sectionText });
            }
          });
        }
        sibling = sibling.next();
      }
    });

    console.log(`-> Found ${playersFoundObj.length} unique players.`);

    const tournamentId = `BR_${squadInfo.year}`;

    const insertAll = db.transaction((playersObj) => {
      insertTeam.run(squadInfo.team_id, squadInfo.team_name, squadInfo.team_slug, 'Brazil');

      for (let i = 0; i < playersObj.length; i++) {
        const pObj = playersObj[i];
        const pA = pObj.name;
        const pId = pA.toLowerCase().replace(/[^a-z0-9]/g, '');

        insertPlayer.run(pId, pA, pA);
        insertSquad.run(tournamentId, squadInfo.team_id, pId, pObj.positionCode, pObj.sectionText, null);

        for (let j = i + 1; j < playersObj.length; j++) {
          const pB = playersObj[j].name;
          const pIdB = pB.toLowerCase().replace(/[^a-z0-9]/g, '');

          insertConnection.run(pId, pIdB, 'Teammates', tournamentId, squadInfo.team_name, 100);
          insertConnection.run(pIdB, pId, 'Teammates', tournamentId, squadInfo.team_name, 100);
        }
      }
    });

    insertAll(playersFoundObj);

  } catch (err) {
    console.error(`Error scraping ${squadInfo.team_name}: ${err.message}`);
  }
}

async function run() {
  if (!fs.existsSync(path.join(__dirname, '..', 'scripts'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'scripts'));
  }
  for (const sq of targetSquads) {
    await scrapeSquad(sq);
    await delay(1500); // polite delay
  }

  const countPlayers = db.prepare('SELECT COUNT(*) as count FROM players').get();
  console.log(`\\nDONE! Generated brasileirao.db with ${countPlayers.count} players.`);
  db.close();
}

run();
