import { useState } from 'react'

const ORCHESTRATOR_URL = 'https://edgeneuro-synapse-core.info-693.workers.dev'

export default function Testing() {
  const [testType, setTestType] = useState<'a2a' | 'mcp' | 'jwt'>('a2a')
  const [a2aQuery, setA2aQuery] = useState('')
  const [mcpUrl, setMcpUrl] = useState('')
  const [mcpToken, setMcpToken] = useState('')
  const [mcpAuth, setMcpAuth] = useState<'none' | 'bearer' | 'oauth2'>('none')
  const [jwtToken, setJwtToken] = useState('')
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
      
      const res = await fetch(proxyUrl, { method: 'POST', headers, body })
      
      const contentType = res.headers.get('content-type') || ''
      const text = await res.text()
      
      let data: any
      
      if (contentType.includes('text/event-stream') || text.startsWith('event:')) {
        const jsonMatch = text.match(/data:\s*(\{[\s\S]*\})/)
        if (jsonMatch) {
          try { data = JSON.parse(jsonMatch[1]) } catch { data = { raw: text, format: 'sse' } }
        } else {
          data = { raw: text, format: 'sse' }
        }
      } else {
        try { data = JSON.parse(text) } catch { data = { raw: text, error: 'Invalid JSON', contentType } }
      }
      
      setResult({ status: res.status, contentType, ...data })
    } catch (e: any) {
      setResult({ error: e.message, hint: 'Check URL and auth settings' })
    }
    setLoading(false)
  }

  const analyzeJWT = () => {
    if (!jwtToken) return
    
    try {
      const parts = jwtToken.split('.')
      if (parts.length !== 3) {
        setResult({ error: 'Invalid JWT format - expected 3 parts separated by dots' })
        return
      }
      
      // Decode header
      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')))
      
      // Decode payload
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      
      // Check expiration
      const now = Math.floor(Date.now() / 1000)
      let expirationStatus = 'unknown'
      if (payload.exp) {
        expirationStatus = payload.exp < now ? 'EXPIRED' : 'VALID'
      }
      
      // Check issued at
      let issuedStatus = 'unknown'
      if (payload.iat) {
        issuedStatus = new Date(payload.iat * 1000).toISOString()
      }
      
      setResult({
        valid: true,
        header: {
          alg: header.alg,
          typ: header.typ,
          ...(header.kid && { kid: header.kid })
        },
        payload: {
          iss: payload.iss,
          sub: payload.sub,
          aud: payload.aud,
          exp: payload.exp ? new Date(payload.expirationStatus === 'EXPIRED' ? payload.exp * 1000 : payload.exp * 1000).toISOString() : null,
          iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
          ...(payload.nbf && { nbf: new Date(payload.nbf * 1000).toISOString() }),
          ...(payload.jti && { jti: payload.jti }),
          // Add custom claims
          ...Object.fromEntries(Object.entries(payload).filter(([k]) => !['iss', 'sub', 'aud', 'exp', 'iat', 'nbf', 'jti', 'alg', 'typ', 'kid'].includes(k)))
        },
        expirationStatus,
        issuedAt: issuedStatus,
        signature: parts[2].substring(0, 20) + '...'
      })
    } catch (e: any) {
      setResult({ error: e.message, hint: 'Make sure the JWT is properly formatted' })
    }
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Test Type</h3>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={testType === 'a2a' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTestType('a2a')}>A2A Protocol</button>
          <button className={testType === 'mcp' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTestType('mcp')}>MCP Server</button>
          <button className={testType === 'jwt' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTestType('jwt')}>JWT Token</button>
        </div>
      </div>

      {testType === 'a2a' && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">A2A Protocol Test</h3></div>
          <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>Test the routing logic by sending a query to the orchestrator.</p>
          <div className="form-group">
            <label className="form-label">Test Query</label>
            <input className="form-input" value={a2aQuery} onChange={e => setA2aQuery(e.target.value)} placeholder="I need help with vacation" />
          </div>
          <button className="btn btn-primary" onClick={testA2A} disabled={loading || !a2aQuery}>{loading ? 'Testing...' : 'Test Routing'}</button>
        </div>
      )}

      {testType === 'mcp' && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">MCP Server Test</h3></div>
          <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>Test remote MCP server as an MCP client. Uses proxy to bypass CORS.</p>
          <div className="form-group">
            <label className="form-label">MCP Server URL</label>
            <input className="form-input" value={mcpUrl} onChange={e => setMcpUrl(e.target.value)} placeholder="https://mcp.example.com/mcp" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label className="form-label">Auth Type</label>
              <select className="form-select" value={mcpAuth} onChange={e => setMcpAuth(e.target.value as any)}>
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="oauth2">OAuth 2.0</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Token</label>
              <input type="password" className="form-input" value={mcpToken} onChange={e => setMcpToken(e.target.value)} placeholder={mcpAuth === 'none' ? 'Not needed' : 'Enter token...'} disabled={mcpAuth === 'none'} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={testMCP} disabled={loading || !mcpUrl}>{loading ? 'Testing...' : 'Test MCP Server'}</button>
        </div>
      )}

      {testType === 'jwt' && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">JWT Token Analyzer</h3></div>
          <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>Paste a JWT token to decode and analyze its contents.</p>
          <div className="form-group">
            <label className="form-label">JWT Token</label>
            <textarea className="form-input" style={{ minHeight: '100px', fontFamily: 'monospace', fontSize: '12px' }} value={jwtToken} onChange={e => setJwtToken(e.target.value)} placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" />
          </div>
          <button className="btn btn-primary" onClick={analyzeJWT} disabled={!jwtToken}>Analyze Token</button>
        </div>
      )}

      {result && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Result</h3></div>
          <pre className={`test-result ${result.error ? 'test-error' : result.valid ? 'test-success' : ''}`}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
