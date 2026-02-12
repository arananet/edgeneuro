// cortex/src/registry.ts
// A2A Compliant Registry

export interface AgentProfile {
  id: string; // A2A Identity (DID or Hostname)
  name: string;
  domain: string[]; 
  connection: {
    protocol: 'websocket' | 'http' | 'a2a'; // A2A Transport
    url: string;
  };
  metadata?: {
    version: string;
    capabilities: string[]; // MCP Tool list
  };
}

export const FALLBACK_AGENTS: AgentProfile[] = [
  {
    id: 'agent_fallback',
    name: 'General Support',
    domain: ['general_help', 'unknown_query'],
    connection: { protocol: 'http', url: 'https://support.internal' },
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
    console.error("Registry KV Error", e);
    return FALLBACK_AGENTS;
  }
}

export function buildSystemPrompt(agents: AgentProfile[]): string {
  const agentDesc = agents.map(a => `- ${a.id} (${a.name}): [${a.domain.join(', ')}]`).join('\n');
  
  return `You are the EdgeNeuro Router (A2A Node). Route the task to the correct peer.
  
  Active A2A Peers:
  ${agentDesc}
  
  Rules:
  1. Only choose from the list above.
  2. If no match, output {"target": "agent_fallback", "confidence": 0.0}.
  3. Output strict JSON only.
  `;
}
