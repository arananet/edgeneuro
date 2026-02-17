import { SynapseState } from './synapse';
import { getActiveAgents, getAllAgents, upsertAgent, approveAgent, getAgent, buildSystemPrompt } from './registry';
import { SymbolicEngine, DEFAULT_ACCESS_POLICY, TOPIC_ALIASES, KnowledgeGraph, kgAccessEngine } from './symbolic-engine';
import { SymbolicIntentDetector, INTENT_TAXONOMY, IntentCategory } from './intent-taxonomy';

// Re-export for external use
export { SymbolicEngine, DEFAULT_ACCESS_POLICY, TOPIC_ALIASES, KnowledgeGraph, kgAccessEngine };
export { SymbolicIntentDetector, INTENT_TAXONOMY, IntentCategory };

export interface Env {
  AI: any;
  SYNAPSE: DurableObjectNamespace;
  AGENT_KV: KVNamespace;
  DB: D1Database;
  AGENT_SECRET: string;
  ROUTING_MODEL?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
}

export { SynapseState };

const DEFAULT_ROUTING_MODEL = '@cf/meta/llama-3.2-1b-instruct';

// ============================================================================
// NEURO-SYMBOLIC ROUTING ENGINE (TRUE IMPLEMENTATION)
// ============================================================================
// 
// ARCHITECTURE:
// 
//    User Query
//         │
//         ▼
//    ┌─────────────────────────────────────────┐
//    │  NEURAL LAYER (LLM)                     │
//    │  - Detect user intent                   │
//    │  - Extract topic from query            │
//    │  - Returns: topic, confidence           │
//    └─────────────────────────────────────────┘
//         │
//         ▼ (intent.topic)
//    ┌─────────────────────────────────────────┐
//    │  SYMBOLIC LAYER (Knowledge Graph)       │
//    │  - Evaluate access policy               │
//    │  - Check role → topic permissions      │
//    │  - Principle: DEFAULT DENY             │
//    │  - Returns: ALLOW/DENY, reason         │
//    └─────────────────────────────────────────┘
//         │
//         ▼ (if ALLOW)
//    ┌─────────────────────────────────────────┐
//    │  RESOLVE AGENT                          │
//    │  - Map topic → agent                   │
//    │  - Return agent endpoint               │
//    └─────────────────────────────────────────┘
//
// ============================================================================

interface NeuroSymbolicResult {
  // What user wants (Neural)
  intent: {
    topic: string;
    confidence: number;
    reasoning: string;
  };
  
  // What user can have (Symbolic)
  access: {
    decision: 'ALLOW' | 'DENY';
    reason: string;
    userRole: string;
    alternatives: string[];
  };
  
  // Final routing
  allowed: boolean;
  target: string | null;
  agentEndpoint: string | null;
  
  // Architecture metadata
  architecture: {
    neural: boolean;
    symbolic: boolean;
    method: string;
  };
}

/**
 * TRUE Neuro-Symbolic Routing
 * 
 * Step 1: NEURAL - LLM detects intent
 * Step 2: SYMBOLIC - KG evaluates access (DEFAULT DENY)
 * Step 3: RESOLVE - Map topic to agent
 */
