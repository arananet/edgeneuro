import { useState, useEffect } from 'react'

interface HealthStatus {
  status: string
  bindings: { kv: boolean; ai: boolean; synapse: boolean }
}

// Use environment variable with fallback for development
const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL || 'https://edgeneuro-synapse-core.info-693.workers.dev'

export default function Dashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${ORCHESTRATOR_URL}/health`)
      .then(res => res.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'error', bindings: { kv: false, ai: false, synapse: false } }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: health?.status === 'ok' ? 'var(--success)' : 'var(--error)' }}>
            {loading ? '...' : health?.status === 'ok' ? 'Online' : 'Offline'}
          </div>
          <div className="stat-label">Orchestrator Status</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{health?.bindings?.kv ? '✓' : '✗'}</div>
          <div className="stat-label">KV Store</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{health?.bindings?.ai ? '✓' : '✗'}</div>
          <div className="stat-label">Workers AI</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{health?.bindings?.synapse ? '✓' : '✗'}</div>
          <div className="stat-label">Durable Objects</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/agents" className="btn btn-primary">Manage Agents</a>
          <a href="/testing" className="btn btn-secondary">Run Tests</a>
          <a href="/evaluation" className="btn btn-secondary">View Metrics</a>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">About EdgeNeuro</h3>
        </div>
        <p>
          EdgeNeuro is an enterprise-grade serverless intent detection router. 
          It uses the "Hot Potato" pattern to route requests to specialized agents 
          with minimal latency.
        </p>
        <p style={{ marginTop: '10px' }}>
          <strong>Architecture:</strong> Stateless edge workers with A2A protocol for agent handoff.
        </p>
      </div>
    </div>
  )
}
