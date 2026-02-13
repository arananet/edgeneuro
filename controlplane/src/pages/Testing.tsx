import { useState } from 'react'

const ORCHESTRATOR_URL = 'https://edgeneuro-synapse-core.info-693.workers.dev'

export default function Testing() {
  const [testType, setTestType] = useState<'a2a' | 'mcp'>('a2a')
  const [a2aQuery, setA2aQuery] = useState('')
  const [mcpUrl, setMcpUrl] = useState('')
  const [mcpSecret, setMcpSecret] = useState('potato123')
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
    setLoading(true)
    setResult(null)
    try {
      const proxyUrl = `${ORCHESTRATOR_URL}/proxy-mcp?url=${encodeURIComponent(mcpUrl)}`
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'MCP-Protocol-Version': '2025-11-25',
          'X-Agent-Secret': mcpSecret
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: { tools: {} },
            clientInfo: { name: 'EdgeNeuro-Test', version: '1.0.0' }
          }
        })
      })
      
      const contentType = res.headers.get('content-type') || ''
      let data: any
      
      if (contentType.includes('text/event-stream')) {
        // Handle SSE response
        const text = await res.text()
        // Parse SSE format: "data: {...}\n\n"
        const lines = text.split('\n')
        let jsonStr = ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            jsonStr = line.slice(6)
            break
          }
        }
        try {
          data = JSON.parse(jsonStr)
        } catch {
          data = { raw: text, format: 'sse' }
        }
      } else {
        // Handle JSON response
        const text = await res.text()
        try {
          data = JSON.parse(text)
        } catch {
          data = { raw: text, error: 'Invalid JSON' }
        }
      }
      
      setResult({
        status: res.status,
        contentType,
        ...data
      })
    } catch (e: any) {
      setResult({ error: e.message })
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
            MCP Client
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
            <h3 className="card-title">MCP Client Test</h3>
          </div>
          <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
            Test an MCP server endpoint (proxied through orchestrator). Supports both JSON and SSE responses.
          </p>
          <div className="form-group">
            <label className="form-label">MCP Endpoint URL</label>
            <input
              className="form-input"
              value={mcpUrl}
              onChange={e => setMcpUrl(e.target.value)}
              placeholder="https://mcp.example.com/mcp"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Agent Secret</label>
            <input
              type="password"
              className="form-input"
              value={mcpSecret}
              onChange={e => setMcpSecret(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={testMCP} disabled={loading || !mcpUrl}>
            {loading ? 'Testing...' : 'Test MCP'}
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