async function neuroSymbolicRouting(
  query: string,
  agents: any[],
  env: Env,
  userRole: string = 'EMPLOYEE'
): Promise<NeuroSymbolicResult> {
  const defaultResult: NeuroSymbolicResult = {
    intent: { topic: 'GENERAL_SUPPORT', confidence: 0, reasoning: 'No intent detected' },
    access: { decision: 'DENY', reason: 'No matching rules', userRole, alternatives: [] },
    allowed: false,
    target: null,
    agentEndpoint: null,
    architecture: { neural: false, symbolic: false, method: 'fallback' }
  };

  // =========================================================================
  // STEP 1: SYMBOLIC - Knowledge Graph Intent Detection (PRIMARY)
  // =========================================================================
  let detectedIntent = { topic: 'GENERAL_SUPPORT', confidence: 0, method: 'kg' };
  
  try {
    const engine = new SymbolicEngine();
    const kg = engine.getKnowledgeGraph();
    const kgResults = kg.findIntentsByQuery(query);
    
    if (kgResults.length > 0) {
      const best = kgResults[0];
      detectedIntent = {
        topic: best.topic.replace('topic:', ''),
        confidence: best.confidence,
        method: 'knowledge_graph'
      };
    }
  } catch (e) {
    // KG failed, continue to LLM
  }

  // =========================================================================
  // STEP 2: NEURAL - LLM Agent Resolution (FALLBACK)
  // =========================================================================
  // Only use LLM if KG didn't find a confident match
  // Use LLM for: typo resolution, language understanding, agent mapping
  if (detectedIntent.confidence < 0.5 && env.AI && agents.length > 0) {
    const modelId = await getRoutingModel(env.DB);
    
    // Build agent context for the prompt
    const agentContext = agents.map((a: any) => {
      const name = a.name?.toLowerCase() || a.id.toLowerCase();
      let topics = 'general support';
      if (name.includes('hr')) {
        topics = 'vacations, time off, PTO, leave, holiday, payroll, benefits, hiring, onboarding, performance reviews, HR policies';
      } else if (name.includes('it')) {
        topics = 'IT tickets, password, login, VPN, network, hardware, printer, software, email, security';
      }
      return `- ${a.id}: handles ${topics}`;
    }).join('\n');

    try {
      const response = await env.AI.run(modelId, {
        messages: [
          { 
            role: 'system', 
            content: `You are a neuro-symbolic router. Your job is to:
1. Resolve typos, leetspeak, or unclear text to known intents
2. Map the resolved intent to the correct agent

Available agents:
${agentContext}

Guidelines:
- "v1c4t10ns" = "vacations" = agent_hr
- "password" = "login" = agent_it  
- "vpn" = "network" = agent_it
- If unclear, respond with agent_fallback

Reply with JSON:
{"agent": "agent_id", "topic": "resolved_topic", "confidence": 0.0-1.0, "reasoning": "brief explanation"}
NEVER respond with anything except valid JSON.`
          },
          { role: 'user', content: query }
        ]
      });

      if (response.response) {
        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        console.log('LLM raw response:', response.response);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('LLM parsed:', JSON.stringify(parsed));
          // Use LLM result if agent is in available agents
          const matchedAgent = agents.find((a: any) => a.id === parsed.agent);
          if (matchedAgent) {
            detectedIntent = {
              topic: parsed.topic || 'GENERAL_SUPPORT',
              confidence: parsed.confidence || 0.7,
              method: 'llm',
              llm_agent: parsed.agent
            };
          } else if (parsed.agent) {
            // Agent not in list - default to fallback but mark as LLM
            detectedIntent = {
              topic: parsed.topic || 'GENERAL_SUPPORT',
              confidence: 0.5,
              method: 'llm',
              llm_agent: parsed.agent
            };
          }
        } else {
          // LLM returned non-JSON (refusal, error, etc.) - mark as failed llm
          console.log('LLM returned non-JSON response, triggering symbolic fallback');
          detectedIntent = {
            topic: 'GENERAL_SUPPORT',
            confidence: 0,
            method: 'llm_failed'
          };
        }
      }
    } catch (e) {
      console.log('LLM error:', e);
      // Mark as llm_failed so symbolic fallback can handle
      detectedIntent = {
        topic: 'GENERAL_SUPPORT',
        confidence: 0,
        method: 'llm_failed'
      };
    }
  }

  // =========================================================================
  // STEP 2.5: SYMBOLIC FALLBACK - When LLM fails or returns unexpected
  // =========================================================================
  // This is the neuro-symbolic guardrail: symbolic rules catch when neural fails
  const queryLower = query.toLowerCase();
  if ((detectedIntent.method === 'llm' || detectedIntent.method === 'llm_failed') && detectedIntent.topic === 'GENERAL_SUPPORT') {
    // LLM couldn't resolve - use symbolic keyword fallback
    const symbolicFallbacks: Record<string, { topic: string; agent: string }> = {
      // IT keywords
      'laptop': { topic: 'IT_HARDWARE', agent: 'agent_it' },
      'computer': { topic: 'IT_HARDWARE', agent: 'agent_it' },
      'l4pt0p': { topic: 'IT_HARDWARE', agent: 'agent_it' },
      'keyboard': { topic: 'IT_HARDWARE', agent: 'agent_it' },
      'mouse': { topic: 'IT_HARDWARE', agent: 'agent_it' },
      'monitor': { topic: 'IT_HARDWARE', agent: 'agent_it' },
      'printer': { topic: 'IT_HARDWARE', agent: 'agent_it' },
      'password': { topic: 'IT_PASSWORD', agent: 'agent_it' },
      'login': { topic: 'IT_PASSWORD', agent: 'agent_it' },
      'vpn': { topic: 'IT_VPN', agent: 'agent_it' },
      'network': { topic: 'IT_VPN', agent: 'agent_it' },
      'wifi': { topic: 'IT_VPN', agent: 'agent_it' },
      'email': { topic: 'IT_TICKETS', agent: 'agent_it' },
      'software': { topic: 'IT_TICKETS', agent: 'agent_it' },
      'install': { topic: 'IT_TICKETS', agent: 'agent_it' },
      // HR keywords  
      'vacation': { topic: 'BENEFITS', agent: 'agent_hr' },
      'holiday': { topic: 'BENEFITS', agent: 'agent_hr' },
      'pto': { topic: 'BENEFITS', agent: 'agent_hr' },
      'leave': { topic: 'BENEFITS', agent: 'agent_hr' },
      'payroll': { topic: 'PAYROLL', agent: 'agent_hr' },
      'salary': { topic: 'PAYROLL', agent: 'agent_hr' },
      'benefits': { topic: 'BENEFITS', agent: 'agent_hr' },
      'hiring': { topic: 'HIRING', agent: 'agent_hr' },
      'interview': { topic: 'HIRING', agent: 'agent_hr' },
    };
    
    for (const [keyword, mapping] of Object.entries(symbolicFallbacks)) {
      if (queryLower.includes(keyword)) {
        detectedIntent = {
          topic: mapping.topic,
          confidence: 0.9,
          method: 'symbolic_fallback'
        };
        break;
      }
    }
  }

  // =========================================================================
  // STEP 3: SYMBOLIC - Knowledge Graph Access Control
  // =========================================================================
  const engine = new SymbolicEngine();
  const userProfile = {
    userId: 'anonymous',
    email: '',
    role: userRole,
    department: '',
    groups: []
  };
  
  // Normalize vacation-related topics to BENEFITS (KG only has BENEFITS)
  const normalizedTopic = ['VACATIONS', 'VACATION', 'TIME_OFF', 'PTO', 'LEAVE', 'HOLIDAY'].includes(detectedIntent.topic)
    ? 'BENEFITS'
    : detectedIntent.topic;
  
  const accessDecision = engine.evaluateAccess(normalizedTopic, userProfile);
  
  // If DENY, return immediately with alternatives
  if (accessDecision.decision === 'DENY') {
    return {
      intent: { ...detectedIntent, reasoning: 'LLM intent detection' },
      access: {
        decision: 'DENY',
        reason: accessDecision.reason,
        userRole: userRole,
        alternatives: accessDecision.alternatives
      },
      allowed: false,
      target: null,
      agentEndpoint: null,
      architecture: { neural: true, symbolic: true, method: 'kg_default_deny' }
    };
  }

  // =========================================================================
  // STEP 3: RESOLVE - Map topic to agent
  // =========================================================================
  // Build topic → agent mapping from active agents
  const topicToAgent: Record<string, string> = {};
  for (const agent of agents) {
    const name = agent.name?.toLowerCase() || agent.id.toLowerCase();
    if (name.includes('hr')) {
      topicToAgent['PAYROLL'] = agent.id;
      topicToAgent['BENEFITS'] = agent.id;
      topicToAgent['VACATIONS'] = agent.id;
      topicToAgent['VACATION'] = agent.id;
      topicToAgent['TIME_OFF'] = agent.id;
      topicToAgent['PTO'] = agent.id;
      topicToAgent['LEAVE'] = agent.id;
      topicToAgent['HOLIDAY'] = agent.id;
      topicToAgent['PERFORMANCE_REVIEWS'] = agent.id;
      topicToAgent['HIRING'] = agent.id;
      topicToAgent['ONBOARDING'] = agent.id;
      topicToAgent['HR_POLICIES'] = agent.id;
      // Map all above to BENEFITS for access check
    }
    if (name.includes('it')) {
      topicToAgent['IT_TICKETS'] = agent.id;
      topicToAgent['IT_VPN'] = agent.id;
      topicToAgent['IT_HARDWARE'] = agent.id;
      topicToAgent['IT_SECURITY'] = agent.id;
      topicToAgent['IT_PASSWORD'] = agent.id;
    }
  }
  topicToAgent['GENERAL_SUPPORT'] = 'agent_fallback';
  
  // Use LLM-suggested agent if available, otherwise fall back to topic mapping
  const llmSuggestedAgent = (detectedIntent as any).llm_agent;
  const targetAgentId = llmSuggestedAgent || topicToAgent[normalizedTopic] || topicToAgent[detectedIntent.topic] || 'agent_fallback';
  const targetAgent = agents.find((a: any) => a.id === targetAgentId);
  
  return {
    intent: { ...detectedIntent, reasoning: 'LLM intent detection' },
    access: {
      decision: 'ALLOW',
      reason: 'Access granted by Knowledge Graph',
      userRole: userRole,
      alternatives: []
    },
    allowed: true,
    target: targetAgentId,
    agentEndpoint: targetAgent?.connection?.url || null,
    architecture: { neural: true, symbolic: true, method: 'neuro_symbolic' }
  };
}

