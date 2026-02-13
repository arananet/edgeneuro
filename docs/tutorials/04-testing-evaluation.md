# Testing & Evaluation 🧪

This guide proves EdgeNeuro works - not just on paper, but in reality.

## Why Testing Matters

An orchestrator is only as good as its routing accuracy. A 95% accurate router means 1 in 20 users get sent to the wrong agent, leading to:
- Poor user experience
- Security risks (wrong agent sees wrong data)
- Lost trust

## Test Categories

### 1. Unit Tests: Intent Matching

Test that triggers correctly identify agents.

```bash
# Test script
python3 << 'EOF'
import requests
import json

BASE_URL = "https://synapse-core.YOUR_ACCOUNT.workers.dev"

test_cases = [
    {"query": "I need to book vacation", "expected": "agent_hr"},
    {"query": "VPN not working", "expected": "agent_it"},
    {"query": "How many vacation days do I have?", "expected": "agent_hr"},
    {"query": "My laptop won't turn on", "expected": "agent_it"},
    {"query": "Generate a sales report", "expected": "agent_data"},
]

results = []
for tc in test_cases:
    resp = requests.get(f"{BASE_URL}?q={tc['query']}")
    data = resp.json()
    actual = data.get("target", {}).get("id", "none")
    correct = actual == tc["expected"]
    results.append({
        "query": tc["query"],
        "expected": tc["expected"],
        "actual": actual,
        "correct": correct
    })
    print(f"{'✅' if correct else '❌'} {tc['query']} -> {actual}")

accuracy = sum(1 for r in results if r["correct"]) / len(results)
print(f"\n🎯 Accuracy: {accuracy*100:.1f}%")
EOF
```

**Target**: >95% accuracy on known intents

### 2. Latency Tests

Verify <100ms routing time.

```bash
# Test latency
for i in {1..100}; do
  curl -w "%{time_total}\n" -o /dev/null -s \
    "https://synapse-core.YOUR_ACCOUNT.workers.dev?q=test"
done | awk '
  BEGIN { sum=0; n=0 }
  { sum+=$1; n++ }
  END { 
    avg=sum/n*1000
    print "Average latency:", avg "ms"
  }'
```

**Target**: <50ms p50, <100ms p95

### 3. Fallback Tests

What happens when intent is unclear?

```bash
# Test unknown intent
curl "https://synapse-core.YOUR_ACCOUNT.workers.dev?q=xyzabc123"
# Should return agent_fallback or similar
```

**Target**: Always returns a valid agent (never crashes)

### 4. Load Tests

Verify scaling under stress.

```bash
# Using hey or ab
hey -n 1000 -c 10 "https://synapse-core.YOUR_ACCOUNT.workers.dev?q=test"
```

**Target**: No 5xx errors, latency stays <200ms

## A2A Protocol Tests

### 1. Connection Handoff

Verify the handoff token works.

```bash
# Get handoff
RESP=$(curl -s "https://synapse-core.YOUR_ACCOUNT.workers.dev?q=VPN%20issue")
echo $RESP | jq .

# Extract endpoint
ENDPOINT=$(echo $RESP | jq -r '.target.endpoint')

# Try to connect (should get valid response or auth error, not 404)
curl -I "$ENDPOINT"
```

### 2. Session Resumption

Test MCP session handling.

```python
import requests

# First request - get session
r1 = requests.post(
    "https://agent.internal.com/mcp",
    json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {...}
    }
)
session_id = r1.headers.get("mcp-session-id")

# Second request - use session
r2 = requests.post(
    "https://agent.internal.com/mcp",
    headers={"MCP-Session-Id": session_id},
    json={...}
)
```

## Evaluation Metrics

### Routing Accuracy

| Metric | Target | Critical? |
|--------|--------|-----------|
| Top-1 Accuracy | >95% | Yes |
| Top-3 Accuracy | >99% | Yes |
| Fallback Rate | <5% | No |

### Performance

| Metric | Target | Critical? |
|--------|--------|-----------|
| P50 Latency | <50ms | Yes |
| P95 Latency | <100ms | Yes |
| P99 Latency | <200ms | Yes |
| Throughput | >1000 rps | No |

### Reliability

| Metric | Target | Critical? |
|--------|--------|-----------|
| Uptime | 99.9% | Yes |
| Error Rate | <0.1% | Yes |
| Timeout Rate | <0.01% | Yes |

## Continuous Evaluation

Set up automated tests in CI/CD:

```yaml
# .github/workflows/evaluation.yml
name: Evaluation
on: [push, schedule]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run evaluation tests
        run: |
          python3 scripts/evaluate.py \
            --url ${{ secrets.SYNAPSE_URL }} \
            --expected_accuracy 0.95
```

## Debugging Common Issues

### Low Accuracy
- Add more training data
- Refine intent_triggers
- Check for ambiguous queries

### High Latency
- Enable Cloudflare caching
- Reduce model size
- Check cold starts (first request slow)

### 404 on Handoff
- Verify agent URL is correct
- Check agent is registered
- Validate auth tokens
