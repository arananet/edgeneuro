// synapse_core/src/registry.ts - D1-based agent registry

export interface AgentProfile {
  id: string;
  name: string;
  description?: string;
  intent_triggers?: string[];
  capabilities?: string[];
  connection: {
    protocol: 'websocket' | 'http' | 'a2a';
    url: string;
    auth_strategy: 'oauth2' | 'mtls' | 'bearer' | 'api_key' | 'none';
  };
  approved?: boolean;
}

export const FALLBACK_AGENTS: AgentProfile[] = [
  {
    id: 'agent_fallback',
    name: 'General Support',
    intent_triggers: ['general', 'help', 'other', 'support'],
    connection: {
      protocol: 'http',
      url: 'https://support.internal',
      auth_strategy: 'none',
    },
    approved: true,
  },
];

// Get all agents from D1
export async function getActiveAgents(d1: D1Database): Promise<AgentProfile[]> {
  try {
    const result = await d1.prepare(
      'SELECT * FROM agents WHERE approved = 1'
    ).all();
    
    if (result.results && result.results.length > 0) {
      return result.results as unknown as AgentProfile[];
    }
    return FALLBACK_AGENTS;
  } catch (e) {
    console.error('D1 query error:', e);
    return FALLBACK_AGENTS;
  }
}

// Get ALL agents (including pending)
export async function getAllAgents(d1: D1Database): Promise<AgentProfile[]> {
  try {
    const result = await d1.prepare('SELECT * FROM agents').all();
    if (result.results && result.results.length > 0) {
      return result.results as unknown as AgentProfile[];
    }
    return [];
  } catch (e) {
    console.error('D1 query error:', e);
    return [];
  }
}

// Register or update agent
export async function upsertAgent(d1: D1Database, agent: AgentProfile): Promise<void> {
  await d1.prepare(`
    INSERT INTO agents (id, name, description, intent_triggers, capabilities, connection, approved)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      intent_triggers = excluded.intent_triggers,
      capabilities = excluded.capabilities,
      connection = excluded.connection,
      approved = excluded.approved
  `).bind(
    agent.id,
    agent.name,
    agent.description || null,
    JSON.stringify(agent.intent_triggers || []),
    JSON.stringify(agent.capabilities || []),
    JSON.stringify(agent.connection),
    agent.approved ? 1 : 0
  ).run();
}

// Approve agent
export async function approveAgent(d1: D1Database, agentId: string): Promise<boolean> {
  const result = await d1.prepare(
    'UPDATE agents SET approved = 1 WHERE id = ?'
  ).bind(agentId).run();
  return result.success;
}

// Get single agent
export async function getAgent(d1: D1Database, agentId: string): Promise<AgentProfile | null> {
  const result = await d1.prepare(
    'SELECT * FROM agents WHERE id = ?'
  ).bind(agentId).first();
  return result as unknown as AgentProfile | null;
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
