import { SynapseState } from './synapse';
import { getActiveAgents, buildSystemPrompt } from './registry';
import { AuthManager } from './auth';

export interface Env {
  AI: any;
  SYNAPSE: DurableObjectNamespace;
  AGENT_KV: KVNamespace;
  AGENT_SECRET: string;
}

export { SynapseState };

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // --- PROXY: MCP TEST (bypass CORS) - SECURED ---
    if (url.pathname === '/proxy-mcp') {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type, X-Agent-Secret',
          }
        });
      }
      
      if (request.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405 });
      }
      
      // Require auth for proxy
      const auth = request.headers.get('X-Agent-Secret');
      if (auth !== env.AGENT_SECRET) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 }, {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }
      
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) return Response.json({ error: 'Missing url param' }, { status: 400 });
      
      try {
        const body = await request.text();
        const proxyRes = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'MCP-Protocol-Version': '2025-11-25',
          },
          body,
        });
        
        const headers: Record<string, string> = {
          'Access-Control-Allow-Origin': '*'
        };
        proxyRes.headers.forEach((v, k) => {
          if (['content-type', 'mcp-session-id', 'mcp-protocol-version'].includes(k)) {
            headers[k] = v;
          }
        });
        
        return new Response(proxyRes.body, { status: proxyRes.status, headers });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // --- ADMIN UI ---
    if (url.pathname === '/admin' || url.pathname === '/admin.html') {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EdgeNeuro Admin</title>
  <style>
    :root { --bg: #f5f5f5; --surface: #fff; --border: #ddd; --primary: #0066cc; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: var(--bg); color: #333; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 20px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .card h2 { font-size: 1.1rem; margin-bottom: 15px; }
    .row { display: flex; gap: 10px; margin-bottom: 10px; }
    input, button { padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; }
    input { flex: 1; }
    button { background: var(--primary); color: #fff; border: none; cursor: pointer; }
    pre { background: #f8f8f8; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid var(--border); }
  </style>
</head>
<body>
  <div class="container">
    <h1>EdgeNeuro Admin</h1>
    <div class="card">
      <h2>Health Check</h2>
      <button onclick="checkHealth()">Check</button>
      <pre id="health-result"></pre>
    </div>
    <div class="card">
      <h2>Registered Agents</h2>
      <button onclick="loadAgents()">Refresh</button>
      <pre id="agents-result"></pre>
    </div>
    <div class="card">
      <h2>Test Routing</h2>
      <div class="row">
        <input type="text" id="test-query" placeholder="Query (e.g., vacation)">
        <button onclick="testRouting()">Test</button>
      </div>
      <pre id="test-result"></pre>
    </div>
  </div>
  <script>
    const API = window.location.origin;
    async function checkHealth() {
      try {
        const res = await fetch(API + '/health');
        document.getElementById('health-result').textContent = JSON.stringify(await res.json(), null, 2);
      } catch (e) { document.getElementById('health-result').textContent = e.message; }
    }
    async function loadAgents() {
      try {
        const res = await fetch(API + '/v1/agents');
        const data = await res.json();
        if (data.agents && data.agents.length) {
          let html = '<table><tr><th>ID</th><th>Name</th><th>Triggers</th></tr>';
          for (const a of data.agents) html += '<tr><td>'+a.id+'</td><td>'+a.name+'</td><td>'+(a.intent_triggers||[]).join(', ')+'</td></tr>';
          document.getElementById('agents-result').innerHTML = html + '</table>';
        } else { document.getElementById('agents-result').textContent = 'No agents'; }
      } catch (e) { document.getElementById('agents-result').textContent = e.message; }
    }
    async function testRouting() {
      const q = document.getElementById('test-query').value;
      if (!q) return;
      try {
        const res = await fetch(API + '/v1/test?q=' + encodeURIComponent(q));
        document.getElementById('test-result').textContent = JSON.stringify(await res.json(), null, 2);
      } catch (e) { document.getElementById('test-result').textContent = e.message; }
    }
  </script>
</body>
</html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    // --- REGISTRATION ---
    if (request.method === 'POST' && url.pathname === '/v1/agent/register') {
      const auth = request.headers.get('X-Agent-Secret');
      if (auth !== env.AGENT_SECRET)
        return new Response('Unauthorized', { status: 401 });
      try {
        const body = await request.json();
        if (!body.connection.auth_strategy)
          body.connection.auth_strategy = 'bearer';
        await env.AGENT_KV.put(`agent:${body.id}`, JSON.stringify(body), {
          expirationTtl: 300,
        });
        return new Response('Registered', { status: 201 });
      } catch (e) {
        return new Response('Bad Request', { status: 400 });
      }
    }

    // --- ADMIN: LIST AGENTS ---
    if (request.method === 'GET' && url.pathname === '/v1/agents') {
      try {
        const agents = await getActiveAgents(env.AGENT_KV);
        return Response.json({ agents, count: agents.length });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // --- ADMIN: TEST ROUTING ---
    if (request.method === 'GET' && url.pathname === '/v1/test') {
      const query = url.searchParams.get('q');
      if (!query) return Response.json({ error: 'Missing query param ?q=' }, { status: 400 });
      
      const agents = await getActiveAgents(env.AGENT_KV);
      const decision = { target: 'keyword_match_fallback', confidence: 0.5, reason: 'No AI' };
      
      // Simple keyword matching
      const q = query.toLowerCase();
      for (const agent of agents) {
        const triggers = agent.intent_triggers || [];
        for (const trigger of triggers) {
          if (q.includes(trigger.toLowerCase())) {
            decision.target = agent.id;
            decision.confidence = 0.9;
            decision.reason = `Matched: ${trigger}`;
            break;
          }
        }
      }
      
      return Response.json({
        query,
        decision,
        agents_available: agents.map(a => a.id)
      });
    }

    // --- ADMIN: HEALTH CHECK ---
    if (url.pathname === '/health') {
      return Response.json({ 
        status: 'ok', 
        timestamp: Date.now(),
        bindings: { kv: !!env.AGENT_KV, ai: !!env.AI, synapse: !!env.SYNAPSE }
      });
    }

    // --- ROUTER ---
    if (url.pathname === '/graph-data') {
      const id = env.SYNAPSE.idFromName('global-state');
      return env.SYNAPSE.get(id).fetch(request);
    }

    const query = url.searchParams.get('q');
    if (!query)
      return new Response('EdgeNeuro SynapseCore Active', { status: 200 });

    const identity = await AuthManager.validateRequest(request, 'bearer');
    const agents = await getActiveAgents(env.AGENT_KV);

    // Fallback if AI not available (beta)
    let decision = { target: 'agent_fallback', confidence: 0.0 };
    
    if (env.AI) {
      try {
        const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [
            { role: 'system', content: buildSystemPrompt(agents) },
            { role: 'user', content: query },
          ],
        });

        try {
          const jsonMatch = response.response.match(/\{[\s\S]*\}/);
          decision = jsonMatch
            ? JSON.parse(jsonMatch[0])
            : { target: 'agent_fallback', confidence: 0.0 };
        } catch (e) {
          console.error('AI Parse Error:', e);
        }
      } catch (e) {
        console.error('AI Error:', e);
      }
    }

    const targetAgent =
      agents.find((a) => a.id === decision.target) || agents[0];

    // --- MCP CAPABILITY CHECK (Streamable HTTP) ---
    // If the agent supports HTTP MCP, we verify it's alive and capable before routing
    // if (targetAgent.connection.protocol === 'http') {
    //     const mcpHeaders = identity ? AuthManager.propagateToken(identity, targetAgent.connection.auth_strategy) : {};
    //     const mcpClient = new MCPClient(targetAgent.connection.url, mcpHeaders);
    //     // We call connect() to verify handshake and session establishment
    //     // If this fails, the try/catch (not shown here for brevity) would trigger fallback
    //     // await mcpClient.connect();
    // }

    // Log to Synapse
    const id = env.SYNAPSE.idFromName('global-state');
    env.SYNAPSE.get(id).fetch('http://internal/log-route', {
      method: 'POST',
      body: JSON.stringify({
        timestamp: Date.now(),
        query,
        target: targetAgent.id,
        confidence: decision.confidence,
        protocol: 'a2a/1.0',
      }),
    });

    // Output A2A Handoff
    const traceId = crypto.randomUUID();
    const downstreamAuth = identity
      ? AuthManager.propagateToken(
          identity,
          targetAgent.connection.auth_strategy,
        )
      : { 'X-Guest': 'true' };

    return Response.json(
      {
        type: 'a2a/connect',
        target: {
          id: targetAgent.id,
          endpoint: targetAgent.connection.url,
          auth_headers: downstreamAuth,
        },
        trace_id: traceId,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'X-A2A-Version': '1.0',
          'X-A2A-Trace-Id': traceId,
        },
      },
    );
  },
};
