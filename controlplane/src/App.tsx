import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Agents from './pages/Agents'
import Discovery from './pages/Discovery'
import Testing from './pages/Testing'
import Evaluation from './pages/Evaluation'
import Settings from './pages/Settings'
import Logs from './pages/Logs'
import Layout from './components/Layout'

// OAuth Callback component
function OAuthCallback() {
  const navigate = useNavigate()
  
  useEffect(() => {
    // Parse query params from URL
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const provider = params.get('provider')
    const error = params.get('error')
    
    if (error) {
      alert('OAuth error: ' + error)
      navigate('/login')
      return
    }
    
    if (code && provider) {
      // Store the token and redirect to dashboard
      // In a real app, you'd exchange the code for a token here
      localStorage.setItem('oauth_provider', provider)
      localStorage.setItem('token', btoa(JSON.stringify({ provider, time: Date.now() })))
      localStorage.setItem('username', provider + ' user')
      navigate('/dashboard')
    } else {
      navigate('/login')
    }
  }, [navigate])
  
  return <div>Processing login...</div>
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [username, setUsername] = useState(localStorage.getItem('username') || '')

  useEffect(() => {
    if (token) {
      try {
        const data = JSON.parse(atob(token))
        setUsername(data.user || data.provider + ' user')
      } catch {
        setUsername('')
      }
    }
  }, [token])

  if (!token) {
    return <Login onLogin={(t, u) => { setToken(t); setUsername(u) }} />
  }

  return (
    <BrowserRouter>
      <Layout 
        onLogout={() => { 
          localStorage.removeItem('token')
          localStorage.removeItem('username')
          localStorage.removeItem('oauth_provider')
          setToken(null)
          setUsername('')
        }} 
        username={username}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/testing" element={<Testing />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
