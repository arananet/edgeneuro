import { SynapseState } from './synapse';
import { getActiveAgents, getAllAgents, upsertAgent, approveAgent, getAgent, buildSystemPrompt } from './registry';

export interface Env {
  AI: any;
  SYNAPSE: DurableObjectNamespace;
  AGENT_KV: KVNamespace;
  DB: D1Database;
  AGENT_SECRET: string;
}

export { SynapseState };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Secret, MCP-Protocol-Version, Accept',
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
        d1_enabled: !!env.DB,
        bindings: { kv: !!env.AGENT_KV, ai: !!env.AI, d1: !!env.DB, synapse: !!env.SYNAPSE }
      }, { headers: CORS_HEADERS });
    }

    // --- LIST AGENTS ---
    if (request.method === 'GET' && url.pathname === '/v1/agents') {
      const agents = await getAllAgents(env.DB);
      return Response.json({ agents, count: agents.length }, { headers: CORS_HEADERS });
    }

    // --- TEST ROUTING (LLM-powered) ---
    if (request.method === 'GET' && url.pathname === '/v1/test') {
      const query = url.searchParams.get('q') || '';
      const agents = await getActiveAgents(env.DB);
      
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
        } catch (e: any) {
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

    // --- REGISTER AGENT (Protected, persistent in D1) ---
    if (request.method === 'POST' && url.pathname === '/v1/agent/register') {
      const auth = request.headers.get('X-Agent-Secret');
      if (auth !== env.AGENT_SECRET)
        return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
      
      try {
        const body = await request.json();
        if (!body.connection) body.connection = {};
        if (!body.connection.auth_strategy) body.connection.auth_strategy = 'bearer';
        if (body.approved === undefined) body.approved = false;
        
        await upsertAgent(env.DB, body);
        return new Response('Registered', { status: 201, headers: CORS_HEADERS });
      } catch (e: any) {
        return new Response(`Bad Request: ${e.message}`, { status: 400, headers: CORS_HEADERS });
      }
    }

    // --- APPROVE AGENT ---
    if (request.method === 'POST' && url.pathname === '/v1/agent/approve') {
      const auth = request.headers.get('X-Agent-Secret');
      if (auth !== env.AGENT_SECRET)
        return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
      
      const agentId = url.searchParams.get('id');
      if (!agentId) return Response.json({ error: 'Missing id' }, { status: 400, headers: CORS_HEADERS });
      
      await approveAgent(env.DB, agentId);
      const agent = await getAgent(env.DB, agentId);
      
      return Response.json({ success: true, agent }, { headers: CORS_HEADERS });
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
        return Response.json({ url: targetUrl, error: e.message, mcpSupported: false }, { headers: CORS_HEADERS });
      }
    }

    // --- MCP PROXY (bypass CORS) ---
    if (url.pathname === '/proxy-mcp') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) return Response.json({ error: 'Missing url param' }, { status: 400, headers: CORS_HEADERS });
      
      // Forward the request, stripping problematic headers
      const mcpHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      };
      
      // Add MCP protocol version if provided
      const mcpVersion = request.headers.get('MCP-Protocol-Version');
      if (mcpVersion) mcpHeaders['MCP-Protocol-Version'] = mcpVersion;
      
      // Add auth if provided
      const auth = request.headers.get('Authorization');
      if (auth) mcpHeaders['Authorization'] = auth;
      
      try {
        const body = await request.text();
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: mcpHeaders,
          body,
        });
        
        const data = await res.text();
        return new Response(data, {
          status: res.status,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': res.headers.get('Content-Type') || 'application/json',
          },
        });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
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
    const agents = await getActiveAgents(env.DB);

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
