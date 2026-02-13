import { NavLink, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  onLogout: () => void
}

export default function Layout({ children, onLogout }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>EdgeNeuro</h1>
        </div>
        <nav>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            📊 Dashboard
          </NavLink>
          <NavLink to="/agents" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            🤖 Agents
          </NavLink>
          <NavLink to="/testing" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            🧪 Testing
          </NavLink>
          <NavLink to="/evaluation" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            📈 Evaluation
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <header className="header">
          <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
            {location.pathname.charAt(1).toUpperCase() + location.pathname.slice(2)}
          </h2>
          <div className="header-user">
            <span>admin</span>
            <button className="btn-logout" onClick={onLogout}>Logout</button>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
