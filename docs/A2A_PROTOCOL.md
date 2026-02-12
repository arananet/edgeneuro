# Agent-to-Agent (A2A) Protocol Spec

**Version:** 1.0 (Draft)
**Context:** EdgeNeuro Orchestration

## Overview
EdgeNeuro uses a decentralized "Handoff" protocol. Agents are autonomous but must adhere to strict signaling to return control to the User or Router.

## 1. The Handoff Object (Router -> Client)
When Cortex decides on a route, it returns this JSON to the Client.

```json
{
  "type": "handoff",
  "target_agent": "agent_it_support",
  "connection": {
    "protocol": "websocket",
    "url": "wss://agents.internal/it-support/v1/chat",
    "auth_token": "eyJhbGciOiJIUzI1Ni..."
  },
  "context": {
    "intent": "technical_support",
    "confidence": 0.98,
    "original_query": "My VPN is broken"
  },
  "expiry": 300
}
```

## 2. The Recall Signal (Agent -> Client)
When an agent completes a task or detects a query outside its domain, it MUST send this signal to the client.

**Scenario A: Task Complete (Session End)**
```json
{
  "type": "session_end",
  "reason": "completed",
  "message": "Ticket created. Is there anything else?"
}
```
*Client Action:* Remain connected, wait for user input. If user input is new intent, reconnect to Cortex.

**Scenario B: Out of Scope (Immediate Handoff)**
```json
{
  "type": "handoff_back",
  "reason": "out_of_scope",
  "trigger_utterance": "What is the stock price?",
  "suggested_intent": "market_data" 
}
```
*Client Action:* IMMEDIATELY disconnect from Agent and POST the `trigger_utterance` to Cortex.

## 3. MCP Compatibility
Agents SHOULD expose their capabilities via Model Context Protocol (MCP) headers during the handshake.

**Header:** `X-MCP-Capabilities: ["tools/call", "resources/read"]`
