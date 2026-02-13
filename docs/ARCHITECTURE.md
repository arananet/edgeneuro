# EdgeNeuro Architecture 🧠

**Status:** Approved
**Architect:** Eduardo Arana
**Version:** 1.0

## 1. System Context (C4 Level 1)

EdgeNeuro acts as the intelligent routing layer (middleware) between Enterprise Users and the distributed Agent Mesh.

```mermaid
C4Context
    title System Context Diagram - EdgeNeuro

    Person(user, "Enterprise User", "Employees accessing internal tools via Chat/Voice")

    System_Boundary(edgeneuro, "EdgeNeuro Ecosystem") {
        System(cortex, "Cortex Router", "Classifies intent and hands off connection")
        System(synapse, "Synapse State", "Visualizes traffic and logs routing decisions")
    }

    System_Ext(agent_hr, "HR Agent", "Workday/BambooHR Integ")
    System_Ext(agent_it, "IT Support Agent", "ServiceNow/Jira Integ")
    System_Ext(agent_sql, "Data Agent", "Snowflake Cortex Integ")

    Rel(user, cortex, "1. Sends Query", "HTTPS/WSS")
    Rel(cortex, user, "2. Returns Handoff Token", "JSON")
    Rel(user, agent_hr, "3. Connects Directly", "WSS (MCP)")
    Rel(agent_hr, user, "4. Handoff Back", "Protocol Signal")
```

## 2. Container Architecture (C4 Level 2)

Leveraging Cloudflare's Serverless Edge for <50ms latency.

```mermaid
C4Container
    title Container Diagram - Cloudflare Stack

    Container(worker_cortex, "Cortex Worker", "Cloudflare Worker", "Ephemeral Runtime. Receives request, calls AI, dies.")
    Container(worker_ai, "Workers AI", "Llama-3-8B (Fine-Tuned)", "Inference Engine. Returns Intent JSON.")
    Container(do_synapse, "Synapse DO", "Durable Object", "Stateful Logging & Visualization Stream.")
    Container(kv_registry, "Agent Registry", "Workers KV", "Maps 'agent_hr' -> 'wss://hr.internal'")

    Rel(worker_cortex, worker_ai, "Inference", "Internal Binding")
    Rel(worker_cortex, kv_registry, "Lookup Endpoint", "KV Read")
    Rel(worker_cortex, do_synapse, "Log Decision", "RPC")
```

## 3. The "Hot Potato" Handoff Protocol (Sequence)

This is the core efficiency pattern. The Router does NOT proxy traffic; it introduces and leaves.

```mermaid
sequenceDiagram
    participant U as User (Client)
    participant C as Cortex (Router)
    participant A as Agent (Target)

    Note over U, C: Phase 1: Routing
    U->>C: "I need to fix my VPN"
    activate C
    C->>C: AI Inference (Intent: IT_Support)
    C-->>U: { "status": "handoff", "url": "wss://it-agent", "token": "abc" }
    deactivate C

    Note over U, A: Phase 2: Direct Engagement
    U->>A: Connect(Token)
    activate A
    A-->>U: "Connected. Checking VPN logs..."
    U->>A: "It says Error 503"
    A-->>U: "Ticket INC-999 created."

    Note over U, A: Phase 3: The Recall
    U->>A: "Also, what's the stock price?"
    A->>A: Intent Check (Out of Scope)
    A-->>U: { "signal": "HANDOFF_BACK", "reason": "scope_mismatch" }
    deactivate A

    U->>C: "Also, what's the stock price?"
    activate C
    C-->>U: { "status": "handoff", "url": "wss://finance-agent" }
    deactivate C
```
