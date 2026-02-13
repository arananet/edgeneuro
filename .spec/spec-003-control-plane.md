# SPEC-003: Control Plane

## Overview

Enterprise web application for managing EdgeNeuro agents.

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Cloudflare Pages (hosting)
- react-router-dom (routing)
- recharts (metrics)

## Pages

| Page | Path | Features |
|------|------|----------|
| Login | `/` | Username/password auth |
| Dashboard | `/dashboard` | Health check, quick stats |
| Agents | `/agents` | CRUD, approval, MCP discovery |
| Testing | `/testing` | A2A/MCP protocol testing |
| Evaluation | `/evaluation` | Charts, metrics |

## Authentication

- Demo accounts in code (no backend)
- JWT stored in localStorage
- Auto-redirect to login on 401

## API Integration

Control Plane communicates with SynapseCore:
- `GET /health` - Health check
- `GET /v1/agents` - List agents
- `POST /v1/agent/register` - Register agent
- `POST /v1/agent/approve` - Approve agent
- `GET /v1/discover` - Probe MCP endpoint

## Design

- Primary: #0066cc
- Font: System stack
- Spacing: 8px base
- Icons: Flat SVG
