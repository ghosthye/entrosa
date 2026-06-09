const axios = require('axios');
const cheerio = require('cheerio');

async function run() {
  const response = await axios.get('https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  const $ = cheerio.load(response.data);

  let totalFound = 0;
  const headings = $('.mw-heading3');
  
  headings.each((i, wrapper) => {
    let teamName = $(wrapper).find('h3').text().trim();
    if (!teamName) teamName = $(wrapper).text().trim();
    teamName = teamName.replace(/\s*\[.*\]/g, '').replace(/\s*\(.*\)/g, '').trim();
    
    if (!teamName || teamName.length > 25 || teamName.includes('Group') || teamName.includes('References')) return;
    
    const table = $(wrapper).nextAll('table.sortable').first();
    if (!table.length) return;

    let count = 0;
    table.find('tbody tr').each((j, row) => {
      const tds = $(row).find('td, th');
      if (tds.length < 5) return;
      
      const nameAnchor = $(tds[2]).find('a').last();
      let playerName = nameAnchor.text().trim();
      if (!playerName) {
        playerName = $(tds[2]).text().replace(/\s*\[.*\]/g, '').replace(/\(c\)/g, '').trim();
      }
      
      if (!playerName || playerName === 'Player') return;
      count++;
      totalFound++;
    });
    
    if (count !== 26) {
      console.log(`⚠️ ${teamName} has ${count} players! (Expected 26)`);
    }
  });
  console.log(`Total players found on Wikipedia: ${totalFound}`);
}

run().catch(console.error);
