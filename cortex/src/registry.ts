// cortex/src/registry.ts
// Dynamic Registry backed by KV

export interface AgentProfile {
  id: string;
  name: string;
  domain: string[]; 
  connection: {
    protocol: 'websocket' | 'http';
    url: string;
  };
}

// Fallback for bootstrap or KV failure
export const FALLBACK_AGENTS: AgentProfile[] = [
  {
    id: 'agent_fallback',
    name: 'General Support',
    domain: ['general_help', 'unknown_query'],
    connection: { protocol: 'http', url: 'https://support.internal' }
  }
];

export async function getActiveAgents(kv: KVNamespace): Promise<AgentProfile[]> {
  try {
    const list = await kv.list({ prefix: 'agent:' });
    const agents: AgentProfile[] = [];
    
    // In a high-scale system, we would cache this or use a DO for aggregation
    // For <50 agents, parallel KV reads are fast enough (sub-20ms in same colo)
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
  
  return `You are the EdgeNeuro Router. Route the user query to the correct internal agent.
  
  Active Agents (Dynamic List):
  ${agentDesc}
  
  Rules:
  1. Only choose from the list above.
  2. If no match, output {"target": "agent_fallback", "confidence": 0.0}.
  3. Output strict JSON only.
  `;
}
