// synapse_core/src/mcp.ts
// Minimal MCP Client (HTTP SSE Transport)

export class MCPClient {
  baseUrl: string;
  headers: Record<string, string>;

  constructor(url: string, headers: Record<string, string>) {
    this.baseUrl = url.replace(/\/$/, ''); // Remove trailing slash
    this.headers = headers;
  }

  /**
   * Discovers tools exposed by the agent via MCP.
   */
  async getCapabilities(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/mcp/capabilities`, {
        method: 'GET',
        headers: { ...this.headers, 'Accept': 'application/json' }
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return (data.tools || []).map((t: any) => t.name);
    } catch (e) {
      // Fallback: If MCP endpoint fails, assume no dynamic tools
      return [];
    }
  }

  /**
   * Calls a read-only tool on the agent (e.g., status check).
   */
  async callTool(name: string, args: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/mcp/tools/call`, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, arguments: args })
    });
    
    if (!response.ok) throw new Error(`MCP Tool Call Failed: ${name}`);
    return response.json();
  }
}
