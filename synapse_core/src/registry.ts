// synapse_core/src/registry.ts (Updated for Auth Strategy)

export interface AgentProfile {
  id: string;
  name: string;
  description?: string;
  intent_triggers?: string[];  // Matches registration
  capabilities?: string[];     // Matches registration
  connection: {
    protocol: 'websocket' | 'http' | 'a2a';
    url: string;
    auth_strategy: 'oauth2' | 'mtls' | 'bearer' | 'api_key'; // New Field
  };
}

export const FALLBACK_AGENTS: AgentProfile[] = [
  {
    id: 'agent_fallback',
    name: 'General Support',
    intent_triggers: ['general', 'help', 'other'],
    connection: {
      protocol: 'http',
      url: 'https://support.internal',
      auth_strategy: 'bearer',
    },
  },
];

export async function getActiveAgents(
  kv: KVNamespace,
): Promise<AgentProfile[]> {
  try {
    const list = await kv.list({ prefix: 'agent:' });
    const agents: AgentProfile[] = [];
    await Promise.all(
      list.keys.map(async (key) => {
        const agent = await kv.get<AgentProfile>(key.name, 'json');
        if (agent) agents.push(agent);
      }),
    );
    return agents.length > 0 ? agents : FALLBACK_AGENTS;
  } catch (e) {
    return FALLBACK_AGENTS;
  }
}

export function buildSystemPrompt(agents: AgentProfile[]): string {
  const agentDesc = agents
    .map((a) => {
      const triggers = a.intent_triggers?.join(', ') || a.capabilities?.join(', ') || 'general';
      return `- ${a.id} (${a.name}): handles [${triggers}]`;
    })
    .join('\n');
  return `You are the EdgeNeuro SynapseCore. Route the task to the correct peer.
  
  Active Agents:
  ${agentDesc}
  
  Rules:
  1. Only choose from the agents above.
  2. Output strict JSON: {"target": "agent_id", "confidence": 0.0-1.0, "reason": "..."}`;
}
