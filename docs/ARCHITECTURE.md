# EdgeNeuro Architecture

## Neuro-Symbolic Routing Flow

```
User Query
    │
    ▼
┌─────────────────────────────────────────┐
│  NEURAL LAYER (LLM)                     │
│  - Detect user intent                   │
│  - Extract entities                     │
│  - Natural language understanding       │
│  - Returns: topic, confidence, reason   │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  SYMBOLIC LAYER (Knowledge Graph)       │
│  - Validate access policy               │
│  - Resolve agent from topic             │
│  - Apply role-based restrictions        │
│  - Returns: ALLOW/DENY, agent, reason  │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  RESPONSE                               │
│  - Target agent endpoint                │
│  - Auth headers                         │
│                             │
└──────────────────────────────────────── - Trace ID─┘
```

## Key Principles

1. **Default Deny**: If no path exists in Knowledge Graph, access is DENIED
2. **LLM for Intent**: Neural layer understands what user WANTS
3. **KG for Access**: Symbolic layer decides what user CAN HAVE
4. **Hot Potato**: No state, no caching, each request independent

## Configuration (DB-Permanent)

All config stored in D1:
- `system_config` - model, neuro config
- `intent_rules` - keyword to agent mappings
- `access_rules` - role → topic → access level
- `agents` - registered agents

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /?q=` | Main routing (Neural + Symbolic) |
| `GET /v1/test` | Test routing with debug info |
| `GET /v1/symbolic/route` | Full neuro-symbolic route |
| `GET /v1/symbolic/intent` | Intent detection |
| `POST /v1/symbolic/evaluate` | Access evaluation |
| `GET /v1/symbolic/policy` | View KG policy |
| `GET /v1/config/*` | Get config from DB |
| `POST /v1/config/*` | Save config to DB |
| `GET/POST /v1/rules/*` | Intent/access rules |
