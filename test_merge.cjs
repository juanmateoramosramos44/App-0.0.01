const { HISTORICAL_ROUNDS } = require('./src/data/historicalRounds');
const baseList = []; // Simulate empty local storage
const deletedIds = new Set();
const incomingList = HISTORICAL_ROUNDS;

// Dummy mergeRoundLists logic
const map = new Map();
for (const rawR of (baseList || [])) { map.set(rawR.id, rawR); }
for (const rawR of (incomingList || [])) { map.set(rawR.id, rawR); }

console.log('Final length:', map.size);
console.log('HISTORICAL_ROUNDS length:', HISTORICAL_ROUNDS.length);
