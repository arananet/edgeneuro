import { Ai } from '@cloudflare/ai';
import { SynapseState } from './synapse';
import { getActiveAgents, buildSystemPrompt } from './registry';

export interface Env {
  AI: any;
  SYNAPSE: DurableObjectNamespace;
  AGENT_KV: KVNamespace;
  AGENT_SECRET: string; // Set via `wrangler secret put AGENT_SECRET`
}

export { SynapseState };

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // --- REGISTRATION ENDPOINT (SECURE) ---
    if (request.method === 'POST' && url.pathname === '/v1/agent/register') {
      const auth = request.headers.get('X-Agent-Secret');
      if (auth !== env.AGENT_SECRET) return new Response('Unauthorized', { status: 401 });

      try {
        const body = await request.json();
        // Validation (Spec 002)
        if (!body.id || !body.domain || !body.connection) {
          return new Response('Invalid Agent Schema', { status: 400 });
        }

        // Store in KV with TTL (Heartbeat)
        await env.AGENT_KV.put(`agent:${body.id}`, JSON.stringify(body), { expirationTtl: 300 });
        
        return new Response('Registered', { status: 201 });
      } catch (e) {
        return new Response('Bad Request', { status: 400 });
      }
    }

    // --- ADMIN LIST ---
    if (url.pathname === '/v1/agent/list') {
      const agents = await getActiveAgents(env.AGENT_KV);
      return Response.json(agents);
    }

    // --- ROUTER LOGIC ---
    if (url.pathname === '/graph-data') {
      const id = env.SYNAPSE.idFromName('global-state');
      return env.SYNAPSE.get(id).fetch(request);
    }

    const query = url.searchParams.get('q');
    if (!query) return new Response('EdgeNeuro Cortex Active', { status: 200 });

    // 1. Fetch Dynamic Agents
    const agents = await getActiveAgents(env.AGENT_KV);
    const ai = new Ai(env.AI);

    // 2. Inference
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
      decision = { target: 'agent_fallback', confidence: 0.0, error: 'JSON Parse Failed' };
    }

    // 3. Resolve Connection Details
    const targetAgent = agents.find(a => a.id === decision.target) || agents[0];

    // 4. Log to Synapse
    const id = env.SYNAPSE.idFromName('global-state');
    env.SYNAPSE.get(id).fetch('http://internal/log-route', {
      method: 'POST',
      body: JSON.stringify({
        timestamp: Date.now(),
        query,
        target: targetAgent.id,
        confidence: decision.confidence,
        reasoning: decision.reasoning
      })
    });

    return Response.json({
      type: "handoff",
      target_agent: targetAgent.id,
      connection: targetAgent.connection,
      context: {
        intent: decision.target,
        confidence: decision.confidence,
        original_query: query
      },
      expiry: 300
    }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  }
};
