# Tutorial 01: Deployment

## Prerequisites

- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)
- Git

## Deploy SynapseCore (Router)

```bash
cd edgeneuro/synapse_core
wrangler deploy
```

Note the output URL (e.g., `https://edgeneuro-synapse-core.info-693.workers.dev`)

## Configure Environment

Set the agent secret in `wrangler.toml`:

```toml
[vars]
AGENT_SECRET = "your-secret-here"
```

## Deploy Control Plane

```bash
cd ../controlplane
npm install
npm run deploy
```

## Verify Deployment

1. Visit Control Plane URL
2. Login with demo account (admin/admin123)
3. Check Dashboard for health status
4. Register a test agent in Agents page
