import { getDb } from './db';

interface PlayerStats {
  matches: number;
  tournaments: number;
}

const statsCache = new Map<string, PlayerStats>();

const LEGEND_OVERRIDES: Record<string, number> = {
  'P-38906': 99, // Pelé
  'P-80404': 99, // Maradona
  'P-62722': 99, // Ronaldo (Fenômeno)
  'P-56430': 98, // Zidane
  'P-50564': 98, // Cruyff
  'P-72864': 98, // Beckenbauer
  'P-46080': 97, // Garrincha
  'P-61251': 97, // Romário
  'P-57361': 97, // Ronaldinho
  'P-74261': 96, // Rivaldo
  'P-08939': 96, // Platini
  'P-37483': 96, // Zico
};

const BRASILEIRAO_LEGENDS: Record<string, number> = {
  // Grandes Lendas Clássicas
  'pel': 99,
  'romrio': 98,
  'zico': 98,
  'ronaldinhogacho': 98,
  'neymar': 97,
  'rogrioceni': 96,
  'marcos': 95,
  'garrincha': 98,
  'edmundo': 96,
  'alex': 95,
  'dadmaravilha': 94,
  'giorgiandearrascaeta': 94,
  'robertocarlos': 97,
  'rivaldo': 96,
  'did': 96,
  'cssio': 94,
  'socrates': 95,
  'rivelino': 96,
  'falco': 95,
  'zetti': 93,
  'taffarel': 94,
  'dida': 94,
  'marcelinhocarioca': 94,
  'djalminha': 93,
  'evair': 93,
  'edmundosouza': 96,
  'edlson': 92,
  'diegotardelli': 92,
  'phganso': 92,
  'dejanpetkovic': 94,
  'adriano': 95,
  'gabrielbarbosa': 93,
  'brunohenrique': 92,
  'fred': 93,
  'daroconca': 92,
  'deco': 94,
  'juninhopernambucano': 95,
  'luan': 94, 
  'tliomaravilha': 93, 
  'carlinhosbala': 89, 
  'durval': 90, 
  'thiagoneves': 92, 
  'washington': 91, 
  'alexmineiro': 90, 
  'klberson': 92, 
  'bob': 90, 
  'falcogracia': 95, 
  'diegosouza': 91, 
  'ded': 91, 
  'adozinho': 90, 
  'magro': 90,
  'ricardinho': 92,
  'jnior': 95,
  'leandro': 94,
  'adlio': 92,
  'nunes': 91,
  'vertonribeiro': 93,
  'rodrigocaio': 90,
  'pablomar': 90,
  'ra': 95,
  'velloso': 91,
  'joaqunpiquerez': 89,
  'odvan': 90,
  'maurogalvo': 92,
  'juninhopaulista': 93,
  'vampeta': 92,
  'paologuerrero': 93,
  'emersonsheik': 92,
  'leandrocastn': 90,
  'marceloramos': 91,
  'fbio': 94,
  'thiagosilva': 95,
  'rafaelsbis': 91,
  'wilsongottardo': 90,

  // Grêmio 1983
  'renatogacho': 94,
  'deleln': 93,
  'mazarpi': 92,
  'tita': 92,
  'mriosrgio': 92,
  'china': 90,
  'pauloroberto': 90,
  'baidek': 89,
  'casemiro': 89,
  'osvaldo': 90,
  'tarciso': 91,
  
  // Fortaleza 2023
  'lucero': 90,
  'tinga': 90,
  'caioalexandre': 89,
  'pochettino': 89,
  'marinho': 90,
  'joricardo': 89,
  'brtez': 89,
  'titi': 88,
  'brunopacheco': 88,
  'zewelison': 88,
  'guilherme': 88,
  
  // Bahia 2001
  'robgol': 91,
  'nonato': 91,
  'pretocasagrande': 90,
  'srgiomanoel': 91,
  'emerson': 89,
  'denlson': 88,
  'jean': 89,
  'valdomiro': 88,
  'daniel': 88,
  'bebetocampos': 88,
  'alexoliveira': 89,
  
  // Santos 1963
  'coutinho': 95,
  'pepe': 94,
  'zito': 94,
  'gilmar': 94,
  'mauro': 93,
  'calvet': 92,
  'ismael': 91,
  'geraldino': 90,
  'menglvio': 92,
  'dorval': 92,

  // Cruzeiro 2013
  'ricardogoulart': 92,
  'dagoberto': 91,
  'borges': 90,
  'willian': 89,
  'nilton': 89,
  'lucassilva': 88,
  'egdio': 88,
  'mayke': 88,
  
  // Atlético-MG 2021
  'hulk': 94,
  'nachofernndez': 93,
  'guilhermearana': 92,
  'matiazaracho': 91,
  'verson': 91,
  'jrashonso': 91,
  'natanana': 90,
  'allan': 89,
  'jair': 89,
  'mariano': 89,
  'eduardosasha': 88,

  // Novas lendas e titulares importantes adicionados para alinhar os elencos
  // Flamengo 2019
  'gerson': 91,
  'filipelus': 91,
  'rafinha': 90,
  'diegoalves': 90,
  'willianaro': 88,
  'diego': 93,
  
  // São Paulo 1992
  'muller': 94,
  'cafu': 96,
  'toninhocerezo': 94,
  'palhinha': 92,
  'pintado': 89,
  'vlber': 91,
  
  // São Paulo 2005
  'lugano': 92,
  'mineiro': 92,
  'josu': 91,
  'amoroso': 93,
  'alosiochulapa': 90,
  
  // Palmeiras 1999
  'paulonunes': 92,
  'csarsampaio': 93,
  'jniorbaiano': 91,
  'chiquiarce': 93,
  
  // Palmeiras 2021
  'gustavogmez': 93,
  'weverton': 92,
  'raphaelveiga': 92,
  'dudu': 93,
  'rony': 89,
  'felipemelo': 90,
  
  // Vasco 1998/2000
  'pedrinho': 92,
  'carlosgermano': 92,
  'felipe': 91,
  
  // Vasco 2011
  'derlus': 89,
  'fernandoprass': 91,
  
  // Santos 2002
  'robinho': 94,
  'elano': 92,
  'renato': 91,
  'fbiocosta': 91,
  'lo': 92,
  'andrlus': 90,
  'pauloalmeida': 89,
  
  // Santos 2010/2011
  'rafaelcabral': 90,
  'edudracena': 91,
  'arouca': 91,
  
  // Corinthians 1999
  'freddyrincn': 94,
  'amaral': 92,
  'sylvinho': 91,
  'luizo': 93,
  'ewerthon': 91,
  'carlosgamarra': 92,
  'cris': 92,
  
  // Corinthians 2012
  'paulinho': 93,
  'ralf': 92,
  'jorgehenrique': 89,
  'chico': 91,
  'fbiosantos': 90,
  
  // Cruzeiro 2003
  'vctoraristizbal': 93,
  'deivid': 91,
  'mota': 90,
  'zinho': 92,
  'claudiomaldonado': 91,
  'gomes': 92,
  
  // Cruzeiro 2014
  'marcelomoreno': 91,
  'willianbigode': 90,
  
  // Atlético-MG 2013
  'bernard': 91,
  'dod': 92,
  'pierre': 90,
  'leandrodonizete': 89,
  'victor': 93,
  'rver': 91,
  'leonardosilva': 91,
  'marcosrocha': 91,
  
  // Internacional 1979
  'batista': 91,
  
  // Internacional 2006
  'fernando': 94, // Fernandão
  'iarley': 92,
  'ndio': 91,
  'clemer': 91,
  'bolvar': 90,
  'cear': 90,
  'fabianoeller': 91,
  'alexandrepato': 90,
  'jorgewagner': 91,
  'luizadriano': 88,
  
  // Grêmio 1995
  'danrlei': 93,
  'jardel': 94,
  'mriojardel': 94, // Alias Jardel
  'dinho': 91,
  'luscarlosgoiano': 90,
  
  // Grêmio 2017
  'arthurmelo': 92,
  'marcelogrohe': 93,
  'pedrogeromel': 93,
  'wlterkannemann': 92,
  'evertoncebolinha': 91,
  'pedrorocha': 89,

  // Novas Lendas Mega Expansão
  'faustinoasprilla': 92,
  'osas': 89,
  'euller': 91,
  'viola': 91,
  'ramn': 91,
  'neto': 92,
  'tupzinho': 89,
  'wellingtonnem': 89, // Fluminense 2012

  'fernandinho': 90,
  'maicon': 91,
  'ramiro': 89,
  'brunocortez': 89,
  
  // Fluminense 2008
  
  // Fluminense 2012
  'diegocavalieri': 93,
  'gum': 90,
  'leandroeuzbio': 89,
  'carlinhos': 90,
  
  // Sport 2008
  'romerito': 91,
  
  // Botafogo 1995
  'donizete': 92,
  'gonalves': 91,
  'wagner': 91,
  
  // Athletico-PR 2001
  'klberpereira': 91,
  'cocito': 89,
  
  // São Caetano 2002
  'silvioluiz': 91,
  'dininho': 90,
  'somlia': 90,
  'analson': 90,
  'marcossenna': 92,
  
  // Bahia 1988
  'charles': 92,
  'zcarlos': 90
};

