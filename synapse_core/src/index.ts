import { Ai } from '@cloudflare/ai';
import { SynapseState } from './synapse';
import { getActiveAgents, buildSystemPrompt } from './registry';
import { AuthManager } from './auth';
import { MCPClient } from './mcp';

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

    // --- REGISTRATION ---
    if (request.method === 'POST' && url.pathname === '/v1/agent/register') {
      const auth = request.headers.get('X-Agent-Secret');
      if (auth !== env.AGENT_SECRET) return new Response('Unauthorized', { status: 401 });
      try {
        const body = await request.json();
        // Set default auth strategy if missing
        if (!body.connection.auth_strategy) body.connection.auth_strategy = 'bearer';
        await env.AGENT_KV.put(`agent:${body.id}`, JSON.stringify(body), { expirationTtl: 300 });
        return new Response('Registered', { status: 201 });
      } catch (e) { return new Response('Bad Request', { status: 400 }); }
    }

    // --- ROUTER ---
    if (url.pathname === '/graph-data') {
      const id = env.SYNAPSE.idFromName('global-state');
      return env.SYNAPSE.get(id).fetch(request);
    }

    const query = url.searchParams.get('q');
    if (!query) return new Response('EdgeNeuro SynapseCore Active', { status: 200 });

    // 1. AUTH & IDENTITY CONTEXT
    const identity = await AuthManager.validateRequest(request, 'bearer'); // Default ingress strategy
    // In strict mode, return 401 if identity is null. For demo, we continue as "guest".

    // 2. FETCH AGENTS
    const agents = await getActiveAgents(env.AGENT_KV);
    const ai = new Ai(env.AI);

    // 3. INFERENCE
    const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: buildSystemPrompt(agents) },
        { role: 'user', content: query }
      ]
    });

    let decision;
    try {
      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      decision = jsonMatch ? JSON.parse(jsonMatch[0]) : { target: 'agent_fallback', confidence: 0.0 };
    } catch (e) {
      decision = { target: 'agent_fallback', confidence: 0.0 };
    }

    const targetAgent = agents.find(a => a.id === decision.target) || agents[0];

    // 4. MCP CAPABILITY CHECK (Optional)
    // If orchestrator needs to verify health/capabilities before routing
    if (targetAgent.connection.protocol === 'http') {
        const mcpHeaders = identity ? AuthManager.propagateToken(identity, targetAgent.connection.auth_strategy) : {};
        const mcpClient = new MCPClient(targetAgent.connection.url, mcpHeaders);
        // Fire-and-forget capability refresh (could store in KV)
        // await mcpClient.getCapabilities(); 
    }

    // 5. VISUALIZATION
    const id = env.SYNAPSE.idFromName('global-state');
    env.SYNAPSE.get(id).fetch('http://internal/log-route', {
      method: 'POST',
      body: JSON.stringify({
        timestamp: Date.now(),
        query,
        target: targetAgent.id,
        confidence: decision.confidence,
        protocol: "a2a/1.0"
      })
    });

    // 6. HANDOFF (With Propagated Auth)
    const traceId = crypto.randomUUID();
    const downstreamAuth = identity 
      ? AuthManager.propagateToken(identity, targetAgent.connection.auth_strategy) 
      : { "X-Guest": "true" };

    return Response.json({
      type: "a2a/connect",
      target: {
        id: targetAgent.id,
        endpoint: targetAgent.connection.url,
        auth_headers: downstreamAuth // Client uses these headers to connect
      },
      trace_id: traceId
    }, { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'X-A2A-Version': '1.0',
        'X-A2A-Trace-Id': traceId
      } 
    });
  }
};
