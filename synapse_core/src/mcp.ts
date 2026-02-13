// synapse_core/src/mcp.ts
// MCP Client - Streamable HTTP Transport (Official Spec 2025-11-25)

export interface MCPConfig {
  url: string;
  auth?: {
    type: 'bearer' | 'api_key' | 'mtls';
    token?: string;
    key?: string;
    cert?: string;
  };
  capabilities?: {
    resources?: boolean;
    prompts?: boolean;
    tools?: boolean;
    sampling?: boolean;
  };
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  connection: {
    protocol: 'http' | 'streamable-http';
    url: string;
    auth_strategy: 'bearer' | 'api_key' | 'none';
  };
  mcp?: MCPConfig;
  capabilities: string[];
  intent_triggers: string[];
}

export class MCPClient {
  baseUrl: string;
  headers: Record<string, string>;
  sessionId?: string;
  protocolVersion: string = '2025-11-25';
  serverCapabilities?: Record<string, unknown>;

  constructor(url: string, headers: Record<string, string> = {}) {
    this.baseUrl = url.replace(/\/$/, '');
    this.headers = headers;
  }

  /**
   * Initialize connection with the MCP Server
   * Per spec: Client sends InitializeRequest, Server responds with InitializeResult
   */
  async connect(): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': this.protocolVersion,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: this.protocolVersion,
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          clientInfo: { name: 'EdgeNeuro-SynapseCore', version: '1.0.0' },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP Init Failed: ${response.status} ${response.statusText}`);
    }

    // Handle SSE stream response
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      return this.handleSSE(response);
    }

    // Handle JSON response
    const json = await response.json();
    
    // Capture Session ID
    const sessionId = response.headers.get('mcp-session-id');
    if (sessionId) {
      this.sessionId = sessionId;
    }

    if (json.error) {
      throw new Error(json.error.message);
    }

    this.serverCapabilities = json.result?.capabilities || {};
    return json.result;
  }

  /**
   * Handle Server-Sent Events for streaming responses
   */
  private async handleSSE(response: Response): Promise<unknown> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let _eventId = '';

    if (!reader) {
      throw new Error('No response body');
    }

    try {
      let shouldContinue = true;
      while (shouldContinue) {
        const { done, value } = await reader.read();
        if (done) {
          shouldContinue = false;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('id:')) {
            _eventId = line.substring(3).trim();
          } else if (line.startsWith('data:')) {
            const data = line.substring(5).trim();
            try {
              const json = JSON.parse(data);
              if (json.id === 1) {
                // Initialize response
                this.serverCapabilities = json.result?.capabilities || {};
                return json.result;
              }
              return json;
            } catch (e) {
              // Ignore parse errors for non-JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Send a JSON-RPC request
   */
  private async sendRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.sessionId) {
      await this.connect();
    }

    const requestHeaders: Record<string, string> = {
      ...this.headers,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': this.protocolVersion,
    };

    if (this.sessionId) {
      requestHeaders['MCP-Session-Id'] = this.sessionId;
    }

    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method,
        params,
      }),
    });

    // Handle 404 - session expired
    if (response.status === 404 && this.sessionId) {
      this.sessionId = undefined;
      return this.sendRequest(method, params); // Retry with new session
    }

    // Handle 400 - bad request
    if (response.status === 400) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Bad Request');
    }

    if (!response.ok) {
      throw new Error(`MCP Request Failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      return this.handleSSE(response);
    }

    return response.json();
  }

  /**
   * Execute Tool via MCP
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return this.sendRequest('tools/call', { name, arguments: args });
  }

  /**
   * List available tools
   */
  async listTools(): Promise<unknown[]> {
    const response = await this.sendRequest('tools/list', {});
    return response.result?.tools || [];
  }

  /**
   * List available resources
   */
  async listResources(): Promise<unknown[]> {
    const response = await this.sendRequest('resources/list', {});
    return response.result?.resources || [];
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<unknown> {
    return this.sendRequest('resources/read', { uri });
  }

  /**
   * Ping to keepalive
   */
  async ping(): Promise<void> {
    await this.sendRequest('ping', {});
  }
}

/**
 * MCP Configurator - Loads agent configurations from JSON
 */
export class MCPConfigurator {
  private agents: Map<string, AgentConfig> = new Map();

  /**
   * Load agents from JSON configuration
   */
  loadFromJSON(config: AgentConfig[]): void {
    this.agents.clear();
    for (const agent of config) {
      this.agents.set(agent.id, agent);
    }
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): AgentConfig | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  /**
   * Find agents matching an intent
   */
  findByIntent(intent: string): AgentConfig[] {
    const intentLower = intent.toLowerCase();
    return this.getAllAgents().filter(agent =>
      agent.intent_triggers.some(trigger => 
        intentLower.includes(trigger.toLowerCase())
      )
    );
  }

  /**
   * Create MCP client for an agent
   */
  createClient(agentId: string): MCPClient | null {
    const agent = this.getAgent(agentId);
    if (!agent || !agent.mcp) return null;

    const headers: Record<string, string> = {};
    
    if (agent.connection.auth_strategy === 'bearer' && agent.mcp.auth?.token) {
      headers['Authorization'] = `Bearer ${agent.mcp.auth.token}`;
    } else if (agent.connection.auth_strategy === 'api_key' && agent.mcp.auth?.token) {
      headers['X-API-Key'] = agent.mcp.auth.token;
    }

    return new MCPClient(agent.mcp.url, headers);
  }
}

// Default configuration schema for enterprise use
export const DEFAULT_AGENT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Unique agent identifier' },
    name: { type: 'string', description: 'Human-readable agent name' },
    description: { type: 'string', description: 'Agent capability description' },
    connection: {
      type: 'object',
      properties: {
        protocol: { type: 'string', enum: ['http', 'streamable-http'] },
        url: { type: 'string', format: 'uri' },
        auth_strategy: { type: 'string', enum: ['bearer', 'api_key', 'none'] },
      },
      required: ['protocol', 'url'],
    },
    mcp: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri' },
        auth: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['bearer', 'api_key', 'mtls'] },
            token: { type: 'string' },
          },
        },
      },
    },
    capabilities: {
      type: 'array',
      items: { type: 'string' },
    },
    intent_triggers: {
      type: 'array',
      items: { type: 'string' },
      description: 'Keywords that trigger this agent',
    },
  },
  required: ['id', 'name', 'connection', 'capabilities'],
};
