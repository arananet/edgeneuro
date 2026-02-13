// Mock IT Agent Worker
// Deploy with: npx wrangler deploy

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // MCP endpoint (simplified for POC)
    if (url.pathname === '/mcp' && request.method === 'POST') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: {
          capabilities: { tools: {} },
          protocolVersion: '2025-11-25'
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          'MCP-Session-Id': crypto.randomUUID()
        }
      });
    }

    // Simple response for POC
    return new Response(JSON.stringify({
      agent: 'IT Support',
      response: 'I can help with VPN issues, password resets, and software installation.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
