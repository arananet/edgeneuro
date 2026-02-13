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

  const loadAgents = () => {
    setLoading(true)
    fetch(`${ORCHESTRATOR_URL}/v1/agents`)
      .then(res => res.json())
      .then(data => setAgents(data.agents || []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAgents()
  }, [])

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
                <input
                  className="form-input"
                  value={formData.id}
                  onChange={e => setFormData({...formData, id: e.target.value})}
                  placeholder="agent_hr"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  className="form-input"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="HR Assistant"
                  required
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Endpoint URL</label>
                <input
                  className="form-input"
                  value={formData.url}
                  onChange={e => setFormData({...formData, url: e.target.value})}
                  placeholder="https://agent.example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Auth Strategy</label>
                <select
                  className="form-select"
                  value={formData.auth_strategy}
                  onChange={e => setFormData({...formData, auth_strategy: e.target.value})}
                >
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Intent Triggers (comma separated)</label>
                <input
                  className="form-input"
                  value={formData.triggers}
                  onChange={e => setFormData({...formData, triggers: e.target.value})}
                  placeholder="vacation, pto, benefits"
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Handles HR queries..."
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success" style={{ marginTop: '10px' }}>
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
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id}>
                  <td><code>{agent.id}</code></td>
                  <td>{agent.name}</td>
                  <td><code style={{ fontSize: '12px' }}>{agent.connection.url}</code></td>
                  <td>{(agent.intent_triggers || []).slice(0, 3).join(', ')}</td>
                  <td><span className="badge badge-success">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
