/**
 * EdgeNeuro Configurator
 * MCP Client & A2A Protocol Validator
 * 
 * Validates that agents are properly configured for:
 * 1. MCP Streamable HTTP transport
 * 2. A2A handoff protocol
 */

export interface ValidationResult {
  passed: boolean;
  checks: CheckResult[];
  timestamp: string;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

/**
 * MCP Client Validator
 * Tests if an agent properly implements MCP Streamable HTTP
 */
export async function validateMCPClient(url: string, auth?: Record<string, string>): Promise<CheckResult> {
  const checks: CheckResult[] = [];
  
  try {
    // 1. Test initialize endpoint
    const initResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2025-11-25',
        ...auth
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: { tools: {} },
          clientInfo: { name: 'EdgeNeuro-Configurator', version: '1.0.0' }
        }
      })
    });

    // Check response
    if (!initResponse.ok) {
      return {
        name: 'MCP Initialize',
        passed: false,
        message: `HTTP ${initResponse.status}: ${initResponse.statusText}`,
        details: await initResponse.text()
      };
    }

    // Check for session ID
    const sessionId = initResponse.headers.get('mcp-session-id');
    const contentType = initResponse.headers.get('content-type');

    // Validate protocol version header
    const protocolVersion = initResponse.headers.get('mcp-protocol-version');

    checks.push({
      name: 'MCP Endpoint',
      passed: true,
      message: 'MCP endpoint responds'
    });

    checks.push({
      name: 'MCP Session',
      passed: !!sessionId,
      message: sessionId ? 'Session established' : 'Stateless mode (no session)'
    });

    checks.push({
      name: 'MCP Protocol Version',
      passed: !!protocolVersion || contentType?.includes('application/json'),
      message: protocolVersion || 'Using default protocol'
    });

    // Try tools/list if session established
    if (sessionId) {
      const toolsResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'MCP-Session-Id': sessionId,
          ...auth
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list'
        })
      });

      if (toolsResponse.ok) {
        const data = await toolsResponse.json();
        checks.push({
          name: 'MCP Tools List',
          passed: true,
          message: `Found ${data.result?.tools?.length || 0} tools`,
          details: data.result?.tools
        });
      }
    }

    const allPassed = checks.every(c => c.passed);
    return {
      name: 'MCP Validation',
      passed: allPassed,
      message: allPassed ? 'MCP client valid' : 'Some checks failed',
      details: checks
    };

  } catch (e: any) {
    return {
      name: 'MCP Connection',
      passed: false,
      message: `Connection failed: ${e.message}`,
      details: e.stack
    };
  }
}

/**
 * A2A Protocol Validator
 * Tests if the orchestrator properly returns A2A handoff responses
 */
