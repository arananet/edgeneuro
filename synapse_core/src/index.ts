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
        ai_enabled: !!env.AI,
        bindings: { kv: !!env.AGENT_KV, ai: !!env.AI, synapse: !!env.SYNAPSE }
      }, { headers: CORS_HEADERS });
    }

    // --- LIST AGENTS ---
    if (request.method === 'GET' && url.pathname === '/v1/agents') {
      const allAgents = await getActiveAgents(env.AGENT_KV);
      return Response.json({ agents: allAgents, count: allAgents.length }, { headers: CORS_HEADERS });
    }

    // --- TEST ROUTING (LLM-powered) ---
    if (request.method === 'GET' && url.pathname === '/v1/test') {
      const query = url.searchParams.get('q') || '';
      const agents = await getActiveAgents(env.AGENT_KV);
      
      let decision = { target: 'agent_fallback', confidence: 0.0, reason: 'No AI available' };
      
      // Try LLM first if available
      if (env.AI && agents.length > 0) {
        try {
          const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
              { role: 'system', content: buildSystemPrompt(agents) },
              { role: 'user', content: `Route this query: "${query}"` },
            ],
          });
          
          const jsonMatch = response.response?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            decision = { 
              target: parsed.target || 'agent_fallback', 
              confidence: parsed.confidence || 0.5,
              reason: parsed.reason || 'LLM decision'
            };
          }
        } catch (e) {
          decision.reason = `LLM error: ${e.message}`;
        }
      } else {
        // Fallback to keyword matching
        const q = query.toLowerCase();
        for (const agent of agents) {
          const triggers = agent.intent_triggers || [];
          for (const trigger of triggers) {
            if (q.includes(trigger.toLowerCase())) {
              decision.target = agent.id;
              decision.confidence = 0.9;
              decision.reason = `Keyword match: ${trigger}`;
              break;
            }
          }
        }
      }
      
      return Response.json({
        query,
        decision,
        ai_used: !!env.AI,
        agents_available: agents.map((a: any) => a.id)
      }, { headers: CORS_HEADERS });
    }

    // --- REGISTRATION (Protected, persistent) ---
    if (request.method === 'POST' && url.pathname === '/v1/agent/register') {
      const auth = request.headers.get('X-Agent-Secret');
      if (auth !== env.AGENT_SECRET)
        return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
      try {
        const body = await request.json();
        if (!body.connection) body.connection = {};
        if (!body.connection.auth_strategy) body.connection.auth_strategy = 'bearer';
        
        // Default approved=false, but can be set to true
        if (body.approved === undefined) body.approved = false;
        
        // Store WITHOUT expiration (persistent)
        await env.AGENT_KV.put(`agent:${body.id}`, JSON.stringify(body));
        return new Response('Registered', { status: 201, headers: CORS_HEADERS });
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

    // --- AUTO-DISCOVERY ---
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
        return Response.json({
          url: targetUrl,
          mcpSupported: !!data.result?.capabilities,
          capabilities: data.result?.capabilities || {},
          protocolVersion: data.result?.protocolVersion
        }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ error: e url: targetUrl, mcpSupported: false }, { headers: CORS_HEADERS });
      }
    }

    // --- ROUTING (Main endpoint) ---
    if (url.pathname === '/graph-data') {
      const id = env.SYNAPSE.idFromName('global-state');
      return env.SYNAPSE.get(id).fetch(request);
    }

    const query = url.searchParams.get('q');
    if (!query)
      return new Response('EdgeNeuro SynapseCore Active', { status: 200, headers: CORS_HEADERS });

    // Get approved agents only
    const allAgents = await getActiveAgents(env.AGENT_KV);
    const agents = allAgents.filter((a: any) => a.approved !== false);

    // Default decision
    let decision = { target: 'agent_fallback', confidence: 0.0 };
    
    // Use LLM if available
    if (env.AI && agents.length > 0) {
      try {
        const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [
            { role: 'system', content: buildSystemPrompt(agents) },
            { role: 'user', content: query },
          ],
        });

        const jsonMatch = response.response?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          decision = { target: parsed.target || 'agent_fallback', confidence: parsed.confidence || 0.5 };
        }
      } catch (e) {
        console.error('AI Error:', e);
      }
    }

    const targetAgent = agents.find((a: any) => a.id === decision.target) || agents[0] || { 
      id: 'agent_fallback', 
      connection: { url: 'https://support.internal', auth_strategy: 'none' } 
    };

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
