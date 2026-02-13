import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Agents from './pages/Agents'
import Testing from './pages/Testing'
import Evaluation from './pages/Evaluation'
import Layout from './components/Layout'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [username, setUsername] = useState(localStorage.getItem('username') || '')

  useEffect(() => {
    if (token) {
      try {
        const data = JSON.parse(atob(token))
        setUsername(data.user)
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
          setToken(null)
          setUsername('')
        }} 
        username={username}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/testing" element={<Testing />} />
          <Route path="/evaluation" element={<Evaluation />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
