import { useState, useEffect } from 'react'

interface Agent {
  id: string
  name: string
  description?: string
  connection: {
    protocol: string
    url: string
    auth_strategy: string
  }
  capabilities?: string[]
  intent_triggers?: string[]
  approved?: boolean
  discovered_at?: string
}

const ORCHESTRATOR_URL = 'https://edgeneuro-synapse-core.info-693.workers.dev'
const AGENT_SECRET = 'potato123'

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    url: '',
    auth_strategy: 'bearer',
    triggers: ''
  })
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  const loadAgents = () => {
    setLoading(true)
    fetch(`${ORCHESTRATOR_URL}/v1/agents`)
      .then(res => res.json())
      .then(data => {
        // Parse JSON fields from D1
        const agents = (data.agents || []).map((a: any) => ({
          ...a,
          intent_triggers: typeof a.intent_triggers === 'string' 
            ? JSON.parse(a.intent_triggers) 
            : a.intent_triggers || [],
          capabilities: typeof a.capabilities === 'string' 
            ? JSON.parse(a.capabilities) 
            : a.capabilities || [],
          connection: typeof a.connection === 'string' 
            ? JSON.parse(a.connection) 
            : a.connection || {}
        }))
        setAgents(agents)
      })
      .catch(() => setAgents([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAgents()
  }, [])

  const handleApprove = async (agentId: string) => {
    await fetch(`${ORCHESTRATOR_URL}/v1/agent/approve?id=${agentId}`, {
      headers: { 'X-Agent-Secret': AGENT_SECRET }
    })
    loadAgents()
  }

  const handleDiscover = async (url: string) => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/v1/discover?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      setTestResult({ type: 'discovery', success: data.mcpSupported, data })
    } catch (e: any) {
      setTestResult({ type: 'discovery', success: false, error: e.message })
    }
    setTesting(false)
  }

  const handleTestAuth = async () => {
    if (!formData.url) {
      setTestResult({ type: 'auth', success: false, error: 'Enter URL first' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(formData.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(formData.auth_strategy === 'bearer' ? { 'Authorization': 'Bearer test-token' } : {}),
          ...(formData.auth_strategy === 'api_key' ? { 'X-API-Key': 'test-key' } : {})
        },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'initialize',
          params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'EdgeNeuro-Test', version: '1.0.0' } }
        })
      })
      const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }))
      setTestResult({ 
        type: 'auth', 
        success: res.ok || !!data.result,
        status: res.status,
        data
      })
    } catch (e: any) {
      setTestResult({ type: 'auth', success: false, error: e.message })
    }
    setTesting(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const agent = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      connection: {
        protocol: 'http',
        url: formData.url,
        auth_strategy: formData.auth_strategy
      },
      capabilities: [],
      intent_triggers: formData.triggers.split(',').map(t => t.trim()).filter(Boolean)
    }

    await fetch(`${ORCHESTRATOR_URL}/v1/agent/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Secret': AGENT_SECRET
      },
      body: JSON.stringify(agent)
    })

    setShowForm(false)
    setFormData({ id: '', name: '', description: '', url: '', auth_strategy: 'bearer', triggers: '' })
    setTestResult(null)
    loadAgents()
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Registered Agents</h3>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Agent'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '15px', background: 'var(--background)', borderRadius: '6px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label className="form-label">Agent ID</label>
                <input className="form-input" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} placeholder="agent_hr" required />
              </div>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="HR Assistant" required />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Endpoint URL</label>
                <input className="form-input" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://agent.example.com/mcp" />
              </div>
              <div className="form-group">
                <label className="form-label">Auth Strategy</label>
                <select className="form-select" value={formData.auth_strategy} onChange={e => setFormData({...formData, auth_strategy: e.target.value})}>
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Intent Triggers</label>
                <input className="form-input" value={formData.triggers} onChange={e => setFormData({...formData, triggers: e.target.value})} placeholder="vacation, pto, benefits" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Description</label>
                <input className="form-input" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Handles HR queries..." />
              </div>
            </div>
            
            {/* Test Before Save */}
            <div style={{ marginTop: '15px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={handleTestAuth}
                  disabled={testing || !formData.url}
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                <span style={{ fontSize: '12px', color: '#666' }}>Test endpoint and auth before saving</span>
              </div>
              
              {testResult && (
                <div style={{ 
                  padding: '10px', 
                  borderRadius: '4px',
                  background: testResult.success ? '#d4edda' : '#f8d7da',
                  color: testResult.success ? '#155724' : '#721c24',
                  fontSize: '12px'
                }}>
                  <strong>{testResult.type === 'discovery' ? 'MCP Discovery' : 'Auth Test'}:</strong> {testResult.success ? 'SUCCESS' : 'FAILED'}
                  {testResult.error && <p style={{ margin: '5px 0 0' }}>{testResult.error}</p>}
                  {testResult.status && <p style={{ margin: '5px 0 0' }}>Status: {testResult.status}</p>}
                  {testResult.data && <pre style={{ margin: '5px 0 0', fontSize: '10px', overflow: 'auto' }}>{JSON.stringify(testResult.data, null, 2)}</pre>}
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-success" style={{ marginTop: '10px' }} disabled={testResult && !testResult.success}>
              Register Agent
            </button>
          </form>
        )}

        {loading ? (
          <p>Loading...</p>
        ) : agents.length === 0 ? (
          <p>No agents registered. Click "Add Agent" to register one.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Endpoint</th>
                <th>Triggers</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id}>
                  <td><code>{agent.id}</code></td>
                  <td>{agent.name}</td>
                  <td><code style={{ fontSize: '11px' }}>{agent.connection?.url || '-'}</code></td>
                  <td>{(agent.intent_triggers || []).slice(0, 3).join(', ')}</td>
                  <td>
                    {agent.approved ? (
                      <span className="badge badge-success">Approved</span>
                    ) : (
                      <span className="badge" style={{ background: '#fff3cd', color: '#856404' }}>Pending</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {agent.connection?.url && (
                        <button 
                          onClick={() => handleDiscover(agent.connection.url)}
                          style={{ padding: '4px 8px', fontSize: '11px', background: '#e9ecef', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Discover
                        </button>
                      )}
                      {!agent.approved && (
                        <button 
                          onClick={() => handleApprove(agent.id)}
                          style={{ padding: '4px 8px', fontSize: '11px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                      )}
                    </div>
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
