/**
 * Simple test runner - no vitest dependency
 */

import { scenarios } from './scenarios.js';

console.log('🧪 Running scenario tests...\n');

// Test scenarios structure
let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      failed++;
    }
  } catch (e: any) {
    console.log(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

// Test 1: scenarios defined
test('should have scenarios defined', () => scenarios.length > 0);

// Test 2: all required fields (notes is optional, query can be empty string)
test('should have all required fields', () => {
  for (const scenario of scenarios) {
    const hasId = scenario.id !== undefined;
    const hasQuery = scenario.query !== undefined;
    const hasIntent = scenario.expected_intent !== undefined;
    const hasAgent = scenario.expected_agent !== undefined;
    const hasCategory = scenario.category !== undefined;
    const hasDifficulty = scenario.difficulty !== undefined;
    
    if (!hasId || !hasQuery || !hasIntent || !hasAgent || !hasCategory || !hasDifficulty) {
      console.log('Missing field in:', scenario.id);
      return false;
    }
  }
  return true;
});

// Test 3: filter by category
test('should filter by category HR', () => {
  const hrScenarios = scenarios.filter(s => s.category === 'hr');
  return hrScenarios.length > 0;
});

test('should filter by category IT', () => {
  const itScenarios = scenarios.filter(s => s.category === 'it');
  return itScenarios.length > 0;
});

// Test 4: filter by difficulty
test('should filter by difficulty easy', () => {
  const easy = scenarios.filter(s => s.difficulty === 'easy');
  return easy.length > 0;
});

test('should filter by difficulty hard', () => {
  const hard = scenarios.filter(s => s.difficulty === 'hard');
  return hard.length > 0;
});

// Test 5: categories covered
test('should cover hr, it, sql, fallback, ambiguous categories', () => {
  const categories = new Set(scenarios.map(s => s.category));
  return categories.has('hr') && categories.has('it') && 
         categories.has('sql') && categories.has('fallback') && 
         categories.has('ambiguous');
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
console.log(`📈 Total scenarios: ${scenarios.length}`);

if (failed > 0) {
  process.exit(1);
}
