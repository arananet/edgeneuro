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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Secret',
};

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // --- HEALTH CHECK ---
    if (url.pathname === '/health') {
      return Response.json({ 
        status: 'ok', 
        bindings: { kv: !!env.AGENT_KV, ai: !!env.AI, synapse: !!env.SYNAPSE }
      }, { headers: CORS_HEADERS });
    }

    // --- LIST AGENTS ---
    if (request.method === 'GET' && url.pathname === '/v1/agents') {
      const agents = await getActiveAgents(env.AGENT_KV);
      return Response.json({ agents, count: agents.length }, { headers: CORS_HEADERS });
    }

    // --- TEST ROUTING (no auth needed) ---
    if (request.method === 'GET' && url.pathname === '/v1/test') {
      const query = url.searchParams.get('q') || '';
      const agents = await getActiveAgents(env.AGENT_KV);
      
      // Simple keyword matching
      const decision = { target: 'agent_fallback', confidence: 0.5, reason: 'No match' };
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
      }, { headers: CORS_HEADERS });
    }

    // --- REGISTRATION (Protected) ---
    if (request.method === 'POST' && url.pathname === '/v1/agent/register') {
      const auth = request.headers.get('X-Agent-Secret');
      if (auth !== env.AGENT_SECRET)
        return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
      try {
        const body = await request.json();
        if (!body.connection?.auth_strategy)
          body.connection = body.connection || {};
        if (!body.connection.auth_strategy)
          body.connection.auth_strategy = 'bearer';
        
        // Add approved: false by default
        body.approved = false;
        
        await env.AGENT_KV.put(`agent:${body.id}`, JSON.stringify(body), {
          expirationTtl: 300,
        });
        return new Response('Registered (pending approval)', { status: 201, headers: CORS_HEADERS });
      } catch (e) {
        return new Response('Bad Request', { status: 400, headers: CORS_HEADERS });
      }
    }

    // --- APPROVE AGENT ---
    if (request.method === 'POST' && url.pathname === '/v1/agent/approve') {
      const auth = request.headers.get('X-Agent-Secret');
      if (auth !== env.AGENT_SECRET)
        return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
      
      const agentId = url.searchParams.get('id');
      if (!agentId) return Response.json({ error: 'Missing id' }, { status: 400, headers: CORS_HEADERS });
      
      const agentData = await env.AGENT_KV.get(`agent:${agentId}`, 'json');
      if (!agentData) return Response.json({ error: 'Agent not found' }, { status: 404, headers: CORS_HEADERS });
      
      agentData.approved = true;
      await env.AGENT_KV.put(`agent:${agentId}`, JSON.stringify(agentData));
      
      return Response.json({ success: true, agent: agentData }, { headers: CORS_HEADERS });
    }

    // --- AUTO-DISCOVERY (Probe MCP endpoint) ---
    if (request.method === 'GET' && url.pathname === '/v1/discover') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) return Response.json({ error: 'Missing url param' }, { status: 400, headers: CORS_HEADERS });
      
      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'MCP-Protocol-Version': '2025-11-25',
          },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1, method: 'initialize',
            params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'EdgeNeuro-Probe', version: '1.0.0' } }
          })
        });
        
        const data = await res.json();
        const mcpSupported = !!data.result?.capabilities;
        
        return Response.json({
          url: targetUrl,
          mcpSupported,
          capabilities: data.result?.capabilities || {},
          protocolVersion: data.result?.protocolVersion
        }, { headers: CORS_HEADERS });
      } catch (e) {
        return Response.json({ url: targetUrl, error: e.message, mcpSupported: false }, { headers: CORS_HEADERS });
      }
    }

    // --- ROUTING ---
    if (url.pathname === '/graph-data') {
      const id = env.SYNAPSE.idFromName('global-state');
      return env.SYNAPSE.get(id).fetch(request);
    }

    const query = url.searchParams.get('q');
    if (!query)
      return new Response('EdgeNeuro SynapseCore Active', { status: 200, headers: CORS_HEADERS });

    // Only route to approved agents
    const allAgents = await getActiveAgents(env.AGENT_KV);
    const agents = allAgents.filter((a: any) => a.approved !== false);

    // Fallback if AI not available
    let decision = { target: 'agent_fallback', confidence: 0.0 };
    
    if (env.AI && agents.length > 0) {
      try {
        const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [
            { role: 'system', content: buildSystemPrompt(agents) },
            { role: 'user', content: query },
          ],
        });

        try {
          const jsonMatch = response.response.match(/\{[\s\S]*\}/);
          decision = jsonMatch ? JSON.parse(jsonMatch[0]) : { target: 'agent_fallback', confidence: 0.0 };
        } catch (e) {
          console.error('AI Parse Error:', e);
        }
      } catch (e) {
        console.error('AI Error:', e);
      }
    }

    const targetAgent = agents.find((a: any) => a.id === decision.target) || agents[0] || { id: 'agent_fallback', connection: { url: 'https://support.internal', auth_strategy: 'none' } };

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
    return Response.json(
      {
        type: 'a2a/connect',
        target: {
          id: targetAgent.id,
          endpoint: targetAgent.connection.url,
          auth_headers: { 'X-Guest': 'true' },
        },
        trace_id: traceId,
      },
      {
        headers: { ...CORS_HEADERS, 'X-A2A-Version': '1.0', 'X-A2A-Trace-Id': traceId },
      },
    );
  },
};
