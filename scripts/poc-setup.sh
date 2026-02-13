#!/bin/bash
# EdgeNeuro POC Setup Script
# Run this after deploying SynapseCore

SYNAPSE_URL="https://edgeneuro-synapse-core.info-693.workers.dev"
AGENT_SECRET="potato123"

echo "🔧 Registering mock agents..."

# Register HR Agent (approved=true for immediate routing)
curl -X POST "$SYNAPSE_URL/v1/agent/register" \
  -H "Content-Type: application/json" \
  -H "X-Agent-Secret: $AGENT_SECRET" \
  -d '{
    "id": "agent_hr",
    "name": "HR Assistant",
    "description": "Handles HR queries",
    "connection": {
      "protocol": "http",
      "url": "https://test-hr-agent.info-693.workers.dev",
      "auth_strategy": "bearer"
    },
    "capabilities": ["query_pto", "list_benefits"],
    "intent_triggers": ["vacation", "holiday", "benefits", "sick leave", "pto"],
    "approved": true
  }'

echo "✅ HR Agent registered"

# Register IT Agent (approved=true for immediate routing)
curl -X POST "$SYNAPSE_URL/v1/agent/register" \
  -H "Content-Type: application/json" \
  -H "X-Agent-Secret: $AGENT_SECRET" \
  -d '{
    "id": "agent_it",
    "name": "IT Support",
    "description": "Technical support",
    "connection": {
      "protocol": "http",
      "url": "https://test-it-agent.info-693.workers.dev",
      "auth_strategy": "bearer"
    },
    "capabilities": ["reset_password", "vpn_issue"],
    "intent_triggers": ["vpn", "password", "login", "wifi", "computer", "software"],
    "approved": true
  }'

echo "✅ IT Agent registered"

echo "🧪 Testing routing..."

# Test HR routing
echo "HR Routing:"
curl -s "$SYNAPSE_URL?q=I%20need%20vacation"

echo ""
echo "IT Routing:"
curl -s "$SYNAPSE_URL?q=VPN%20not%20working"

echo ""
echo "🎉 POC Setup Complete!"
