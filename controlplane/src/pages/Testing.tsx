import { useState } from 'react'

const ORCHESTRATOR_URL = 'https://edgeneuro-synapse-core.info-693.workers.dev'

export default function Testing() {
  const [testType, setTestType] = useState<'a2a' | 'mcp'>('a2a')
  const [a2aQuery, setA2aQuery] = useState('')
  const [mcpUrl, setMcpUrl] = useState('')
  const [mcpToken, setMcpToken] = useState('')
  const [mcpAuth, setMcpAuth] = useState<'none' | 'bearer' | 'oauth2'>('none')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testA2A = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/v1/test?q=${encodeURIComponent(a2aQuery)}`)
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setResult({ error: e.message })
    }
    setLoading(false)
  }

  const testMCP = async () => {
    if (!mcpUrl) return
    
    setLoading(true)
    setResult(null)
    
    try {
      // Use proxy to bypass CORS
      const proxyUrl = `${ORCHESTRATOR_URL}/proxy-mcp?url=${encodeURIComponent(mcpUrl)}`
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2025-11-25',
      }
      
      if (mcpAuth === 'bearer' || mcpAuth === 'oauth2') {
        headers['Authorization'] = `Bearer ${mcpToken}`
      }
      
      const body = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: { tools: {} },
          clientInfo: { name: 'EdgeNeuro-ControlPlane', version: '1.0.0' }
        }
      })
      
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers,
        body
      })
      
      const contentType = res.headers.get('content-type') || ''
      const text = await res.text()
      
      let data: any
      
      // Handle SSE (Server-Sent Events) or JSON
      if (contentType.includes('text/event-stream') || text.startsWith('event:')) {
        // Parse SSE: "event: message\ndata: {...}\n\n"
        const jsonMatch = text.match(/data:\s*(\{[\s\S]*\})/)
        if (jsonMatch) {
          try {
            data = JSON.parse(jsonMatch[1])
          } catch {
            data = { raw: text, format: 'sse' }
          }
        } else {
          data = { raw: text, format: 'sse' }
        }
      } else {
        // Try JSON response
        try {
          data = JSON.parse(text)
        } catch {
          data = { raw: text, error: 'Invalid JSON', contentType }
        }
      }
      
      setResult({
        status: res.status,
        contentType,
        ...data
      })
    } catch (e: any) {
      setResult({ error: e.message, hint: 'Check URL and auth settings' })
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Test Type</h3>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={testType === 'a2a' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setTestType('a2a')}
          >
            A2A Protocol
          </button>
          <button
            className={testType === 'mcp' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setTestType('mcp')}
          >
            MCP Server
          </button>
        </div>
      </div>

      {testType === 'a2a' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">A2A Protocol Test</h3>
          </div>
          <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
            Test the routing logic by sending a query to the orchestrator.
          </p>
          <div className="form-group">
            <label className="form-label">Test Query</label>
            <input
              className="form-input"
              value={a2aQuery}
              onChange={e => setA2aQuery(e.target.value)}
              placeholder="I need help with vacation"
            />
          </div>
          <button className="btn btn-primary" onClick={testA2A} disabled={loading || !a2aQuery}>
            {loading ? 'Testing...' : 'Test Routing'}
          </button>
        </div>
      )}

      {testType === 'mcp' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">MCP Server Test</h3>
          </div>
          <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
            Test remote MCP server as an MCP client. Uses proxy to bypass CORS.
          </p>
          
          <div className="form-group">
            <label className="form-label">MCP Server URL</label>
            <input
              className="form-input"
              value={mcpUrl}
              onChange={e => setMcpUrl(e.target.value)}
              placeholder="https://mcp.example.com/mcp"
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label className="form-label">Auth Type</label>
              <select 
                className="form-select"
                value={mcpAuth}
                onChange={e => setMcpAuth(e.target.value as any)}
              >
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="oauth2">OAuth 2.0</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Token</label>
              <input
                type="password"
                className="form-input"
                value={mcpToken}
                onChange={e => setMcpToken(e.target.value)}
                placeholder={mcpAuth === 'none' ? 'Not needed' : 'Enter token...'}
                disabled={mcpAuth === 'none'}
              />
            </div>
          </div>
          
          <button className="btn btn-primary" onClick={testMCP} disabled={loading || !mcpUrl}>
            {loading ? 'Testing...' : 'Test MCP Server'}
          </button>
        </div>
      )}

      {result && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Result</h3>
          </div>
          <pre className={`test-result ${result.error ? 'test-error' : 'test-success'}`}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
