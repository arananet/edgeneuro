# EdgeNeuro POC Setup Script
# Run this after deploying SynapseCore

SYNAPSE_URL="https://synapse-core.YOUR_ACCOUNT.workers.dev"
AGENT_SECRET="YOUR_SECRET"

echo "🔧 Registering mock agents..."

# Register HR Agent
curl -X POST "$SYNAPSE_URL/v1/agent/register" \
  -H "Content-Type: application/json" \
  -H "X-Agent-Secret: $AGENT_SECRET" \
  -d '{
    "id": "agent_hr",
    "name": "HR Assistant",
    "description": "Handles HR queries",
    "connection": {
      "protocol": "http",
      "url": "https://test-agent-hr.your-account.workers.dev",
      "auth_strategy": "bearer"
    },
    "capabilities": ["query_pto", "list_benefits"],
    "intent_triggers": ["vacation", "holiday", "benefits", "sick leave", "pto"]
  }'

# Register IT Agent
curl -X POST "$SYNAPSE_URL/v1/agent/register" \
  -H "Content-Type: application/json" \
  -H "X-Agent-Secret: $AGENT_SECRET" \
  -d '{
    "id": "agent_it",
    "name": "IT Support",
    "description": "Technical support",
    "connection": {
      "protocol": "http",
      "url": "https://test-agent-it.your-account.workers.dev",
      "auth_strategy": "bearer"
    },
    "capabilities": ["reset_password", "vpn_issue"],
    "intent_triggers": ["vpn", "password", "login", "wifi", "computer", "software"]
  }'

echo "✅ Agents registered!"

echo "🧪 Testing routing..."

# Test HR routing
curl -s "$SYNAPSE_URL?q=I%20need%20vacation" | jq .

# Test IT routing
curl -s "$SYNAPSE_URL?q=VPN%20not%20working" | jq .

echo "🎉 POC Setup Complete!"