export async function validateA2AProtocol(
  routerUrl: string, 
  query: string, 
  expectedAgent?: string
): Promise<CheckResult> {
  const checks: CheckResult[] = [];

  try {
    // 1. Send query to router
    const response = await fetch(`${routerUrl}?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      return {
        name: 'A2A Router',
        passed: false,
        message: `Router error: ${response.status}`,
        details: await response.text()
      };
    }

    const data = await response.json();

    // 2. Validate A2A response structure
    checks.push({
      name: 'A2A Response Type',
      passed: data.type === 'a2a/connect',
      message: `Type is "${data.type}"${data.type === 'a2a/connect' ? '' : ' - expected a2a/connect'}`
    });

    checks.push({
      name: 'A2A Target',
      passed: !!data.target?.id,
      message: data.target?.id ? `Target: ${data.target.id}` : 'No target specified'
    });

    checks.push({
      name: 'A2A Endpoint',
      passed: !!data.target?.endpoint,
      message: data.target?.endpoint ? 'Endpoint provided' : 'No endpoint provided'
    });

    checks.push({
      name: 'A2A Trace ID',
      passed: !!data.trace_id,
      message: data.trace_id ? `Trace: ${data.trace_id}` : 'No trace ID'
    });

    // 3. Validate target agent if specified
    if (expectedAgent && data.target?.id !== expectedAgent) {
      checks.push({
        name: 'A2A Routing',
        passed: false,
        message: `Expected ${expectedAgent}, got ${data.target?.id}`
      });
    }

    // 4. Test endpoint connectivity
    if (data.target?.endpoint) {
      try {
        const endpointResponse = await fetch(data.target.endpoint, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        checks.push({
          name: 'Agent Endpoint',
          passed: endpointResponse.ok || endpointResponse.status === 401,
          message: endpointResponse.ok ? 'Agent reachable' : `Agent responded ${endpointResponse.status}`
        });
      } catch (e: any) {
        checks.push({
          name: 'Agent Endpoint',
          passed: false,
          message: `Cannot reach agent: ${e.message}`
        });
      }
    }

    const allPassed = checks.every(c => c.passed);
    return {
      name: 'A2A Validation',
      passed: allPassed,
      message: allPassed ? 'A2A protocol valid' : 'Some checks failed',
      details: checks
    };

  } catch (e: any) {
    return {
      name: 'A2A Test',
      passed: false,
      message: `Test failed: ${e.message}`,
      details: e.stack
    };
  }
}

/**
 * Full Orchestration Test
 * Tests the complete flow: Router -> Agent
 */
export async function testOrchestration(
  routerUrl: string,
  agentUrl: string,
  query: string
): Promise<ValidationResult> {
  const checks: CheckResult[] = [];
  const timestamp = new Date().toISOString();

  // Step 1: Route the query
  const routeResult = await validateA2AProtocol(routerUrl, query);
  checks.push(routeResult);

  // Step 2: If routed, validate the agent MCP
  if (routeResult.passed && routeResult.details) {
    const targetEndpoint = routeResult.details.find((c: any) => c.name === 'A2A Endpoint');
    if (targetEndpoint?.message !== 'No endpoint provided') {
      const mcpResult = await validateMCPClient(agentUrl);
      checks.push(mcpResult);
    }
  }

  const allPassed = checks.every(c => c.passed);
  return {
    passed: allPassed,
    checks,
    timestamp
  };
}

/**
 * Configuration Validator
 * Validates agent configuration JSON
 */
export function validateAgentConfig(config: any): ValidationResult {
  const checks: CheckResult[] = [];
  const timestamp = new Date().toISOString();

  // Required fields
  const requiredFields = ['id', 'name', 'connection'];
  
  for (const field of requiredFields) {
    checks.push({
      name: `Config.${field}`,
      passed: !!config[field],
      message: config[field] ? `${field}: ${config[field]}` : `${field} is required`
    });
  }

  // Connection fields
  if (config.connection) {
    checks.push({
      name: 'Connection.protocol',
      passed: ['http', 'streamable-http', 'websocket'].includes(config.connection.protocol),
      message: `Protocol: ${config.connection.protocol}`
    });

    checks.push({
      name: 'Connection.url',
      passed: !!config.connection.url && config.connection.url.startsWith('http'),
      message: `URL: ${config.connection.url || 'missing'}`
    });

    checks.push({
      name: 'Connection.auth_strategy',
      passed: ['bearer', 'api_key', 'none'].includes(config.connection.auth_strategy),
      message: `Auth: ${config.connection.auth_strategy || 'missing'}`
    });
  }

  // Intent triggers
  checks.push({
    name: 'Config.intent_triggers',
    passed: Array.isArray(config.intent_triggers) && config.intent_triggers.length > 0,
    message: `Triggers: ${config.intent_triggers?.length || 0} defined`
  });

  const allPassed = checks.every(c => c.passed);
  return {
    passed: allPassed,
    checks,
    timestamp
  };
}

// CLI runner
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'mcp') {
    validateMCPClient(args[1]).then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.passed ? 0 : 1);
    });
  } else if (command === 'a2a') {
    validateA2AProtocol(args[1], args[2]).then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.passed ? 0 : 1);
    });
  } else if (command === 'config') {
    const config = JSON.parse(require('fs').readFileSync(args[1], 'utf8'));
    const result = validateAgentConfig(config);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.passed ? 0 : 1);
  } else {
    console.log('Usage:');
    console.log('  node configurator.js mcp <url>');
    console.log('  node configurator.js a2a <router-url> <query>');
    console.log('  node configurator.js config <agent-json-file>');
  }
}
