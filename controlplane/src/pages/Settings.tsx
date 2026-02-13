import { useState, useEffect } from 'react'

interface OAuthProvider {
  id: string
  name: string
  client_id: string
  client_secret?: string
  auth_url: string
  token_url: string
  userinfo_url?: string
  scopes: string
  enabled: number
}

const ORCHESTRATOR_URL = 'https://edgeneuro-synapse-core.info-693.workers.dev'
const AGENT_SECRET = 'potato123'

// Default provider configs
const PROVIDER_TEMPLATES = {
  google: {
    id: 'google',
    name: 'Google',
    auth_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    userinfo_url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: JSON.stringify(['openid', 'email', 'profile'])
  },
  microsoft: {
    id: 'microsoft',
    name: 'Microsoft Entra ID',
    auth_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    token_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userinfo_url: 'https://graph.microsoft.com/v1.0/me',
    scopes: JSON.stringify(['openid', 'email', 'profile', 'User.Read'])
  },
  okta: {
    id: 'okta',
    name: 'Okta',
    auth_url: '',
    token_url: '',
    userinfo_url: '',
    scopes: JSON.stringify(['openid', 'profile', 'email'])
  }
}

export default function Settings() {
  const [providers, setProviders] = useState<OAuthProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Partial<OAuthProvider>>({
    id: '',
    name: '',
    client_id: '',
    client_secret: '',
    auth_url: '',
    token_url: '',
    userinfo_url: '',
    scopes: '',
    enabled: true
  })

  const loadProviders = () => {
    setLoading(true)
    fetch(`${ORCHESTRATOR_URL}/v1/oauth/providers`)
      .then(res => res.json())
      .then(data => setProviders(data.providers || []))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProviders()
  }, [])

  const handleTemplate = (template: keyof typeof PROVIDER_TEMPLATES) => {
    const t = PROVIDER_TEMPLATES[template]
    setFormData({
      ...t,
      scopes: typeof t.scopes === 'string' ? t.scopes : JSON.stringify(t.scopes),
      client_id: '',
      client_secret: '',
      enabled: true
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await fetch(`${ORCHESTRATOR_URL}/v1/oauth/provider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Secret': AGENT_SECRET
        },
        body: JSON.stringify(formData)
      })
      setShowForm(false)
      setFormData({ id: '', name: '', client_id: '', client_secret: '', auth_url: '', token_url: '', userinfo_url: '', scopes: '', enabled: true })
      loadProviders()
    } catch (e) {
      alert('Failed to save provider')
    }
  }

  const testLogin = async (providerId: string) => {
    const redirectUri = `${window.location.origin}/oauth/callback`
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/v1/oauth/login?provider=${providerId}&redirect_uri=${encodeURIComponent(redirectUri)}`)
      const data = await res.json()
      if (data.auth_url) {
        window.location.href = data.auth_url
      } else {
        alert(data.error || 'Failed to get login URL')
      }
    } catch (e) {
      alert('Failed to initiate login')
    }
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">OAuth Providers</h3>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Provider'}
          </button>
        </div>

        {/* Quick Templates */}
        {!showForm && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>Quick start with:</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => handleTemplate('google')}>Google</button>
              <button className="btn btn-secondary" onClick={() => handleTemplate('microsoft')}>Microsoft Entra ID</button>
              <button className="btn btn-secondary" onClick={() => handleTemplate('okta')}>Okta</button>
            </div>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '15px', background: 'var(--background)', borderRadius: '6px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label className="form-label">Provider ID</label>
                <input className="form-input" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} placeholder="google, microsoft, okta" required disabled={!!PROVIDER_TEMPLATES[formData.id as keyof typeof PROVIDER_TEMPLATES]} />
              </div>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Google" required />
              </div>
              <div className="form-group">
                <label className="form-label">Client ID</label>
                <input className="form-input" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})} placeholder="Your OAuth Client ID" required />
              </div>
              <div className="form-group">
                <label className="form-label">Client Secret</label>
                <input className="form-input" type="password" value={formData.client_secret} onChange={e => setFormData({...formData, client_secret: e.target.value})} placeholder="Your OAuth Client Secret" />
              </div>
              <div className="form-group">
                <label className="form-label">Auth URL</label>
                <input className="form-input" value={formData.auth_url} onChange={e => setFormData({...formData, auth_url: e.target.value})} placeholder="https://accounts.google.com/o/oauth2/v2/auth" required />
              </div>
              <div className="form-group">
                <label className="form-label">Token URL</label>
                <input className="form-input" value={formData.token_url} onChange={e => setFormData({...formData, token_url: e.target.value})} placeholder="https://oauth2.googleapis.com/token" required />
              </div>
              <div className="form-group">
                <label className="form-label">UserInfo URL</label>
                <input className="form-input" value={formData.userinfo_url} onChange={e => setFormData({...formData, userinfo_url: e.target.value})} placeholder="https://www.googleapis.com/oauth2/v2/userinfo" />
              </div>
              <div className="form-group">
                <label className="form-label">Scopes (comma separated)</label>
                <input className="form-input" value={formData.scopes} onChange={e => setFormData({...formData, scopes: e.target.value})} placeholder="openid, email, profile" />
              </div>
            </div>
            <button type="submit" className="btn btn-success" style={{ marginTop: '10px' }}>Save Provider</button>
          </form>
        )}

        {loading ? (
          <p>Loading...</p>
        ) : providers.length === 0 ? (
          <p>No OAuth providers configured. Add one to enable social login.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Client ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td><code>{p.client_id}</code></td>
                  <td>
                    {p.enabled ? (
                      <span className="badge badge-success">Enabled</span>
                    ) : (
                      <span className="badge" style={{ background: '#f8d7da', color: '#721c24' }}>Disabled</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => testLogin(p.id)}>Test Login</button>
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
