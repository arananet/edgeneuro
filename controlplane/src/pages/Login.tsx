import { useState, useEffect, FormEvent } from 'react'

interface LoginProps {
  onLogin: (token: string, user: string) => void
}

const ORCHESTRATOR_URL = 'https://edgeneuro-synapse-core.info-693.workers.dev'

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthProviders, setOauthProviders] = useState<{id: string, name: string}[]>([])

  useEffect(() => {
    // Load OAuth providers
    fetch(`${ORCHESTRATOR_URL}/v1/oauth/providers`)
      .then(res => res.json())
      .then(data => setOauthProviders(data.providers || []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const users: Record<string, string> = {
      'admin': 'admin123',
      'eduardo': 'edu123',
      'operator': 'operator123'
    }

    if (users[username] && users[username] === password) {
      const token = btoa(JSON.stringify({ user: username, time: Date.now() }))
      localStorage.setItem('token', token)
      localStorage.setItem('username', username)
      onLogin(token, username)
    } else {
      setError('Invalid username or password')
    }
    setLoading(false)
  }

  const handleOAuthLogin = async (providerId: string) => {
    const redirectUri = `${window.location.origin}/oauth/callback`
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/v1/oauth/login?provider=${providerId}&redirect_uri=${encodeURIComponent(redirectUri)}`)
      const data = await res.json()
      if (data.auth_url) {
        window.location.href = data.auth_url
      } else {
        setError(data.error || 'Failed to initiate OAuth')
      }
    } catch (e) {
      setError('Failed to connect to OAuth provider')
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #0066cc, #0052a3)', borderRadius: '12px', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
              <path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
          <h1 style={{ color: '#0066cc', margin: 0 }}>EdgeNeuro</h1>
          <p style={{ color: '#666', margin: '5px 0 0', fontSize: '14px' }}>Control Plane</p>
        </div>
        
        {/* OAuth Buttons */}
        {oauthProviders.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            {oauthProviders.map(p => (
              <button
                key={p.id}
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', marginBottom: '8px' }}
                onClick={() => handleOAuthLogin(p.id)}
              >
                Continue with {p.name}
              </button>
            ))}
            <div style={{ textAlign: 'center', color: '#999', margin: '10px 0', fontSize: '12px' }}>or</div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          {error && <p style={{ color: '#dc3545', marginBottom: '15px', fontSize: '14px' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '6px', fontSize: '12px', color: '#666' }}>
          <p style={{ margin: '0 0 5px', fontWeight: '600' }}>Demo Accounts:</p>
          <p style={{ margin: '2px 0' }}>admin / admin123</p>
          <p style={{ margin: '2px 0' }}>eduardo / edu123</p>
        </div>
      </div>
    </div>
  )
}
