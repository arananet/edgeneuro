import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const mockLatencyData = [
  { time: '00:00', p50: 45, p95: 78, p99: 120 },
  { time: '04:00', p50: 42, p95: 72, p99: 110 },
  { time: '08:00', p50: 55, p95: 95, p99: 150 },
  { time: '12:00', p50: 48, p95: 82, p99: 130 },
  { time: '16:00', p50: 52, p95: 88, p99: 140 },
  { time: '20:00', p50: 44, p75: 76, p99: 115 },
]

const mockAccuracyData = [
  { date: 'Mon', accuracy: 94.2 },
  { date: 'Tue', accuracy: 95.1 },
  { date: 'Wed', accuracy: 93.8 },
  { date: 'Thu', accuracy: 96.2 },
  { date: 'Fri', accuracy: 95.5 },
]

export default function Evaluation() {
  const [activeTab, setActiveTab] = useState<'latency' | 'accuracy'>('latency')

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">95.2%</div>
          <div className="stat-label">Routing Accuracy</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">48ms</div>
          <div className="stat-label">Avg Latency (p50)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">99.8%</div>
          <div className="stat-label">Uptime</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">0.1%</div>
          <div className="stat-label">Error Rate</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Metrics</h3>
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
          </div>
        </div>

        {activeTab === 'latency' && (
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockLatencyData}>
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
              <span style={{ color: '#28a745' }}>● p50</span>
              <span style={{ color: '#0066cc' }}>● p95</span>
              <span style={{ color: '#dc3545' }}>● p99</span>
            </div>
          </div>
        )}

        {activeTab === 'accuracy' && (
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockAccuracyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[90, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="#0066cc" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Agent Performance</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Requests</th>
              <th>Avg Latency</th>
              <th>Success Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>agent_hr</td>
              <td>1,234</td>
              <td>42ms</td>
              <td><span className="badge badge-success">99.5%</span></td>
            </tr>
            <tr>
              <td>agent_it</td>
              <td>2,567</td>
              <td>38ms</td>
              <td><span className="badge badge-success">99.8%</span></td>
            </tr>
            <tr>
              <td>agent_fallback</td>
              <td>156</td>
              <td>25ms</td>
              <td><span className="badge badge-success">100%</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
