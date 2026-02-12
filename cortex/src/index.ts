import { Ai } from '@cloudflare/ai';
import { SynapseState } from './synapse';
import { AGENT_REGISTRY, getSystemPrompt } from './registry';

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
    // Using the dynamic prompt from registry
    const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: getSystemPrompt() },
        { role: 'user', content: query }
      ]
    });

    let decision;
    try {
      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      decision = jsonMatch ? JSON.parse(jsonMatch[0]) : { target: 'agent_research', confidence: 0.5 };
    } catch (e) {
      decision = { target: 'agent_research', confidence: 0.0, error: 'JSON Parse Failed' };
    }

    // Validate Target
    const agentProfile = AGENT_REGISTRY[decision.target] || AGENT_REGISTRY['agent_research'];

    // 2. VISUALIZATION SIGNAL (Log to Synapse)
    const id = env.SYNAPSE.idFromName('global-state');
    const stub = env.SYNAPSE.get(id);
    stub.fetch('http://internal/log-route', {
      method: 'POST',
      body: JSON.stringify({
        timestamp: Date.now(),
        query: query,
        target: agentProfile.id,
        confidence: decision.confidence,
        reasoning: decision.reasoning
      })
    });

    // 3. THE HANDOFF (Hot Potato)
    // Strictly following docs/A2A_PROTOCOL.md
    return Response.json({
      type: "handoff",
      target_agent: agentProfile.id,
      connection: {
        protocol: agentProfile.connection.protocol,
        url: agentProfile.connection.url,
        auth_token: "mock_jwt_token_for_demo"
      },
      context: {
        intent: decision.target, // The raw intent from AI
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        original_query: query
      },
      expiry: 300 // 5 minutes validity
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
};
