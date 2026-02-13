# CONSTITUTION (EdgeNeuro)

The Immutable Rules of the EdgeNeuro Orchestration Layer.

### Rule 1: Ephemeral by Default

The Router (Cortex) MUST run on ephemeral compute (Cloudflare Workers, <50ms startup). It MUST NOT maintain persistent state (no `useState`, no DB connection) other than passing messages to the Durable Object.

### Rule 2: Handoff Protocol (Hot Potato)

The Router MUST NOT execute agent logic. It MUST only classify intent and return a Handoff Token (or connection URL) to the client. The client MUST connect directly to the target agent.

### Rule 3: Privacy Gap

No internal user data (PII) shall be logged in the Router's plain-text logs. All routing decisions logged to the Synapse MUST be anonymized (Intent Only).

### Rule 4: Model Agnosticism (MCP)

The Router MUST NOT hardcode agent capabilities. It MUST fetch available agents from a dynamic MCP Registry (or config).

### Rule 5: Spec-Driven Changes

All architectural changes MUST begin with a Pull Request to `.spec/` updating the relevant specification document before code is merged.

### Rule 6: Skill Definition

No Agent shall be integrated without a corresponding Skill Specification in `.spec/skills/` defining its Intent Triggers, MCP Tools, and Handoff Contract.
