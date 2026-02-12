// cortex/src/registry.ts
// Maps Skill Specs to Runtime Configuration

export interface AgentProfile {
  id: string;
  name: string;
  domain: string[]; // Intent clusters matching .spec/skills/
  connection: {
    protocol: 'websocket' | 'http';
    url: string;
  };
}

export const AGENT_REGISTRY: Record<string, AgentProfile> = {
  agent_hr: {
    id: 'agent_hr',
    name: 'HR Agent',
    domain: ['payroll', 'leave_request', 'benefits', 'holidays', 'salary'],
    connection: { protocol: 'websocket', url: 'wss://hr.internal/v1/chat' }
  },
  agent_it: {
    id: 'agent_it',
    name: 'IT Support',
    domain: ['vpn', 'password_reset', 'hardware', 'software_license', 'login_issue'],
    connection: { protocol: 'websocket', url: 'wss://it.internal/v1/chat' }
  },
  agent_data: {
    id: 'agent_data',
    name: 'Data Agent',
    domain: ['sql_query', 'tableau', 'report', 'analytics', 'snowflake'],
    connection: { protocol: 'websocket', url: 'wss://data.internal/v1/chat' }
  },
  agent_research: {
    id: 'agent_research',
    name: 'Research Agent',
    domain: ['general_knowledge', 'news', 'stock_price', 'weather'],
    connection: { protocol: 'websocket', url: 'wss://research.internal/v1/chat' }
  }
};

export function getSystemPrompt(): string {
  const agentsList = Object.values(AGENT_REGISTRY)
    .map(a => `- ${a.id}: Handles ${a.domain.join(', ')}`)
    .join('\n');

  return `You are the EdgeNeuro Router. Classify the user query into the correct agent domain.
  
  Active Agents:
  ${agentsList}
  
  Rules:
  1. If unsure, fallback to 'agent_research'.
  2. Output strict JSON: {"target": "agent_id", "confidence": 0.0-1.0, "reasoning": "brief explanation"}
  `;
}
