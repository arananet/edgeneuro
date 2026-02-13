# Tutorial 04: Testing & Evaluation

## Testing Agents

### A2A Protocol Test

Use the Testing page in Control Plane to test routing:

1. Go to **Testing** tab
2. Enter a test query (e.g., "I need vacation time")
3. Click **Test Routing**

The response shows:
- Selected agent ID
- Confidence score
- Reasoning

### MCP Discovery

To probe an MCP endpoint:

1. Go to **Agents** page
2. Enter agent endpoint URL
3. Click **Discover**

This tests if the endpoint supports MCP protocol.

## Evaluation Metrics

The Evaluation page shows:

- **Routing Accuracy**: % of correct agent selections
- **Latency**: p50, p95, p99 response times
- **Uptime**: System availability
- **Agent Performance**: Per-agent metrics

## Production Monitoring

Set up external monitoring:
- UptimeRobot or similar for `/health` endpoint
- Cloudflare Analytics for traffic patterns
- Custom dashboards via `/graph-data`
