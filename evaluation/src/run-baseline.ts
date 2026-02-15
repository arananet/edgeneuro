/**
 * Run baseline evaluation
 * 
 * Usage: npm run eval:baseline
 */

import { scenarios } from './scenarios';
import { runEvaluation, analyzeResults, printSummary } from './runner';

async function main() {
  console.log('🧠 EdgeNeuro Baseline Evaluation');
  console.log('='.repeat(50));
  
  const results = await runEvaluation(scenarios);
  const summary = analyzeResults(results);
  printSummary(summary);
  
  // Exit with error code if below minimum thresholds
  if (summary.accuracy < 0.85) {
    console.log('\n❌ FAILED: Accuracy below 85% threshold');
    process.exit(1);
  }
  if (summary.avg_latency_ms > 200) {
    console.log('\n❌ FAILED: Latency above 200ms threshold');
    process.exit(1);
  }
  
  console.log('\n✅ PASSED: Meets minimum viable criteria');
}

main().catch(console.error);
