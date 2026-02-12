// synapse_core/src/mcp.ts
// MCP Client - Streamable HTTP Transport (Official Spec)

export class MCPClient {
  baseUrl: string;
  headers: Record<string, string>;
  sessionId?: string;

  constructor(url: string, headers: Record<string, string>) {
    this.baseUrl = url.replace(/\/$/, '');
    this.headers = headers;
  }

  /**
   * Handshake: POST InitializeRequest -> Get Session ID
   */
  async connect(): Promise<void> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: { 
        ...this.headers, 
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "EdgeNeuro-Synapse", version: "1.0.0" }
        }
      })
    });

    if (!response.ok) throw new Error(`MCP Init Failed: ${response.status}`);

    // Capture Session ID (Spec requirement)
    const sessionId = response.headers.get('Mcp-Session-Id');
    if (sessionId) this.sessionId = sessionId;

    // We ignore the body for now, as we assume success
  }

  /**
   * Execute Tool via POST (Stateless or Stateful if sessionId present)
   */
  async callTool(name: string, args: any): Promise<any> {
    if (!this.sessionId) await this.connect();

    const requestHeaders = { 
      ...this.headers, 
      'Content-Type': 'application/json' 
    };
    
    if (this.sessionId) {
      requestHeaders['Mcp-Session-Id'] = this.sessionId;
    }

    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/call",
        params: { name, arguments: args }
      })
    });

    if (!response.ok) throw new Error(`Tool Call Failed: ${response.status}`);
    
    const json = await response.json();
    if (json.error) throw new Error(json.error.message);
    
    return json.result;
  }

  /**
   * Discover capabilities (via tools/list)
   */
  async getCapabilities(): Promise<string[]> {
    if (!this.sessionId) await this.connect();

    const requestHeaders = { ...this.headers, 'Content-Type': 'application/json' };
    if (this.sessionId) requestHeaders['Mcp-Session-Id'] = this.sessionId;

    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/list"
      })
    });

    if (!response.ok) return [];
    
    const json = await response.json();
    return (json.result?.tools || []).map((t: any) => t.name);
  }
}
