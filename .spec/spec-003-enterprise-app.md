# EdgeNeuro Enterprise App - Specification

## 1. Overview

**Project Name:** EdgeNeuro Enterprise Dashboard
**Type:** Web Application (React + Cloudflare)
**Core Functionality:** Admin console for managing EdgeNeuro orchestrator, testing agents, and viewing analytics.
**Target Users:** Enterprise administrators, DevOps engineers

## 2. Architecture

### Tech Stack
- **Frontend:** React 18 (static site)
- **Hosting:** Cloudflare Pages
- **Auth:** Username/password with JWT (stored in D1)
- **API:** Connects to existing Orchestrator Workers

### Data Flow
```
User -> React App -> Orchestrator API -> Agents
                 -> D1 (users, sessions)
```

## 3. UI/UX Specification

### Layout Structure
- **Sidebar:** Navigation (200px fixed)
- **Header:** User info, logout (60px)
- **Main Content:** Dynamic (calc(100% - 260px))

### Pages
1. **Login** - Username/password form
2. **Dashboard** - Overview stats, recent activity
3. **Agents** - List, add, edit, delete agents
4. **Testing** - MCP/A2A validation tools
5. **Evaluation** - Metrics, latency, accuracy charts
6. **Settings** - User management

### Visual Design
- **Colors:** 
  - Primary: #0066cc (enterprise blue)
  - Surface: #ffffff
  - Background: #f5f5f5
  - Success: #28a745
  - Error: #dc3545
- **Typography:** System fonts (-apple-system, Segoe UI, Roboto)
- **Spacing:** 8px base unit

## 4. Functionality Specification

### Authentication
- Login with username/password
- JWT token storage (httpOnly cookie)
- Protected routes
- Session timeout: 24h

### Agent Management
- List all registered agents from orchestrator
- Add new agent (POST to /v1/agent/register)
- Edit agent configuration
- Delete agent
- View agent status

### Testing Tools
- MCP Client Validator (connect, list tools, call tool)
- A2A Protocol Validator (test handoff)
- Config Validator (JSON validation)
- Proxy for external MCP servers

### Evaluation Dashboard
- Routing accuracy over time
- Latency metrics (p50, p95, p99)
- Agent response times
- Error rates

## 5. API Integration

### Endpoints Used
- `GET /health` - Health check
- `GET /v1/agents` - List agents
- `POST /v1/agent/register` - Add agent
- `GET /v1/test?q=` - Test routing
- `GET /graph-data` - Routing history

## 6. Acceptance Criteria

- [ ] User can log in with username/password
- [ ] Dashboard shows orchestrator health and stats
- [ ] User can view list of registered agents
- [ ] User can add new agent to orchestrator
- [ ] User can test MCP endpoints via UI
- [ ] User can test A2A routing via UI
- [ ] Evaluation page shows metrics (mock data for now)
- [ ] All pages are responsive
- [ ] Logout works correctly
