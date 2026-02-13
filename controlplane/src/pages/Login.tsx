import { useState, useEffect, FormEvent } from 'react'

interface LoginProps {
  onLogin: (token: string, user: string) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Demo users - in production, this would validate against D1
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
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
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
              required
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
          <p style={{ margin: '2px 0' }}>operator / operator123</p>
        </div>
      </div>
    </div>
  )
}
