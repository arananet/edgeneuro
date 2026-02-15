const scenarios = [
  { id: 'hr-001', query: 'test', expected_intent: 'test', expected_agent: 'hr', category: 'hr', difficulty: 'easy', notes: 'test' }
];

console.log('Test 1:', scenarios.length > 0);

// Check fields
let allHaveFields = true;
for (const s of scenarios) {
  if (!s.id || !s.query || !s.expected_intent || !s.expected_agent || !s.category || !s.difficulty) {
    allHaveFields = false;
  }
}
console.log('Test 2:', allHaveFields);
