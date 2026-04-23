const fs = require('fs');
const content = fs.readFileSync('src/constants/districtCoords.js', 'utf8');
const lines = content.split('\n');
const states = {};
let currentState = null;

for (const line of lines) {
  const commentMatch = line.match(/^\s*\/\/\s*([a-zA-Z\s&]+)$/);
  if (commentMatch) {
    const potentialState = commentMatch[1].trim();
    if (potentialState !== 'districtCoords.js' && !potentialState.includes('Used for GPS') && !potentialState.includes('Major Indian')) {
      currentState = potentialState;
      if (!states[currentState]) states[currentState] = [];
    }
  } else if (currentState) {
    const districtMatch = line.match(/^\s*"([^"]+)"\s*:/);
    if (districtMatch) {
      states[currentState].push(districtMatch[1]);
    }
  }
}

for (const s in states) {
  if (states[s].length === 0) delete states[s];
}

const out = 'export const STATE_DISTRICTS = ' + JSON.stringify(states, null, 2) + ';\nexport default STATE_DISTRICTS;';
fs.writeFileSync('src/constants/stateDistricts.js', out);
console.log('Done!');
