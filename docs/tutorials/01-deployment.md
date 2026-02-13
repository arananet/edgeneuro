# EdgeNeuro Deployment Tutorial 🚀

This tutorial walks you through deploying EdgeNeuro from scratch.

## Prerequisites

- Cloudflare account with Workers & AI beta access
- Node.js 18+ 
- Python 3.9+ (for fine-tuning)
- Git

## Step 1: Clone the Repository

```bash
git clone https://github.com/arananet/edgeneuro.git
cd edgeneuro
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Configure Cloudflare

1. Login to Cloudflare:
```bash
npx wrangler login
```

2. Create a KV namespace for the agent registry:
```bash
npx wrangler kv:namespace create AGENT_KV
```

3. Copy the output and add to `synapse_core/wrangler.toml`:
```toml
kv_namespaces = [
  { binding = "AGENT_KV", id = "YOUR_NAMESPACE_ID" }
]
```

4. Add a secret for agent authentication:
```bash
npx wrangler secret put AGENT_SECRET
# Enter a secure random string
```

## Step 4: Deploy SynapseCore (The Router)

```bash
cd synapse_core
npx wrangler deploy
```

Expected output:
```
🌀  Uploading synapse_core v1.0.0
✨  Success! Your worker was deployed!
```

Copy the worker URL (e.g., `https://synapse-core.your-account.workers.dev`).

## Step 5: Verify Deployment

```bash
curl https://synapse-core.YOUR_ACCOUNT.workers.dev
# Expected: "EdgeNeuro SynapseCore Active"
```

## Step 6: Register Your First Agent

Make a POST request to register an agent:

```bash
curl -X POST https://synapse-core.YOUR_ACCOUNT.workers.dev/v1/agent/register \
  -H "Content-Type: application/json" \
  -H "X-Agent-Secret: YOUR_SECRET" \
  -d '{
    "id": "agent_hr",
    "name": "HR Assistant",
    "connection": {
      "protocol": "http",
      "url": "https://hr-service.internal.com/mcp",
      "auth_strategy": "bearer"
    },
    "capabilities": ["query_pto", "list_benefits"],
    "intent_triggers": ["vacation", "holiday", "benefits"]
  }'
```

## Next Steps

- [Fine-tuning the Intent Detection Model](./02-fine-tuning.md)
- [Configuration Guide](./03-configuration.md)
- [Testing & Evaluation](./04-testing-evaluation.md)