// ============================================================================
// OBSERVABILITY: Logging Functions
// ============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

interface LogEntry {
  id?: string;
  timestamp?: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  type: 'ai_request' | 'ai_response' | 'worker_error' | 'access_denied' | 'routing' | 'system';
  agent_id?: string;
  model_id?: string;
  prompt?: string;
  response?: string;
  tokens_input?: number;
  tokens_output?: number;
  latency_ms?: number;
  error_message?: string;
  metadata?: string;
  user_id?: string;
  session_id?: string;
}

async function logRequest(DB: D1Database, entry: LogEntry): Promise<void> {
  try {
    const id = entry.id || generateId();
    const timestamp = entry.timestamp || Math.floor(Date.now() / 1000);
    
    await DB.prepare(`
      INSERT INTO request_logs (
        id, timestamp, level, type, agent_id, model_id, prompt, response,
        tokens_input, tokens_output, latency_ms, error_message, metadata, user_id, session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, timestamp, entry.level, entry.type, entry.agent_id || null,
      entry.model_id || null, entry.prompt || null, entry.response || null,
      entry.tokens_input || null, entry.tokens_output || null, entry.latency_ms || null,
      entry.error_message || null, entry.metadata || null, entry.user_id || null, entry.session_id || null
    ).run();
  } catch (e) {
    console.error('Failed to write log:', e);
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Secret, MCP-Protocol-Version, Accept',
};

// Helper to get routing model from DB or fallback to env/default
async function getRoutingModel(DB: D1Database): Promise<string> {
  try {
    const result = await DB.prepare(`
      SELECT value FROM system_config WHERE key = 'routing_model'
    `).first<{ value: string }>();
    return result?.value || DEFAULT_ROUTING_MODEL;
  } catch (e) {
    return DEFAULT_ROUTING_MODEL;
  }
}

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

    // --- LIST AVAILABLE MODELS ---
    if (request.method === 'GET' && url.pathname === '/v1/models') {
      if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
        return Response.json({ 
          error: 'Cloudflare credentials not configured',
          models: [
            { id: '@cf/meta/llama-3.2-1b-instruct', task: 'text-generation' },
            { id: '@cf/meta/llama-3.2-3b-instruct', task: 'text-generation' },
            { id: '@cf/meta/llama-3.1-8b-instruct', task: 'text-generation' },
            { id: '@cf/google/gemma-2-27b-instruct', task: 'text-generation' },
          ]
        }, { headers: CORS_HEADERS });
      }

      try {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/models/search?per_page=50`,
          {
            headers: {
              'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`
            }
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.result) {
          // Filter and map to simplified format
          const textModels = data.result
            .filter((m: any) => {
              const taskName = m.task?.name?.toLowerCase() || '';
              return taskName.includes('text') || taskName.includes('chat') || 
                m.name?.includes('llama') || m.name?.includes('gemma') || m.name?.includes('mistral');
            })
            .map((m: any) => ({
              id: m.name, // Use 'name' as the model ID (e.g., @cf/meta/llama-3.2-1b-instruct)
              name: m.name,
              task: m.task?.name || 'text-generation',
              description: m.description || ''
            }));
          return Response.json({ models: textModels }, { headers: CORS_HEADERS });
        } else {
          throw new Error(data.errors?.[0]?.message || 'Failed to fetch models');
        }
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
      }
    }

    // --- SAVE MODEL CONFIG ---
    if (request.method === 'POST' && url.pathname === '/v1/config/model') {
      try {
        const body = await request.json();
        const model_id = body.model_id;

        if (!model_id) {
          return Response.json({ error: 'model_id required' }, { status: 400, headers: CORS_HEADERS });
        }

        // Upsert config into D1
        await env.DB.prepare(`
          INSERT INTO system_config (key, value, updated_at)
          VALUES ('routing_model', ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
        `).bind(model_id).run();

        return Response.json({ success: true, model_id }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
      }
    }

    // --- GET MODEL CONFIG ---
    if (request.method === 'GET' && url.pathname === '/v1/config/model') {
      try {
        const result = await env.DB.prepare(`
          SELECT value FROM system_config WHERE key = 'routing_model'
        `).first<{ value: string }>();

        return Response.json({ 
          model_id: result?.value || DEFAULT_ROUTING_MODEL 
        }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ model_id: DEFAULT_ROUTING_MODEL }, { headers: CORS_HEADERS });
      }
    }

    // --- GET NEURO SYMBOLIC CONFIG ---
    if (request.method === 'GET' && url.pathname === '/v1/config/neuro') {
      try {
        const result = await env.DB.prepare(`
          SELECT value FROM system_config WHERE key = 'neuro_symbolic_config'
        `).first<{ value: string }>();

        if (result?.value) {
          return Response.json({ config: JSON.parse(result.value) }, { headers: CORS_HEADERS });
        }
        // Return default config
        return Response.json({ 
          config: {
            enabled: true,
            use_llm_validation: true,
            confidence_threshold: 0.75,
            fallback_to_neural: true,
            knowledge_graph_enabled: true,
            max_path_depth: 5
          }
        }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
      }
    }

    // --- SAVE NEURO SYMBOLIC CONFIG ---
    if (request.method === 'POST' && url.pathname === '/v1/config/neuro') {
      try {
        const body = await request.json();
        const configJson = JSON.stringify(body.config);

        await env.DB.prepare(`
          INSERT INTO system_config (key, value, updated_at)
          VALUES ('neuro_symbolic_config', ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
        `).bind(configJson).run();

        return Response.json({ success: true }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
      }
    }

    // --- GET INTENT RULES ---
    if (request.method === 'GET' && url.pathname === '/v1/rules/intent') {
      try {
        const results = await env.DB.prepare(`
          SELECT * FROM intent_rules ORDER BY priority ASC
        `).all();
        return Response.json({ rules: results.results }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ rules: [], error: e.message }, { headers: CORS_HEADERS });
      }
    }

    // --- SAVE INTENT RULES ---
    if (request.method === 'POST' && url.pathname === '/v1/rules/intent') {
      try {
        const body = await request.json();
        const rules = body.rules || [];
        
        // Clear existing and insert new
        await env.DB.prepare(`DELETE FROM intent_rules`).run();
        
        for (const rule of rules) {
          await env.DB.prepare(`
            INSERT INTO intent_rules (id, pattern, agent_id, priority, enabled)
            VALUES (?, ?, ?, ?, ?)
          `).bind(rule.id, rule.pattern, rule.agent_id, rule.priority, rule.enabled ? 1 : 0).run();
        }
        
        return Response.json({ success: true }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
      }
    }

    // --- GET ACCESS RULES ---
    if (request.method === 'GET' && url.pathname === '/v1/rules/access') {
      try {
        const results = await env.DB.prepare(`
          SELECT * FROM access_rules WHERE enabled = 1
        `).all();
        return Response.json({ rules: results.results }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ rules: [], error: e.message }, { headers: CORS_HEADERS });
      }
    }

    // --- SAVE ACCESS RULES ---
    if (request.method === 'POST' && url.pathname === '/v1/rules/access') {
      try {
        const body = await request.json();
        const rules = body.rules || [];
        
        // Clear existing and insert new
        await env.DB.prepare(`DELETE FROM access_rules`).run();
        
        for (const rule of rules) {
          await env.DB.prepare(`
            INSERT INTO access_rules (id, role, topic, access_level, enabled)
            VALUES (?, ?, ?, ?, ?)
          `).bind(rule.id, rule.role, rule.topic, rule.access_level, rule.enabled ? 1 : 0).run();
        }
        
        return Response.json({ success: true }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
      }
    }

    // ============================================================================
    // OBSERVABILITY: Logs Endpoints
    // ============================================================================

    // --- GET LOGS (with filtering) ---
    if (request.method === 'GET' && url.pathname === '/v1/logs') {
      try {
        const type = url.searchParams.get('type');
        const level = url.searchParams.get('level');
        const agent = url.searchParams.get('agent');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
        const offset = parseInt(url.searchParams.get('offset') || '0');
        
        let query = 'SELECT * FROM request_logs WHERE 1=1';
        const bindings: any[] = [];
        
        if (type) {
          query += ' AND type = ?';
          bindings.push(type);
        }
        if (level) {
          query += ' AND level = ?';
          bindings.push(level);
        }
        if (agent) {
          query += ' AND agent_id = ?';
          bindings.push(agent);
        }
        
        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
        bindings.push(limit, offset);
        
        const result = await env.DB.prepare(query).bind(...bindings).all();
        
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM request_logs WHERE 1=1';
        const countBindings: any[] = [];
        if (type) { countQuery += ' AND type = ?'; countBindings.push(type); }
        if (level) { countQuery += ' AND level = ?'; countBindings.push(level); }
        if (agent) { countQuery += ' AND agent_id = ?'; countBindings.push(agent); }
        
        const countResult = await env.DB.prepare(countQuery).bind(...countBindings).first<{ total: number }>();
        
        return Response.json({
          logs: result.results,
          pagination: {
            total: countResult?.total || 0,
            limit,
            offset,
            has_more: (offset + limit) < (countResult?.total || 0)
          }
        }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
      }
    }

    // --- WRITE LOG (for external logging) ---
    if (request.method === 'POST' && url.pathname === '/v1/logs') {
      try {
        const body = await request.json();
        
        const entry: LogEntry = {
          id: body.id || generateId(),
          timestamp: body.timestamp || Math.floor(Date.now() / 1000),
          level: body.level || 'INFO',
          type: body.type || 'system',
          agent_id: body.agent_id,
          model_id: body.model_id,
          prompt: body.prompt,
          response: body.response,
          tokens_input: body.tokens_input,
          tokens_output: body.tokens_output,
          latency_ms: body.latency_ms,
          error_message: body.error_message,
          metadata: body.metadata ? JSON.stringify(body.metadata) : null,
          user_id: body.user_id,
          session_id: body.session_id
        };
        
        await logRequest(env.DB, entry);
        
        return Response.json({ success: true, id: entry.id }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
      }
    }

    // --- CLEAR LOGS (admin) ---
    if (request.method === 'DELETE' && url.pathname === '/v1/logs') {
      const auth = request.headers.get('X-Agent-Secret');
      if (auth !== env.AGENT_SECRET) {
        return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
      }
      
      try {
        const days = parseInt(url.searchParams.get('days') || '7');
        const cutoff = Math.floor(Date.now() / 1000) - (days * 86400);
        
        await env.DB.prepare('DELETE FROM request_logs WHERE timestamp < ?').bind(cutoff).run();
        
        return Response.json({ success: true, deleted_older_than_days: days }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
      }
    }

    // --- LIST AGENTS ---
    if (request.method === 'GET' && url.pathname === '/v1/agents') {
      const agents = await getAllAgents(env.DB);
      return Response.json({ agents, count: agents.length }, { headers: CORS_HEADERS });
    }

    // --- TEST ROUTING (True Neuro-Symbolic) ---
    if (request.method === 'GET' && url.pathname === '/v1/test') {
      const query = url.searchParams.get('q') || '';
      const userRole = url.searchParams.get('role') || 'EMPLOYEE';
      const agents = await getActiveAgents(env.DB);
      const modelId = await getRoutingModel(env.DB);
      const startTime = Date.now();
      
      // Use TRUE Neuro-Symbolic routing
      const result = await neuroSymbolicRouting(query, agents, env, userRole);
      
      return Response.json({
        query,
        allowed: result.allowed,
        decision: {
          target: result.target,
          confidence: result.intent.confidence,
          reason: result.access.reason
        },
        // Full Neuro-Symbolic architecture info
        intent: result.intent,
        access: result.access,
        architecture: result.architecture,
        model_used: modelId,
        agents_available: agents.map((a: any) => a.id),
        latency_ms: Date.now() - startTime
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

    // --- MCP DISCOVERY ---
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

    // --- A2A DISCOVERY ---
    if (request.method === 'GET' && url.pathname === '/v1/discover-a2a') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) return Response.json({ error: 'Missing url param' }, { status: 400, headers: CORS_HEADERS });
      
      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/a2a+json',
            'Accept': 'application/a2a+json',
            'X-A2A-Version': '1.0',
          },
          body: JSON.stringify({
            protocol: 'a2a/1.0',
            id: crypto.randomUUID(),
            type: 'discovery/query',
            source: 'edgeneuro-orchestrator',
            target: '',
            payload: { task: 'discover', context: {} }
          })
        });
        
        const data = await res.json();
        const a2aSupported = res.ok && (
          data.protocol === 'a2a/1.0' ||
          data.type === 'discovery/response' ||
          (data.capabilities && data.capabilities.some((c: string) => c.startsWith('a2a/')))
        );
        
        return Response.json({
          url: targetUrl,
          a2aSupported,
          agentName: data.agent?.name || data.agent?.id,
          capabilities: data.capabilities || [],
          protocolVersion: data.protocol
        }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ url: targetUrl, error: e.message, a2aSupported: false }, { headers: CORS_HEADERS });
      }
    }

    // --- MCP PROXY ---
    if (url.pathname === '/proxy-mcp') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) return Response.json({ error: 'Missing url param' }, { status: 400, headers: CORS_HEADERS });
      
      const mcpHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      };
      
      const mcpVersion = request.headers.get('MCP-Protocol-Version');
      if (mcpVersion) mcpHeaders['MCP-Protocol-Version'] = mcpVersion;
      
      const auth = request.headers.get('Authorization');
      if (auth) mcpHeaders['Authorization'] = auth;
      
      try {
        const body = await request.text();
        const res = await fetch(targetUrl, { method: 'POST', headers: mcpHeaders, body });
        const data = await res.text();
        
        return new Response(data, {
          status: res.status,
          headers: { ...CORS_HEADERS, 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
        });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
      }
    }

    // --- OAUTH: LIST PROVIDERS ---
    if (request.method === 'GET' && url.pathname === '/v1/oauth/providers') {
      const result = await env.DB.prepare(
        'SELECT id, name, scopes, enabled FROM oauth_providers'
      ).all();
      return Response.json({ providers: result.results || [] }, { headers: CORS_HEADERS });
    }

    // --- OAUTH: CONFIGURE PROVIDER ---
    if (request.method === 'POST' && url.pathname === '/v1/oauth/provider') {
      const auth = request.headers.get('X-Agent-Secret');
      if (auth !== env.AGENT_SECRET)
        return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
      
      try {
        const body = await request.json();
        await env.DB.prepare(`
          INSERT INTO oauth_providers (id, name, client_id, client_secret, auth_url, token_url, userinfo_url, scopes, enabled)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name, client_id = excluded.client_id, client_secret = excluded.client_secret,
            auth_url = excluded.auth_url, token_url = excluded.token_url, userinfo_url = excluded.userinfo_url,
            scopes = excluded.scopes, enabled = excluded.enabled
        `).bind(
          body.id, body.name, body.client_id, body.client_secret || '', body.auth_url,
          body.token_url, body.userinfo_url || '', body.scopes, body.enabled ? 1 : 0
        ).run();
        
        return Response.json({ success: true }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 400, headers: CORS_HEADERS });
      }
    }

    // --- OAUTH: GET LOGIN URL ---
    if (request.method === 'GET' && url.pathname === '/v1/oauth/login') {
      const providerId = url.searchParams.get('provider');
      const redirectUri = url.searchParams.get('redirect_uri');
      
      if (!providerId) return Response.json({ error: 'Missing provider' }, { status: 400, headers: CORS_HEADERS });
      
      const provider = await env.DB.prepare(
        'SELECT * FROM oauth_providers WHERE id = ? AND enabled = 1'
      ).bind(providerId).first() as any;
      
      if (!provider) return Response.json({ error: 'Provider not found or disabled' }, { status: 404, headers: CORS_HEADERS });
      
      const scopes = JSON.parse(provider.scopes || '[]').join(' ');
      const state = crypto.randomUUID();
      
      const authUrl = new URL(provider.auth_url);
      authUrl.searchParams.set('client_id', provider.client_id);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('state', state);
      if (redirectUri) authUrl.searchParams.set('redirect_uri', redirectUri);
      
      return Response.json({ auth_url: authUrl.toString(), state, provider: providerId }, { headers: CORS_HEADERS });
    }

    // --- OAUTH CORS_HEADERS: CALLBACK ---
    if (request.method === 'GET' && url.pathname === '/v1/oauth/callback') {
      const code = url.searchParams.get('code');
      const providerId = url.searchParams.get('provider');
      const error = url.searchParams.get('error');
      
      if (error) return Response.json({ error }, { headers: CORS_HEADERS });
      if (!code || !providerId) return Response.json({ error: 'Missing code or provider' }, { status: 400, headers: CORS_HEADERS });
      
      const provider = await env.DB.prepare('SELECT * FROM oauth_providers WHERE id = ?').bind(providerId).first() as any;
      if (!provider) return Response.json({ error: 'Provider not found' }, { status: 404, headers: CORS_HEADERS });
      
      try {
        const tokenRes = await fetch(provider.token_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code', code,
            client_id: provider.client_id, client_secret: provider.client_secret || '',
          })
        });
        
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) return Response.json({ error: 'Failed to get token', details: tokenData }, { headers: CORS_HEADERS });
        
        let userEmail = '', userName = '', providerUserId = '';
        if (provider.userinfo_url) {
          const userRes = await fetch(provider.userinfo_url, { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } });
          const userData = await userRes.json();
          userEmail = userData.email || userData.mail || '';
          userName = userData.name || userData.displayName || '';
          providerUserId = userData.sub || userData.id || '';
        }
        
        if (!userEmail) return Response.json({ error: 'Could not get user email' }, { headers: CORS_HEADERS });
        
        await env.DB.prepare(`
          INSERT INTO users (id, email, name, provider, provider_id, last_login)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(email) DO UPDATE SET name = excluded.name, provider = excluded.provider, provider_id = excluded.provider_id, last_login = excluded.last_login
        `).bind(crypto.randomUUID(), userEmail, userName, providerId, providerUserId, Math.floor(Date.now() / 1000)).run();
        
        const sessionToken = btoa(JSON.stringify({ email: userEmail, provider: providerId, exp: Date.now() + 86400000 }));
        return Response.json({ token: sessionToken, user: { email: userEmail, name: userName, provider: providerId } }, { headers: CORS_HEADERS });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
      }
    }

    // =========================================================================
    // NEURO-SYMBOLIC ACCESS CONTROL
    // =========================================================================
    // This section implements the SYMBOLIC layer of our neuro-symbolic architecture
    // 
    // PRINCIPLE: Default Deny (Privilege Minimal)
    // - If no explicit permission exists, access is DENIED
    // - This provides deterministic, auditable access decisions
    //
    // NEURAL + SYMBOLIC:
    // - Neural: LLM detects user intent (what they want)
    // - Symbolic: Engine enforces access policy (what they CAN have)
    // =========================================================================

    // --- SYMBOLIC: Get Access Policy (with Knowledge Graph) ---
    if (request.method === 'GET' && url.pathname === '/v1/symbolic/policy') {
      const engine = new SymbolicEngine();
      const kg = engine.getKnowledgeGraph();
      
      return Response.json({
        // Architecture info
        architecture: {
          type: 'NEURO-SYMBOLIC',
          neural_layer: 'LLM Intent Detection (Llama-3)',
          symbolic_layer: 'Knowledge Graph Access Control',
          principle: 'DEFAULT_DENY',
          knowledge_graph: {
            nodes: kg.getStats().nodes,
            edges: kg.getStats().edges,
            roles: kg.getStats().roles,
            topics: kg.getStats().topics
          }
        },
        // Legacy policy (for compatibility)
        policy: engine.getPolicy(),
        aliases: TOPIC_ALIASES,
        description: 'Neuro-symbolic access control using Knowledge Graph. If no path exists in graph from user role to topic, access is DENIED.',
        // Knowledge graph structure
        graph_stats: kg.getStats(),
        roles: kg.getNodesByType('ROLE').map(n => ({ id: n.id, name: n.name })),
        topics: kg.getNodesByType('TOPIC').map(n => ({ id: n.id, name: n.name, sensitivity: n.properties.sensitivity }))
      }, { headers: CORS_HEADERS });
    }

    // --- SYMBOLIC: Query Knowledge Graph ---
    // Direct graph queries for debugging and inspection
    if (request.method === 'GET' && url.pathname === '/v1/symbolic/graph') {
      const role = url.searchParams.get('role');
      const topic = url.searchParams.get('topic');
      const engine = new SymbolicEngine();
      const kg = engine.getKnowledgeGraph();
      
      // If role specified, show what it can access
      if (role) {
        const accessible = kg.queryAccessibleTopics(`role:${role}`);
        return Response.json({
          query: 'accessible_topics',
          role,
          accessible_topics: accessible.map(a => ({
            topic: a.topic,
            access_level: a.level,
            path: a.path.nodes.map(n => n.name).join(' → ')
          }))
        }, { headers: CORS_HEADERS });
      }
      
      // If both specified, query specific access
      if (role && topic) {
        const result = kg.queryAccess(`role:${role}`, `topic:${topic}`);
        return Response.json({
          query: 'access_check',
          role,
          topic,
          has_access: result.paths.length > 0,
          explanation: result.explanation,
          paths: result.paths.map(p => ({
            nodes: p.nodes.map(n => n.name),
            edges: p.edges.map(e => e.type),
            weight: p.totalWeight
          }))
        }, { headers: CORS_HEADERS });
      }
      
      // Otherwise return graph stats
      return Response.json({
        query: 'graph_stats',
        stats: kg.getStats(),
        roles: kg.getNodesByType('ROLE').map(n => ({ id: n.id, name: n.name })),
        topics: kg.getNodesByType('TOPIC').map(n => ({ id: n.id, name: n.name }))
      }, { headers: CORS_HEADERS });
    }

    // =========================================================================
    // NEURO-SYMBOLIC INTENT DETECTION (NEW ARCHITECTURE)
    // =========================================================================
    //
    // ARCHITECTURE:
    // Step 1: SYMBOLIC Intent Detection (Knowledge Graph taxonomy)
    // Step 2: NEURAL Validation (LLM confirms intent)
    // Step 3: SIMPLE Access Control (role-based)
    //
    // This is the CORRECT architecture: Neuro-Symbolic for INTENT, Simple for Access
    // =========================================================================

    // --- NEURO-SYMBOLIC: Intent Detection ---
    if (request.method === 'GET' && url.pathname === '/v1/symbolic/intent') {
      const query = url.searchParams.get('q') || '';
      const userRole = url.searchParams.get('role') || 'EMPLOYEE';
      
      // Step 1: SYMBOLIC - Intent detection using Knowledge Graph taxonomy
      const detector = new SymbolicIntentDetector();
      const context = {
        userId: 'anonymous',
        role: userRole,
        department: '',
        sessionActive: true
      };
      const detected = detector.detect(query, context);
      
      // Step 2: NEURAL - Optional LLM validation (only if low confidence)
      let neuralValidation = null;
      if (env.AI && detected.confidence < 0.9) {
        try {
          const response = await env.AI.run(await getRoutingModel(env.DB), {
            messages: [
              { 
                role: 'system', 
                content: `Validate intent. Query: "${query}". Detected: ${detected.intent}. Reply with JSON: {"valid": true/false, "correct": "INTENT", "confidence": 0.0-1.0}` 
              },
              { role: 'user', content: query }
            ]
          });
          
          const jsonMatch = response.response?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.valid) {
              neuralValidation = {
                validated: true,
                intent: parsed.correct || detected.intent,
                confidence: parsed.confidence
              };
            }
          }
        } catch (e) {
          // Continue with symbolic detection
        }
      }
      
      // Use validated intent if available
      const finalIntent = neuralValidation?.intent || detected.intent;
      const finalConfidence = neuralValidation?.confidence || detected.confidence;
      
      // Step 3: SIMPLE Access Control - Role-based
      const roleCategories: Record<string, string[]> = {
        'IT_ADMIN': ['IT', 'SECURITY', 'ENGINEERING', 'GENERAL'],
        'HR_ADMIN': ['HR', 'GENERAL'],
        'SALES': ['SALES', 'GENERAL'],
        'MARKETING': ['MARKETING', 'SALES', 'GENERAL'],
        'FINANCE': ['FINANCE', 'GENERAL'],
        'ENGINEERING': ['ENGINEERING', 'IT', 'GENERAL'],
        'ADMIN': ['IT', 'HR', 'SALES', 'FINANCE', 'MARKETING', 'ENGINEERING', 'SECURITY', 'GENERAL'],
        'EMPLOYEE': ['IT', 'HR', 'GENERAL'],
        'CONTRACTOR': ['IT', 'GENERAL']
      };
      
      const allowedCategories = roleCategories[userRole] || ['IT', 'GENERAL'];
      const canAccess = allowedCategories.includes(detected.category);
      
      return Response.json({
        architecture: {
          description: 'Neuro-Symbolic Intent Detection + Simple Access Control',
          step1_symbolic: {
            component: 'Knowledge Graph Intent Taxonomy',
            intents: detector.getStats().total,
            output: detected
          },
          step2_neural: {
            component: 'LLM Validation (optional)',
            model: await getRoutingModel(env.DB),
            output: neuralValidation || 'skipped (high confidence)'
          },
          step3_simple_access: {
            component: 'Role-Based Access',
            userRole,
            category: detected.category,
            canAccess,
            allowedCategories
          }
        },
        
        // Result
        query,
        intent: finalIntent,
        confidence: finalConfidence,
        category: detected.category,
        allowed: canAccess,
        
        metadata: {
          taxonomy_stats: detector.getStats(),
          timestamp: new Date().toISOString()
        }
        
      }, { headers: CORS_HEADERS });
    }

    // --- SYMBOLIC: Evaluate Access (Pure Symbolic) ---
    if (request.method === 'POST' && url.pathname === '/v1/symbolic/evaluate') {
      try {
        const body = await request.json();
        const { topic, userRole, userGroups } = body;
        
        if (!topic || !userRole) {
          return Response.json({ 
            error: 'Missing required fields: topic, userRole' 
          }, { status: 400, headers: CORS_HEADERS });
        }
        
        const engine = new SymbolicEngine();
        const userProfile = {
          userId: 'anonymous',
          email: '',
          role: userRole,
          department: '',
          groups: userGroups || []
        };
        
        const decision = engine.evaluateAccess(topic, userProfile);
        
        return Response.json({
          ...decision,
          // Include alternatives for UX
          alternatives: decision.alternatives.slice(0, 5)
        }, { headers: CORS_HEADERS });
        
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 400, headers: CORS_HEADERS });
      }
    }

    // --- SYMBOLIC: Full Neuro-Symbolic Routing ---
    // This combines LLM intent detection (NEURAL) with policy enforcement (SYMBOLIC)
    if (request.method === 'GET' && url.pathname === '/v1/symbolic/route') {
      const query = url.searchParams.get('q') || '';
      const userRole = url.searchParams.get('role') || 'EMPLOYEE';
      const userGroups = url.searchParams.get('groups')?.split(',') || [];
      
      // Step 1: NEURAL - Detect intent using LLM
      let intent = {
        topic: 'GENERAL_SUPPORT',
        confidence: 0.5,
        reasoning: 'Fallback - no LLM'
      };
      
      if (env.AI) {
        try {
          const response = await env.AI.run(await getRoutingModel(env.DB), {
            messages: [
              { 
                role: 'system', 
                content: `You are an intent classifier. Classify the user query into one of these topics: PAYROLL, BENEFITS, VACATIONS, PERFORMANCE_REVIEWS, FINANCE_DASHBOARD, BUDGET, EXPENSES, INVOICES, SALES_REPORTS, CUSTOMER_DATA, PIPELINE, IT_TICKETS, IT_HARDWARE, IT_VPN, IT_SECURITY, ENGINEERING_WIKI, CODE_REPOS, INFRASTRUCTURE, MARKETING_CAMPAIGNS, MARKETING_ANALYTICS, BRAND_ASSETS, HR_POLICIES, COMPANY_DIRECTORY, ANNOUNCEMENTS, ONBOARDING, ADMIN_PANEL, GENERAL_SUPPORT. Reply with JSON: {"topic": "TOPIC", "confidence": 0.0-1.0, "reasoning": "brief explanation"}` 
              },
              { role: 'user', content: query }
            ]
          });
          
          const jsonMatch = response.response?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            intent = {
              topic: parsed.topic || 'GENERAL_SUPPORT',
              confidence: parsed.confidence || 0.5,
              reasoning: parsed.reasoning || 'LLM classification'
            };
          }
        } catch (e: any) {
          intent.reasoning = `LLM error: ${e.message}`;
        }
      }
      
      // Step 2: SYMBOLIC - Evaluate access policy
      const engine = new SymbolicEngine();
      const userProfile = {
        userId: 'anonymous',
        email: '',
        role: userRole,
        department: '',
        groups: userGroups
      };
      
      const access = engine.evaluateAccess(intent.topic, userProfile);
      
      // Step 3: Build response
      const agents = await getActiveAgents(env.DB);
      const agentMapping: Record<string, string> = {};
      for (const agent of agents) {
        // Map topics based on agent name/type
        const name = agent.name?.toLowerCase() || '';
        if (name.includes('hr')) agentMapping['BENEFITS'] = agent.id;
        if (name.includes('it')) agentMapping['IT_TICKETS'] = agent.id;
        if (name.includes('sql') || name.includes('data')) agentMapping['SALES_REPORTS'] = agent.id;
      }
      agentMapping['GENERAL_SUPPORT'] = agents[0]?.id || 'agent_fallback';
      
      const target = access.decision === 'ALLOW' 
        ? (agentMapping[access.topic] || agentMapping['GENERAL_SUPPORT'])
        : null;
      
      return Response.json({
        // Neuro-Symbolic architecture info
        architecture: {
          neural: {
            component: 'LLM Intent Detection',
            model: await getRoutingModel(env.DB),
            output: intent
          },
          symbolic: {
            component: 'Knowledge Graph Access Engine',
            principle: 'DEFAULT_DENY',
            knowledge_graph: {
              nodes: engine.getStats().nodes,
              edges: engine.getStats().edges
            },
            output: {
              decision: access.decision,
              reason: access.reason,
              graph_reasoning: access.graphReasoning || 'No path found in knowledge graph',
              auditId: access.auditId
            }
          }
        },
        
        // Access decision
        allowed: access.decision === 'ALLOW',
        target,
        
        // For denied requests - UX suggestions
        ...(access.decision === 'DENY' && {
          alternatives: access.alternatives.slice(0, 5),
          suggestions: [
            `Your role (${userRole}) does not have access to ${access.topic}`,
            'You can access: ' + access.alternatives.slice(0, 3).join(', '),
            'Contact your manager to request access'
          ]
        }),
        
        // Metadata
        query,
        userRole,
        resolvedTopic: access.topic,
        timestamp: new Date().toISOString()
        
      }, { headers: CORS_HEADERS });
    }

    // --- ROUTING --- (Main entry point - True Neuro-Symbolic)
    const query = url.searchParams.get('q');
    const userRole = url.searchParams.get('role') || 'EMPLOYEE';
    if (!query) return new Response('EdgeNeuro SynapseCore Active', { status: 200, headers: CORS_HEADERS });

    const agents = await getActiveAgents(env.DB);
    const startTime = Date.now();
    
    // Use TRUE Neuro-Symbolic routing
    const routingResult = await neuroSymbolicRouting(query, agents, env, userRole);
    
    // Log the routing decision
    await logRequest(env.DB, {
      level: routingResult.allowed ? 'INFO' : 'WARN',
      type: routingResult.allowed ? 'routing' : 'access_denied',
      prompt: query,
      response: JSON.stringify(routingResult),
      agent_id: routingResult.target,
      latency_ms: Date.now() - startTime
    });

    const traceId = crypto.randomUUID();
    
    // If access DENIED - return error with alternatives
    if (!routingResult.allowed) {
      return Response.json(
        {
          type: 'access_denied',
          decision: {
            target: null,
            confidence: 0,
            reason: 'Access DENIED by Knowledge Graph'
          },
          architecture: routingResult.architecture,
          access: routingResult.access,
          trace_id: traceId,
          _debug: {
            intent: routingResult.intent,
            latency_ms: Date.now() - startTime
          }
        },
        { status: 403, headers: { ...CORS_HEADERS, 'X-A2A-Trace-Id': traceId } }
      );
    }

    // Access ALLOWED - route to agent
    const targetAgent = agents.find((a: any) => a.id === routingResult.target) || agents[0] || { 
      id: 'agent_fallback', connection: { url: 'https://support.internal', auth_strategy: 'none' } 
    };

    return Response.json(
      {
        type: 'a2a/connect',
        target: { id: targetAgent.id, endpoint: targetAgent.connection.url, auth_headers: { 'X-Guest': 'true' } },
        trace_id: traceId,
        // Full Neuro-Symbolic debug info
        _debug: {
          intent: routingResult.intent,
          access: routingResult.access,
          architecture: routingResult.architecture,
          model_used: await getRoutingModel(env.DB),
          latency_ms: Date.now() - startTime
        }
      },
      { headers: { ...CORS_HEADERS, 'X-A2A-Version': '1.0', 'X-A2A-Trace-Id': traceId } },
    );
  },
};
