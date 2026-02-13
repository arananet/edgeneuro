# Configuration Guide ⚙️

This guide covers configuring EdgeNeuro for your enterprise.

## Agent Configuration

Agents are defined in JSON and loaded into the KV store.

### Example: HR Agent

```json
{
  "id": "agent_hr",
  "name": "HR Assistant",
  "description": "Handles HR queries",
  "connection": {
    "protocol": "streamable-http",
    "url": "https://hr.internal.company.com/mcp",
    "auth_strategy": "bearer"
  },
  "mcp": {
    "url": "https://hr.internal.company.com/mcp",
    "auth": {
      "type": "bearer",
      "token": "{{HR_API_KEY}}"
    }
  },
  "capabilities": ["query_pto", "list_benefits", "policy_lookup"],
  "intent_triggers": ["vacation", "holiday", "benefits", "payroll", "sick leave"]
}
```

### Intent Triggers

The `intent_triggers` array is critical for routing. Best practices:

1. **Use varied keywords**: Include synonyms and common phrases
2. **Add negative triggers**: Help distinguish from similar agents
3. **Test thoroughly**: See [Testing Guide](./04-testing-evaluation.md)

```json
// Good example
"intent_triggers": [
  "vacation", "holiday", "pto", "time off", "leave request",
  "sick", "sick leave", "medical", "doctor"
]

// Avoid
"intent_triggers": ["help"]
```

## Authentication Strategies

EdgeNeuro supports multiple auth methods:

### Bearer Token (Recommended)
```json
"connection": {
  "protocol": "streamable-http",
  "url": "https://agent.internal.com/mcp",
  "auth_strategy": "bearer"
}
```

### API Key
```json
"connection": {
  "protocol": "streamable-http", 
  "url": "https://agent.internal.com/mcp",
  "auth_strategy": "api_key"
}
```

### mTLS (Advanced)
For highest security, use mutual TLS with client certificates.

## Environment Variables

Configure in `synapse_core/wrangler.toml`:

```toml
[vars]
ENVIRONMENT = "production"
DEFAULT_AGENT = "agent_helpdesk"

[secrets]
AGENT_SECRET = # Run: npx wrangler secret put AGENT_SECRET
```

## MCP Configuration

Each agent can have an optional MCP configuration for direct tool access:

```json
"mcp": {
  "url": "https://service.internal.com/mcp",
  "auth": {
    "type": "bearer",
    "token": "{{API_TOKEN}}"
  }
}
```

## Loading Configuration

### Option 1: Manual Registration (API)
```bash
curl -X POST https://synapse-core.workers.dev/v1/agent/register \
  -H "Content-Type: application/json" \
  -H "X-Agent-Secret: $AGENT_SECRET" \
  -d @config/agents.json
```

### Option 2: Bulk Import
Use the `MCPConfigurator` in your code:

```typescript
import { MCPConfigurator } from './mcp';

const configurator = new MCPConfigurator();
configurator.loadFromJSON(agentConfigs);
```

## Best Practices

1. **Use KV for dynamic updates** - No redeployment needed
2. **Version your configs** - Store in git
3. **Separate dev/prod** - Different KV namespaces
4. **Monitor intent matching** - See what's failing

## Next Steps

- [Testing & Evaluation](./04-testing-evaluation.md)
