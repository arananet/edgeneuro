import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

// Realistic sample data - in production this would come from the API
const latencyData = [
  { time: '00:00', p50: 45, p95: 78, p99: 120 },
  { time: '02:00', p50: 42, p95: 72, p99: 110 },
  { time: '04:00', p50: 38, p95: 65, p99: 95 },
  { time: '06:00', p50: 52, p95: 88, p99: 145 },
  { time: '08:00', p55: 75, p95: 120, p99: 180 },
  { time: '10:00', p50: 62, p95: 105, p99: 160 },
  { time: '12:00', p50: 58, p95: 98, p99: 150 },
  { time: '14:00', p50: 65, p95: 110, p99: 170 },
  { time: '16:00', p50: 72, p95: 125, p99: 190 },
  { time: '18:00', p50: 68, p95: 115, p99: 175 },
  { time: '20:00', p50: 55, p95: 92, p99: 140 },
  { time: '22:00', p50: 48, p95: 82, p99: 125 },
]

const accuracyData = [
  { date: 'Mon', accuracy: 94.2, samples: 1247 },
  { date: 'Tue', accuracy: 95.1, samples: 1582 },
  { date: 'Wed', accuracy: 93.8, samples: 1395 },
  { date: 'Thu', accuracy: 96.2, samples: 1723 },
  { date: 'Fri', accuracy: 95.5, samples: 1658 },
  { date: 'Sat', accuracy: 94.8, samples: 892 },
  { date: 'Sun', accuracy: 93.2, samples: 654 },
]

const intentDistribution = [
  { intent: 'HR Leave', count: 342 },
  { intent: 'IT VPN', count: 287 },
  { intent: 'Benefits', count: 198 },
  { intent: 'Payroll', count: 156 },
  { intent: 'IT Hardware', count: 134 },
  { intent: 'Other', count: 89 },
]

// Simulated agent data - would come from backend
const agentPerformance = [
  { 
    agent: 'agent_hr', 
    requests: 1234, 
    avgLatency: '42ms', 
    successRate: 99.5, 
    topIntent: 'Leave Request',
    errors: 6 
  },
  { 
    agent: 'agent_it', 
    requests: 2567, 
    avgLatency: '38ms', 
    successRate: 99.8, 
    topIntent: 'VPN Issue',
    errors: 5 
  },
  { 
    agent: 'agent_finance', 
    requests: 892, 
    avgLatency: '55ms', 
    successRate: 98.2, 
    topIntent: 'Invoice',
    errors: 16 
  },
  { 
    agent: 'agent_fallback', 
    requests: 156, 
    avgLatency: '25ms', 
    successRate: 100, 
    topIntent: 'General',
    errors: 0 
  },
]

export default function Evaluation() {
  const [activeTab, setActiveTab] = useState<'latency' | 'accuracy' | 'intents'>('latency')
  const [loading, setLoading] = useState(false)

  // Calculate stats
  const avgLatency = Math.round(latencyData.reduce((a, b) => a + b.p50, 0) / latencyData.length)
  const avgAccuracy = (accuracyData.reduce((a, b) => a + b.accuracy, 0) / accuracyData.length).toFixed(1)
  const totalRequests = agentPerformance.reduce((a, b) => a + b.requests, 0)
  const totalErrors = agentPerformance.reduce((a, b) => a + b.errors, 0)
  const errorRate = ((totalErrors / totalRequests) * 100).toFixed(2)
  const uptime = (99.9).toFixed(1)

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{avgAccuracy}%</div>
          <div className="stat-label">Routing Accuracy</div>
          <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Last 7 days</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgLatency}ms</div>
          <div className="stat-label">Avg Latency (p50)</div>
          <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Median</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalRequests.toLocaleString()}</div>
          <div className="stat-label">Total Requests</div>
          <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Last 24h</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: parseFloat(errorRate) > 1 ? '#dc3545' : '#28a745' }}>
            {errorRate}%
          </div>
          <div className="stat-label">Error Rate</div>
          <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>{totalErrors} errors</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📈 Performance Metrics</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className={activeTab === 'latency' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setActiveTab('latency')}
            >
              Latency
            </button>
            <button
              className={activeTab === 'accuracy' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setActiveTab('accuracy')}
            >
              Accuracy
            </button>
            <button
              className={activeTab === 'intents' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setActiveTab('intents')}
            >
              Intents
            </button>
          </div>
        </div>

        {activeTab === 'latency' && (
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line type="monotone" dataKey="p50" stroke="#28a745" name="p50" strokeWidth={2} />
                <Line type="monotone" dataKey="p95" stroke="#0066cc" name="p95" strokeWidth={2} />
                <Line type="monotone" dataKey="p99" stroke="#dc3545" name="p99" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '20px', marginTop: '10px', justifyContent: 'center' }}>
              <span style={{ color: '#28a745' }}>● p50 (median)</span>
              <span style={{ color: '#0066cc' }}>● p95</span>
              <span style={{ color: '#dc3545' }}>● p99</span>
            </div>
          </div>
        )}

        {activeTab === 'accuracy' && (
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[90, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="#0066cc" strokeWidth={2} dot={{ fill: '#0066cc' }} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', marginTop: '10px', color: '#666', fontSize: '12px' }}>
              Daily routing accuracy based on {accuracyData.reduce((a, b) => a + b.samples, 0).toLocaleString()} total samples
            </div>
          </div>
        )}

        {activeTab === 'intents' && (
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intentDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="intent" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#0066cc" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🤖 Agent Performance</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Requests</th>
              <th>Avg Latency</th>
              <th>Success Rate</th>
              <th>Errors</th>
              <th>Top Intent</th>
            </tr>
          </thead>
          <tbody>
            {agentPerformance.map(agent => (
              <tr key={agent.agent}>
                <td><code>{agent.agent}</code></td>
                <td>{agent.requests.toLocaleString()}</td>
                <td>{agent.avgLatency}</td>
                <td>
                  <span className={`badge ${agent.successRate >= 99 ? 'badge-success' : agent.successRate >= 95 ? '' : 'badge-success'}`}
                    style={{ background: agent.successRate >= 99 ? '#d4edda' : agent.successRate >= 95 ? '#fff3cd' : '#f8d7da' }}
                  >
                    {agent.successRate}%
                  </span>
                </td>
                <td style={{ color: agent.errors > 0 ? '#dc3545' : 'inherit' }}>{agent.errors}</td>
                <td>{agent.topIntent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">⚠️ Recent Errors</h3>
        </div>
        <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '6px', textAlign: 'center', color: '#666' }}>
          <p>No recent errors to display.</p>
          <p style={{ fontSize: '12px', color: '#999' }}>
            Error logs are retained for 24 hours. Connect to your logging backend to view real-time errors.
          </p>
        </div>
      </div>
    </div>
  )
}
