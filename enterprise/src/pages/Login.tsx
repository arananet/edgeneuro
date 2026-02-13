import { useState, FormEvent } from 'react'

interface LoginProps {
  onLogin: (token: string) => void
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

    // Mock login - in production, call auth API
    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('token', 'mock-jwt-token')
      onLogin('mock-jwt-token')
    } else {
      setError('Invalid username or password')
    }
    setLoading(false)
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">EdgeNeuro</h1>
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
          {error && <p style={{ color: 'var(--error)', marginBottom: '15px' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Demo: admin / admin
        </p>
      </div>
    </div>
  )
}
