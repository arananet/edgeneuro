import { describe, it, expect } from 'vitest';
import { scenarios, getScenariosByCategory, getEasyScenarios, getHardScenarios } from './scenarios';

describe('Scenarios', () => {
  it('should have scenarios defined', () => {
    expect(scenarios.length).toBeGreaterThan(0);
  });
  
  it('should filter by category', () => {
    const hrScenarios = getScenariosByCategory('hr');
    expect(hrScenarios.length).toBeGreaterThan(0);
    expect(hrScenarios.every(s => s.category === 'hr')).toBe(true);
  });
  
  it('should filter by difficulty', () => {
    const easy = getEasyScenarios();
    const hard = getHardScenarios();
    expect(easy.length).toBeGreaterThan(0);
    expect(hard.length).toBeGreaterThan(0);
  });
  
  it('should have all required fields', () => {
    for (const scenario of scenarios) {
      expect(scenario.id).toBeDefined();
      expect(scenario.query).toBeDefined();
      expect(scenario.expected_intent).toBeDefined();
      expect(scenario.expected_agent).toBeDefined();
      expect(scenario.category).toBeDefined();
      expect(scenario.difficulty).toBeDefined();
    }
  });
});
