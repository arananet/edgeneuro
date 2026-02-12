# Agent2Agent (A2A) Protocol Implementation 🌐

**Compliance:** A2A v1.0 (Linux Foundation)
**Context:** EdgeNeuro Interoperability Layer

## 1. The A2A Envelope
All communication between Cortex and Agents MUST use the standard A2A Envelope.

```json
{
  "protocol": "a2a/1.0",
  "id": "msg_uuid_123",
  "type": "task/handoff",
  "source": "cortex.edgeneuro",
  "target": "agent_hr.internal",
  "trace_id": "trace_abc_789",
  "payload": {
    "task": "resolve_intent",
    "context": {
      "user_query": "I need a holiday",
      "intent_classification": "request_leave",
      "confidence": 0.98
    }
  }
}
```

## 2. Handoff Mechanics (The Redirect)
When Cortex routes a user, it returns a **Connection Instruction** following the A2A Discovery format.

**Response to Client:**
```json
{
  "type": "a2a/connect",
  "target": {
    "id": "agent_hr",
    "endpoint": "wss://hr.internal/a2a/chat",
    "capabilities": ["mcp/tools", "a2a/chat"]
  },
  "auth": {
    "token": "temporary_handoff_token",
    "expiry": 300
  }
}
```

## 3. Headers
- `X-A2A-Version`: `1.0`
- `X-A2A-Trace-Id`: `<uuid>`
- `Content-Type`: `application/a2a+json`
