// synapse_core/src/registry.ts (Updated for Auth Strategy)

export interface AgentProfile {
  id: string; 
  name: string;
  domain: string[]; 
  connection: {
    protocol: 'websocket' | 'http' | 'a2a';
    url: string;
    auth_strategy: 'oauth2' | 'mtls' | 'bearer' | 'api_key'; // New Field
  };
  metadata?: {
    version: string;
    capabilities: string[]; 
  };
}

export const FALLBACK_AGENTS: AgentProfile[] = [
  {
    id: 'agent_fallback',
    name: 'General Support',
    domain: ['general_help', 'unknown_query'],
    connection: { 
      protocol: 'http', 
      url: 'https://support.internal',
      auth_strategy: 'bearer'
    },
    metadata: { version: '1.0', capabilities: ['basic_chat'] }
  }
];

export async function getActiveAgents(kv: KVNamespace): Promise<AgentProfile[]> {
  try {
    const list = await kv.list({ prefix: 'agent:' });
    const agents: AgentProfile[] = [];
    await Promise.all(list.keys.map(async (key) => {
      const agent = await kv.get<AgentProfile>(key.name, 'json');
      if (agent) agents.push(agent);
    }));
    return agents.length > 0 ? agents : FALLBACK_AGENTS;
  } catch (e) {
    return FALLBACK_AGENTS;
  }
}

export function buildSystemPrompt(agents: AgentProfile[]): string {
  const agentDesc = agents.map(a => `- ${a.id} (${a.name}): [${a.domain.join(', ')}]`).join('\n');
  return `You are the EdgeNeuro SynapseCore. Route the task to the correct peer.
  
  Active A2A Peers:
  ${agentDesc}
  
  Rules:
  1. Only choose from the list above.
  2. Output strict JSON only.`;
}
