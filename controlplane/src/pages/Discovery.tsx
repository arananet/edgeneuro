import { useState, useEffect } from 'react'

interface DiscoveredAgent {
  url: string
  name?: string
  a2aSupported?: boolean
  capabilities?: string[]
  discoveredAt?: string
  status?: 'pending' | 'approved' | 'rejected'
  error?: string
}

const ORCHESTRATOR_URL = 'https://edgeneuro-synapse-core.info-693.workers.dev'

export default function Discovery() {
  const [url, setUrl] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [history, setHistory] = useState<DiscoveredAgent[]>([])

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('a2a_discovery_history')
    if (saved) setHistory(JSON.parse(saved))
  }, [])

  const saveHistory = (agents: DiscoveredAgent[]) => {
    localStorage.setItem('a2a_discovery_history', JSON.stringify(agents))
    setHistory(agents)
  }

  const discoverA2A = async () => {
    if (!url) return
    setDiscovering(true)
    setResult(null)
    
    try {
      // Test A2A endpoint - send a discovery request
      // A2A uses JSON over HTTP/WebSocket
      const res = await fetch(url, {
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
          source: 'edgeneuro-controlplane',
          target: '',
          payload: {
            task: 'discover',
            context: {}
          }
        })
      })
      
      const text = await res.text()
      let data: any
      
      try {
        data = JSON.parse(text)
      } catch {
        // If not JSON, try plain HTTP response
        data = { raw: text }
      }
      
      // Check if A2A supported
      const a2aSupported = res.ok && (
        data.protocol === 'a2a/1.0' || 
        data.type === 'discovery/response' ||
        data.capabilities?.some((c: string) => c.startsWith('a2a/'))
      )
      
      const capabilities = data.capabilities || []
      
      const newResult: DiscoveredAgent = {
        url,
        name: data.agent?.name || data.agent?.id || 'Unknown',
        a2aSupported,
        capabilities,
        discoveredAt: new Date().toISOString(),
        status: a2aSupported ? 'pending' : undefined,
        error: a2aSupported ? undefined : 'A2A protocol not detected'
      }
      
      setResult(newResult)
      
      // Add to history
      const updated = [newResult, ...history].slice(0, 20)
      saveHistory(updated)
    } catch (e: any) {
      const errorResult = {
        url,
        error: e.message,
        a2aSupported: false,
        discoveredAt: new Date().toISOString(),
      }
      setResult(errorResult)
      const updated = [errorResult, ...history].slice(0, 20)
      saveHistory(updated)
    }
    
    setDiscovering(false)
  }

  const discoverViaOrchestrator = async () => {
    if (!url) return
    setDiscovering(true)
    setResult(null)
    
    try {
      // Use orchestrator to discover A2A agents
      const res = await fetch(`${ORCHESTRATOR_URL}/v1/discover-a2a?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      setResult(data)
      
      if (data.a2aSupported) {
        const newResult: DiscoveredAgent = {
          url,
          name: data.agentName,
          a2aSupported: true,
          capabilities: data.capabilities,
          discoveredAt: new Date().toISOString(),
          status: 'pending'
        }
        const updated = [newResult, ...history].slice(0, 20)
        saveHistory(updated)
      }
    } catch (e: any) {
      setResult({ error: e.message })
    }
    
    setDiscovering(false)
  }

  const handleRegister = async (agent: DiscoveredAgent) => {
    const agentId = `a2a_${Date.now()}`
    const name = agent.name || 'Discovered A2A Agent'
    
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
          description: `Auto-discovered A2A agent at ${agent.url}`,
          connection: {
            protocol: 'a2a',
            url: agent.url,
            auth_strategy: 'bearer'
          },
          capabilities: agent.capabilities || ['a2a/chat'],
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
          <h3 className="card-title">A2A Agent Discovery</h3>
        </div>
        
        <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
          Discover A2A-compatible agents. Agents can also discover this orchestrator and request registration via A2A protocol.
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://agent.example.com/a2a"
          />
          <button 
            className="btn btn-primary" 
            onClick={discoverA2A}
            disabled={discovering || !url}
          >
            {discovering ? 'Discovering...' : 'Discover A2A'}
          </button>
        </div>

        {result && (
          <div style={{ 
            padding: '15px', 
            borderRadius: '6px',
            background: result.error ? '#f8d7da' : result.a2aSupported ? '#d4edda' : '#fff3cd',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 10px' }}>
              {result.error ? 'Error' : result.a2aSupported ? 'A2A Supported' : 'Not A2A'}
            </h4>
            
            {result.error ? (
              <p style={{ margin: 0, color: '#721c24' }}>{result.error}</p>
            ) : (
              <>
                {result.name && <p style={{ margin: '0 0 5px' }}><strong>Agent:</strong> {result.name}</p>}
                
                {result.capabilities && result.capabilities.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Capabilities:</strong>
                    <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '13px' }}>
                      {result.capabilities.map((cap: string) => (
                        <li key={cap}>{cap}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {result.a2aSupported && (
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
                <th>Name</th>
                <th>A2A</th>
                <th>Discovered</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((agent, idx) => (
                <tr key={idx}>
                  <td><code style={{ fontSize: '11px' }}>{agent.url}</code></td>
                  <td>{agent.name || '-'}</td>
                  <td>
                    {agent.a2aSupported ? (
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
                    ) : agent.a2aSupported ? (
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        onClick={() => handleRegister(agent)}
                      >
                        Register
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#666' }}>-</span>
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
