# Spec 002: Dynamic Agent Registry & Security 🛡️

**Authors:** Eduardo Arana & Soda 🥤
**Status:** Draft

## 1. Overview

Agents must self-register with the Cortex to be discoverable. This replaces static configuration with a dynamic, secure Service Discovery layer backed by Cloudflare KV.

## 2. Security Model

- **Authentication:** All agents MUST provide a `X-Agent-Secret` header matching the `EDGE_NEURO_SECRET` environment variable during registration.
- **Validation:** Capabilities (Intent Domains) are checked against a deny-list.
- **Lifecycle:** Registrations expire (TTL) after 300 seconds. Agents MUST heartbeat every 60-240 seconds.

## 3. API Endpoints

### `POST /v1/agent/register`

**Headers:**

- `X-Agent-Secret`: `sk_live_...`

**Body:**

```json
{
  "id": "agent_legal",
  "name": "Legal Bot",
  "domain": ["contract_review", "nda_check"],
  "connection": { "protocol": "websocket", "url": "wss://legal.internal" }
}
```

**Behavior:**

- Validates Secret.
- Stores in KV: `agent:agent_legal` -> JSON.
- Sets TTL: 300s.

### `GET /v1/agent/list`

**Headers:**

- `X-Admin-Secret`: `sk_live_...`

**Behavior:**

- Returns all active agents from KV.

## 4. Router Impact

The `getSystemPrompt` function MUST fetch the active KV list. If the list is empty, fallback to the hardcoded `AGENT_REGISTRY` (Safe Mode).
