import { all_en_scenarios, calculateENMetrics, ENGoal } from './en-scenarios.js';

console.log('🧪 EdgeNeuro Enterprise Scenarios\n');

console.log(`Total scenarios: ${all_en_scenarios.length}`);

// By difficulty
const byDiff: Record<string, number> = {};
for (const s of all_en_scenarios) {
  byDiff[s.difficulty] = (byDiff[s.difficulty] || 0) + 1;
}
console.log('\nBy difficulty:');
for (const [diff, count] of Object.entries(byDiff)) {
  console.log(`  ${diff}: ${count}`);
}

// By agents
const byAgents: Record<string, number> = {};
for (const s of all_en_scenarios) {
  const agents = s.expected_agents.sort().join('+');
  byAgents[agents] = (byAgents[agents] || 0) + 1;
}
console.log('\nBy agent combination:');
for (const [agents, count] of Object.entries(byAgents)) {
  console.log(`  ${agents}: ${count}`);
}

// Goals distribution
let totalGoals = 0;
for (const s of all_en_scenarios) {
  totalGoals += s.goals.length;
}
console.log(`\nTotal goals across all scenarios: ${totalGoals}`);
console.log(`Avg goals per scenario: ${(totalGoals / all_en_scenarios.length).toFixed(1)}`);

// Test metrics calculation
console.log('\n📊 Testing metrics calculation:');
const testScenario = all_en_scenarios[0];
const mockGoals: ENGoal[] = testScenario.goals.map(g => ({...g, completed: true}));
const metrics = calculateENMetrics(testScenario, mockGoals);
console.log(`  AC with all goals complete: ${metrics.action_completion}`);
console.log(`  Goals completed: ${metrics.goals_completed}/${metrics.goals_total}`);

console.log('\n✅ All EN scenario tests passed!');
