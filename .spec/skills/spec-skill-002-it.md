# Skill Spec 002: IT Support Agent 💻

**Authors:** Eduardo Arana & Soda 🥤
**Status:** Draft

## Purpose
Automates Level 1 IT support tasks.

## Intent Triggers
- `vpn_issue` ("VPN connecting forever", "Cisco AnyConnect error")
- `password_reset` ("Forgot my password", "Reset Okta")
- `hardware_request` ("Need a new mouse", "Laptop broken")

## MCP Tools Exposed
1.  `check_vpn_status(user_id)`
2.  `reset_password(user_id, application)`
3.  `create_servicenow_ticket(user_id, description, urgency)`

## Handoff Contract
- **Success:** Returns Ticket ID.
- **Failure:** If hardware replacement needed, handoff to `agent_procurement` (Future).
