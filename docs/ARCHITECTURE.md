# Architecture

## Overview

EdgeNeuro follows a "Hot Potato" architecture where the router introduces clients to agents and immediately exits. This ensures:
- Zero bottleneck at the router
- Infinite horizontal scaling
- No state management complexity

## Components

```
┌─────────────────────────────────────────────────────────────┐
│                     EdgeNeuro Ecosystem                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   Control   │    │  SynapseCore │    │  Test Agents  │  │
│  │   Plane     │───▶│    Router    │───▶│  (HR, IT)     │  │
│  │  (Pages)    │    │  (Workers)   │    │  (Workers)    │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│         │                   │                   │            │
│         └───────────────────┼───────────────────┘            │
│                             ▼                                │
│                    ┌────────────────┐                         │
│                    │  Knowledge   │                         │
│                    │    Graph    │                         │
│                    │ (Llama-3-8B)  │                         │
│                    └────────────────┘                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Request** → User sends query to SynapseCore
2. **Intent Detection** → Knowledge Graph classifies intent
3. **Agent Selection** → Router selects best matching agent
4. **Handoff** → Returns A2A connect info (no proxy)
5. **Direct Connection** → Client connects directly to agent

## Security

- **Agent Approval**: Agents must be approved via Control Plane before routing
- **CORS**: Enabled for all origins (including Pages deployments)
- **Auth**: Bearer token for agent registration

## Storage

- **KV Namespace**: Agent registry, routing logs
- **Durable Objects**: Synapse state, routing analytics
