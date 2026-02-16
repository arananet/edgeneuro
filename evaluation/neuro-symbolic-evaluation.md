# Neuro-Symbolic Approach Evaluation for EdgeNeuro

**Date:** 2026-02-15  
**Question:** Can we enhance EdgeNeuro with neuro-symbolic AI instead of pure rule-based routing?

---

## What is Neuro-Symbolic AI?

Combines **neural networks** (pattern recognition, learning) with **symbolic AI** (logic, reasoning, rules).

### The Kahneman Framework
- **System 1** (Neural): Fast, intuitive, pattern recognition
- **System 2** (Symbolic): Slow, deliberate, logical reasoning

Current EdgeNeuro is mostly System 1 (LLM-based intent detection). Neuro-symbolic adds System 2.

---

## Key Approaches (Kautz Taxonomy)

| Approach | Description |适合 EdgeNeuro? |
|----------|-------------|----------------|
| **Symbolic (KG)** | Knowledge Graph for intent taxonomy | ✅ IMPLEMENTED |
| **Neural Validation** | LLM validates/confirms intent (optional) | ✅ IMPLEMENTED |
| **Simple Access** | Role-based category access control | ✅ IMPLEMENTED |

---

## Relevant Frameworks & Libraries

### 1. SynaLinks ⭐⭐⭐
**Graph-Based Programmable Neuro-Symbolic LM Framework**

- Declarative, layer-like composition
- In-context RL optimization
- Constrained JSON outputs
- MCP server support
- **Pros:** Production-ready, clean API, integrates with OpenAI/Ollama/Claude
- **Cons:** Newer, less community

```python
# Example: Composable routing
program = synalinks.Program(
    inputs=inputs,
    outputs=await synalinks.Branch(
        question="Intent classification",
        branches=[hr_router, it_router, sql_router, fallback]
    )
)
```

### 2. Nucleoid ⭐⭐⭐
**Declarative Logic Runtime with Knowledge Graph**

- Statements create relationships in knowledge graph
- Automatic consistency maintenance
- Explainable reasoning
- **Pros:** Built-in logic engine, Python-native
- **Cons:** Less focused on agents

### 3. Neuro-Symbolic Agentic Protocol (Centauri)
**AI Knowledge Representation Language**

- Full Python-based KR specification
- Persistent logical relationships
- Neural → Symbolic translation

### 4. LLM + PDDL Planner (LLM-DP)
**LLM Dynamic Planner**

- Combines LLM with classical planners
- PDDL for task decomposition
- Good for multi-step agent workflows

---

## Implementation Options for EdgeNeuro

### Option A: Hybrid Routing (Recommended)

```
User Query → Neural Intent Detection → Symbolic Validation → Agent Selection
                    ↓                        ↓
              (LLM classifier)      (Rule engine: constraints, security)
```

**Benefits:**
- LLM handles ambiguity, learns from patterns
- Symbolic layer adds safety, constraints, auditability
- Can explain routing decisions

**Components:**
1. **Neural Layer:** Fine-tuned classifier or prompt-based intent detection
2. **Symbolic Layer:** 
   - Intent rules (keyword matching as fallback)
   - Security constraints (no SQL injection routing)
   - Agent capability registry
   - Routing policy rules

### Option B: Knowledge Graph + LLM

```
Query → LLM extracts entities/intent → Knowledge Graph lookup → Reasoning → Agent
```

**Benefits:**
- Explicit agent capabilities as facts
- Queryable routing logic
- Explainable decisions

### Option C: LLM-as-Reasoner with Constraints

```
Query → LLM (system prompt with constraints) → Structured output → Validation → Route
```

**Benefits:**
- Single model approach
- Constraints in prompt
- Structured JSON output

---

## Specific Neuro-Symbolic Enhancements for EdgeNeuro

### 1. Intent Detection
| Current | Neuro-Symbolic |
|---------|----------------|
| LLM-only classification | LLM + symbolic pattern matching |
| Black-box decisions | Explainable intent taxonomy |
| Brittle to edge cases | Rules for known patterns, LLM for novel |

### 2. Agent Selection
| Current | Neuro-Symbolic |
|---------|----------------|
| Hardcoded capability matching | Knowledge graph of capabilities |
| Single agent fallback | Multi-agent orchestration with symbolic coordination |
| No explanation | Traceable routing logic |

### 3. Security
| Current | Neuro-Symbolic |
|---------|----------------|
| Keyword filtering | Formal security policies as symbolic rules |
| Prompt injection risk | Explicit rejection logic |
| No formal guarantees | Audit-able security constraints |

### 4. Learning/Adaptation
| Current | Neuro-Symbolic |
|---------|----------------|
| Manual intent updates | In-context learning from feedback |
| Static agent registry | Dynamic capability learning |
| No feedback loop | Symbolic rules + neural refinement |

---

## Effort Estimation

| Component | Complexity | Time |
|-----------|------------|------|
| Symbolic layer (constraints, validation) | Medium | 1-2 weeks |
| Knowledge graph for agent capabilities | Medium-High | 2-3 weeks |
| Hybrid intent detection (LLM + rules) | High | 3-4 weeks |
| Learning/feedback loop | High | 4-6 weeks |
| Full neuro-symbolic rewrite | Very High | 2-3 months |

---

## Recommendation

**Start with Option A (Hybrid Routing):**

1. **Phase 1:** Add symbolic validation layer to current LLM routing
   - Security constraints
   - Explicit intent taxonomy
   - Fallback rules

2. **Phase 2:** Knowledge graph for agent capabilities
   - Structured agent registry
   - Queryable routing logic

3. **Phase 3:** In-context learning
   - Feedback-driven intent refinement
   - Adaptive confidence thresholds

This gives you neuro-symbolic benefits without a full rewrite.

---

## References

- SynaLinks: https://github.com/SynaLinks/synalinks
- Nucleoid: https://github.com/NucleoidAI/Nucleoid
- Neuro-Symbolic Agentic Protocol: https://github.com/centaurinstitute/neuro-symbolic-agentic-protocol
- Kautz Taxonomy: https://en.wikipedia.org/wiki/Neuro-symbolic_AI
- LLM-DP (LLM + PDDL): https://github.com/itl-ed/llm-dp
