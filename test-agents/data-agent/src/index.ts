/**
 * Data Agent Worker (agent_data)
 * 
 * Per spec-skill-003-data.md:
 * - Purpose: Execute read-only SQL queries and retrieve dashboard links
 * - Intent Triggers: sql_query, report_lookup
 * - MCP Tools: run_snowflake_query, search_tableau
 * - Security: Read-only, no INSERT/UPDATE/DELETE/DROP, PII filtering required
 * 
 * Deploy with: npx wrangler deploy
 */

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // MCP endpoint (spec-compliant)
    if (url.pathname === '/mcp' && request.method === 'POST') {
      const body = await request.json() as { method?: string; params?: Record<string, unknown> };
      
      // Handle MCP initialize
      if (body.method === 'initialize') {
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            capabilities: { 
              tools: {
                run_snowflake_query: {
                  description: 'Execute read-only SQL query against Snowflake',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      sql_safe: { type: 'string', description: 'SQL query (read-only)' }
                    },
                    required: ['sql_safe']
                  }
                },
                search_tableau: {
                  description: 'Search Tableau dashboards by keyword',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      keyword: { type: 'string', description: 'Search term' }
                    },
                    required: ['keyword']
                  }
                }
              }
            },
            protocolVersion: '2025-11-25',
            serverInfo: {
              name: 'EdgeNeuro Data Agent',
              version: '1.0.0'
            }
          }
        }), {
          headers: {
            'Content-Type': 'application/json',
            'MCP-Session-Id': crypto.randomUUID()
          }
        });
      }

      // Handle tool calls
      if (body.method === 'tools/call') {
        const toolName = (body.params as { name?: string })?.name;
        
        // Security: Block write operations
        const sqlParam = (body.params as { arguments?: { sql_safe?: string } })?.arguments?.sql_safe || '';
        const blockedKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE'];
        const sqlUpper = sqlParam.toUpperCase();
        
        if (blockedKeywords.some(kw => sqlUpper.includes(kw))) {
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            error: {
              code: -32000,
              message: 'Security violation: Only read-only queries are allowed'
            }
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Mock responses for POC
        if (toolName === 'run_snowflake_query') {
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {
              rows: [
                { quarter: 'Q4', revenue: 1250000, deals_closed: 47 },
                { quarter: 'Q3', revenue: 1180000, deals_closed: 42 }
              ],
              metadata: { rowCount: 2, queryTime: '0.23s' }
            }
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (toolName === 'search_tableau') {
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {
              dashboards: [
                { name: 'Q4 Sales Dashboard', url: 'https://tableau.internal/views/q4-sales' },
                { name: 'Revenue by Region', url: 'https://tableau.internal/views/revenue-region' }
              ]
            }
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Default MCP response
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { acknowledged: true }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Simple response for direct access
    return new Response(JSON.stringify({
      agent: 'Data Analytics',
      agentId: 'agent_data',
      response: 'I can help you query sales data, generate reports, and find dashboards.',
      capabilities: ['sql_query', 'report_lookup', 'dashboard_search'],
      spec: 'spec-skill-003-data.md'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
