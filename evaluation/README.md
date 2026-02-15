# EdgeNeuro Evaluation Framework

**Status: IN PROGRESS** - Neuro-symbolic engine implemented

**Honest assessment: Is this project real or just "smoke on paper"?**

---

## What We Need to Test

### 1. Intent Detection Accuracy
- Can SynapseCore correctly classify user intents?
- What happens with ambiguous queries?
- False positive/negative rates

### 2. Routing Performance
- Latency under load
- Cold start times
- Throughput limits

### 3. Agent Handoff Reliability
- Does the handoff protocol actually work?
- Connection stability
- Fallback on agent failure

### 4. Multi-Agent Orchestration
- Can multiple agents collaborate?
- Context preservation across handoffs
- Error propagation

### 5. Edge Cases & Failure Modes
- What breaks under edge conditions?
- Graceful degradation
- Security boundaries

---

## Neuro-Symbolic Implementation ✅

**Status:** IMPLEMENTED in `synapse_core/src/symbolic-engine.ts`

### What Was Added

1. **Symbolic Engine** (`src/symbolic-engine.ts`)
   - Default Deny access policy
   - Topic aliases resolution
   - Role-based access control
   - Full audit trail

2. **API Endpoints** (in `synapse_core/src/index.ts`)
   - `GET /v1/symbolic/policy` - Get access policy
   - `POST /v1/symbolic/evaluate` - Evaluate single access
   - `GET /v1/symbolic/route` - Full neuro-symbolic routing

3. **Database Schema** (`synapse_core/schema.sql`)
   - Roles, Topics, Permissions tables
   - Routing Rules for advanced conditions
   - Access Logs for audit

### Architecture

```
User Query → [NEURAL: LLM Intent Detection] → [SYMBOLIC: Policy Evaluation] → Decision
                     ↓                                    ↓
              "PAYROLL"                    { role: "MARKETING" } → DENY 🚫
                                                            ↓
                                                    Return alternatives
```

### Principle: Default Deny

If no explicit permission exists → DENIED. This is more secure than "allow by default" because:
- LLM errors = blocked (not opened)
- Predictable, auditable decisions
- No ambiguity

---

## Candidate Evaluation Libraries

| Library | Pros | Cons |
|---------|------|------|
| **Agent Leaderboard v2** (Galileo) | Synthetic scenarios, multi-turn, AC/TSQ metrics | Enterprise-focused, may need adaptation |
| **Giskard** | Auto-scan for hallucination, bias, security | More RAG-focused |
| **DeepEval** | Pytest-style, easy to write custom tests | Generic LLM, not agent-native |
| **Agentune** | KPI tuning, simulation | Less active |

---

## Evaluation Strategy

### Phase 1: Baseline Metrics
- [ ] Set up test agents (HR, IT, SQL)
- [ ] Create synthetic test dataset (100+ scenarios)
- [ ] Measure intent detection accuracy
- [ ] Measure end-to-end latency

### Phase 2: Stress Testing
- [ ] Concurrent request handling
- [ ] Agent failure injection
- [ ] Network latency simulation
- [ ] Context window limits

### Phase 3: Comparative Analysis
- [ ] Compare against simple rule-based routing
- [ ] Compare against other orchestrators
- [ ] Cost per request analysis

---

## Success Criteria

| Metric | Target | Minimum Viable |
|--------|--------|----------------|
| Intent Accuracy | >95% | >85% |
| Latency (p95) | <100ms | <200ms |
| Handoff Success | >99% | >95% |
| Cost per Request | <$0.001 | <$0.005 |

---

## Questions to Answer Honestly

1. Is intent detection actually better than keyword matching?
2. Does the handoff protocol add value over direct agent access?
3. Is the cost justified vs. simpler architectures?
4. Does it scale as promised?
5. What's the real failure rate?

---

---

## Current Setup

```
evaluation/
├── src/
│   ├── scenarios.ts      # 23 test scenarios (HR, IT, SQL, fallback, ambiguous, edge cases)
│   ├── runner.ts        # Router evaluation runner
│   ├── test.ts         # Basic scenario validation tests
│   └── test-simple.ts  # Quick sanity check
├── package.json
├── vitest.config.ts
└── README.md
```

### Agent Leaderboard v2 Integration

We've integrated the **Agent Leaderboard v2** methodology:

**Metrics implemented:**
- **Action Completion (AC)**: Did the agent fully accomplish every user goal?
- **Tool Selection Quality (TSQ)**: Did the agent pick the right tools with correct params?

**Files:**
- `src/agent-leaderboard.ts` - ALB v2 metric calculations
- `src/en-scenarios.ts` - EdgeNeuro-specific enterprise scenarios (multi-turn, multi-goal)

**Reference:**
- Blog: https://galileo.ai/blog/agent-leaderboard-v2
- Dataset: https://huggingface.co/datasets/galileo-ai/agent-leaderboard-v2

### Run Tests

```bash
# Validate scenario definitions
npx tsx src/test.ts

# Run baseline evaluation (requires router running)
npx tsx src/run-baseline.ts
```

### Scenarios Coverage

| Category | Count | Description |
|----------|-------|-------------|
| HR | 5 | Vacation, PTO, benefits, payroll, data updates |
| IT | 5 | VPN, password, hardware, access, bug reports |
| SQL | 2 | Data queries |
| Fallback | 4 | Out of scope, security tests |
| Ambiguous | 3 | Unclear intent |
| Edge | 4 | SQL injection, empty query, overflow, prompt injection |

**Total: 23 scenarios**

### Enterprise Scenarios (Agent Leaderboard v2 style)

**Total: 10 scenarios** with 39 goals (avg 3.9 per scenario)

| ID | Title | Difficulty | Agents | Goals |
|----|-------|------------|--------|-------|
| en-001 | New Employee Onboarding | easy | IT+HR | 4 |
| en-002 | Complex Troubleshooting | hard | IT+SQL+HR | 3 |
| en-003 | Data Analysis Request | medium | SQL | 3 |
| en-004 | Security Incident Response | hard | IT | 4 |
| en-005 | Performance Review Prep | medium | SQL+HR | 4 |
| en-006 | Contractor Onboarding | easy | IT+HR | 3 |
| en-007 | Server Outage Emergency | hard | IT+SQL | 5 |
| en-008 | Quarterly Business Review | hard | SQL+HR | 5 |
| en-009 | Leave Request Complex | medium | HR+IT | 4 |
| en-010 | Hardware Failure | medium | IT | 4 |

---

---

### Neuro-Symbolic Evaluation

Created `neuro-symbolic-evaluation.md` analyzing how to enhance EdgeNeuro with neuro-symbolic approaches.

**Key findings:**
- Three frameworks stand out: SynaLinks, Nucleoid, Neuro-Symbolic Agentic Protocol
- Recommended: Hybrid routing (LLM + symbolic validation)
- Option A: Neural intent detection + Symbolic constraint validation
- Option B: Knowledge graph for agent capabilities
- Option C: LLM-as-reasoner with explicit constraints

**Effort:** 1-6 months depending on scope

*Last updated: 2026-02-15*
