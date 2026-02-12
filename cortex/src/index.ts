import { Ai } from '@cloudflare/ai';
import { SynapseState } from './synapse';

export interface Env {
  AI: any;
  SYNAPSE: DurableObjectNamespace;
}

export { SynapseState };

export default {
  async fetch(request: Request, env: Env) {
    const ai = new Ai(env.AI);
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') return new Response('OK');

    // CORS for Viz
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Graph Data Endpoint (Proxy to Synapse)
    if (url.pathname === '/graph-data') {
      const id = env.SYNAPSE.idFromName('global-state');
      const stub = env.SYNAPSE.get(id);
      return stub.fetch(request);
    }

    const query = url.searchParams.get('q');
    if (!query) return new Response('Missing query', { status: 400 });

    // 1. INTENT DETECTION (The "Brain")
    const systemPrompt = `You are the Enterprise Router. Route the user query to the correct agent.
    Available Agents:
    - agent_hr: Payroll, holidays, benefits.
    - agent_it: Technical support, VPN, hardware, passwords.
    - agent_sales: CRM, leads, customer data.
    - agent_research: General knowledge, news, stock prices.

    Output JSON ONLY: {"target": "agent_name", "confidence": 0.0-1.0}`;

    const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]
    });

    let routingDecision;
    try {
      // Basic JSON extraction (robust enough for MVP)
      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      routingDecision = jsonMatch ? JSON.parse(jsonMatch[0]) : { target: 'agent_research', confidence: 0.5 };
    } catch (e) {
      routingDecision = { target: 'agent_research', confidence: 0.0, error: 'JSON Parse Failed' };
    }

    // 2. VISUALIZATION SIGNAL (Log to Synapse)
    const id = env.SYNAPSE.idFromName('global-state');
    const stub = env.SYNAPSE.get(id);
    // Fire and forget logging (don't await strictly to keep latency low)
    stub.fetch('http://internal/log-route', {
      method: 'POST',
      body: JSON.stringify({
        timestamp: Date.now(),
        query: query,
        ...routingDecision
      })
    });

    // 3. THE HANDOFF (Hot Potato)
    return Response.json({
      status: 'handoff',
      target_agent: routingDecision.target,
      connection_url: `wss://${routingDecision.target}.internal/v1/chat`,
      confidence: routingDecision.confidence
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
};