export function getPlayerOverall(playerId: string, league: 'worldcup' | 'brasileirao' = 'worldcup'): number {
  const cacheKey = `${league}_${playerId}`;
  if (!statsCache.has(cacheKey)) {
    const db = getDb(league);
    
    if (league === 'brasileirao') {
       statsCache.set(cacheKey, { matches: 0, tournaments: 1 });
    } else {
      const row = db.prepare(`
      SELECT 
        COUNT(DISTINCT a.match_id) as matches,
        COUNT(DISTINCT s.tournament_id) as tournaments
      FROM players p
      LEFT JOIN appearances a ON p.player_id = a.player_id
      LEFT JOIN squads s ON p.player_id = s.player_id
      WHERE p.player_id = ?
      GROUP BY p.player_id
    `).get(playerId) as { matches: number, tournaments: number } | undefined;

      if (row) {
        statsCache.set(cacheKey, row);
      } else {
        statsCache.set(cacheKey, { matches: 0, tournaments: 0 });
      }
    }
  }

  const stats = statsCache.get(cacheKey)!;
  
  if (league === 'worldcup' && LEGEND_OVERRIDES[playerId]) {
    return LEGEND_OVERRIDES[playerId];
  }
  
  if (league === 'brasileirao') {
    const slug = playerId.replace('INJ_', '');
    if (BRASILEIRAO_LEGENDS[slug]) {
      return Math.floor(BRASILEIRAO_LEGENDS[slug] * 0.90);
    }
    
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
      hash = (playerId.charCodeAt(i) + ((hash << 5) - hash)) | 0; // Force 32-bit int
    }
    const rng = Math.abs(hash) / 2147483648; // Strictly 0 to <1
    let overall = Math.floor(65 + rng * 16); // 65 to 80
    return Math.floor(overall * 0.90);
  }
  
  // Fórmula original
  let overall = 65 + (stats.matches * 1.2) + (stats.tournaments * 2);
  
  if (overall > 99) overall = 99;
  
  if (league === 'brasileirao') {
    return Math.floor(overall * 0.90);
  }
  
  return Math.floor(overall);
}
