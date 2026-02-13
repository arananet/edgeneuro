import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Agents from './pages/Agents'
import Testing from './pages/Testing'
import Evaluation from './pages/Evaluation'
import Layout from './components/Layout'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))

  if (!token) {
    return <Login onLogin={setToken} />
  }

  return (
    <BrowserRouter>
      <Layout onLogout={() => { localStorage.removeItem('token'); setToken(null) }}>
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
