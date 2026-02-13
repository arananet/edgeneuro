import { useState, useEffect } from 'react'

interface DiscoveredAgent {
  url: string
  name?: string
  capabilities?: any
  mcpSupported?: boolean
  discoveredAt?: string
  status?: 'pending' | 'approved' | 'rejected'
}

const ORCHESTRATOR_URL = 'https://edgeneuro-synapse-core.info-693.workers.dev'

export default function Discovery() {
  const [url, setUrl] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [history, setHistory] = useState<DiscoveredAgent[]>([])

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('discovery_history')
    if (saved) setHistory(JSON.parse(saved))
  }, [])

  const saveHistory = (agents: DiscoveredAgent[]) => {
    localStorage.setItem('discovery_history', JSON.stringify(agents))
    setHistory(agents)
  }

  const handleDiscover = async () => {
    if (!url) return
    setDiscovering(true)
    setResult(null)
    
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/v1/discover?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      
      const newResult: DiscoveredAgent = {
        url,
        mcpSupported: data.mcpSupported,
        capabilities: data.capabilities,
        discoveredAt: new Date().toISOString(),
        status: 'pending'
      }
      
      setResult(newResult)
      
      // Add to history
      const updated = [newResult, ...history].slice(0, 20)
      saveHistory(updated)
    } catch (e: any) {
      setResult({ error: e.message, mcpSupported: false })
    }
    
    setDiscovering(false)
  }

  const handleRegister = async (agent: DiscoveredAgent) => {
    const agentId = `auto_${Date.now()}`
    const name = agent.capabilities?.serverInfo?.name || 'Discovered Agent'
    
    try {
      await fetch(`${ORCHESTRATOR_URL}/v1/agent/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Secret': 'potato123'
        },
        body: JSON.stringify({
          id: agentId,
          name,
          description: `Auto-discovered agent at ${agent.url}`,
          connection: {
            protocol: 'http',
            url: agent.url,
            auth_strategy: 'none'
          },
          capabilities: Object.keys(agent.capabilities || {}),
          intent_triggers: [],
          approved: true
        })
      })
      
      // Update history
      const updated = history.map(h => 
        h.url === agent.url ? { ...h, status: 'approved' as const } : h
      )
      saveHistory(updated)
      setResult({ ...agent, status: 'approved', message: 'Registered!' })
    } catch (e: any) {
      setResult({ error: e.message })
    }
  }

  const clearHistory = () => {
    saveHistory([])
    setResult(null)
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Auto-Discovery</h3>
        </div>
        
        <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
          Probe an MCP endpoint to discover its capabilities. Agents can also discover this orchestrator and request registration.
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://mcp-agent.example.com/mcp"
          />
          <button 
            className="btn btn-primary" 
            onClick={handleDiscover}
            disabled={discovering || !url}
          >
            {discovering ? 'Discovering...' : 'Discover'}
          </button>
        </div>

        {result && (
          <div style={{ 
            padding: '15px', 
            borderRadius: '6px',
            background: result.error ? '#f8d7da' : result.mcpSupported ? '#d4edda' : '#fff3cd',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 10px' }}>
              {result.error ? 'Error' : result.mcpSupported ? 'MCP Supported' : 'Not MCP'}
            </h4>
            
            {result.error ? (
              <p style={{ margin: 0, color: '#721c24' }}>{result.error}</p>
            ) : (
              <>
                <p style={{ margin: '0 0 10px' }}>
                  <strong>Protocol:</strong> {result.capabilities?.protocolVersion || 'Unknown'}
                </p>
                
                {result.capabilities && (
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Capabilities:</strong>
                    <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '13px' }}>
                      {Object.keys(result.capabilities).map(cap => (
                        <li key={cap}>{cap}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {result.mcpSupported && (
                  <button 
                    className="btn btn-success"
                    onClick={() => handleRegister(result)}
                    disabled={result.status === 'approved'}
                  >
                    {result.status === 'approved' ? 'Registered' : 'Register Agent'}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Discovery History</h3>
          <button className="btn btn-secondary" onClick={clearHistory} style={{ fontSize: '12px' }}>
            Clear
          </button>
        </div>

        {history.length === 0 ? (
          <p>No discovery history yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>URL</th>
                <th>MCP</th>
                <th>Discovered</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((agent, idx) => (
                <tr key={idx}>
                  <td><code style={{ fontSize: '11px' }}>{agent.url}</code></td>
                  <td>
                    {agent.mcpSupported ? (
                      <span className="badge badge-success">Yes</span>
                    ) : (
                      <span className="badge" style={{ background: '#f8d7da', color: '#721c24' }}>No</span>
                    )}
                  </td>
                  <td style={{ fontSize: '12px', color: '#666' }}>
                    {agent.discoveredAt ? new Date(agent.discoveredAt).toLocaleString() : '-'}
                  </td>
                  <td>
                    {agent.status === 'approved' ? (
                      <span className="badge badge-success">Registered</span>
                    ) : agent.status === 'rejected' ? (
                      <span className="badge" style={{ background: '#f8d7da', color: '#721c24' }}>Rejected</span>
                    ) : (
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        onClick={() => handleRegister(agent)}
                      >
                        Register
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
