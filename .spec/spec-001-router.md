# Spec 001: The EdgeNeuro Cortex (Router)

The EdgeNeuro Cortex is the entry point for all user requests. It performs intent detection using a lightweight LLM and routes requests to the appropriate internal agent using the "Hot Potato" Handoff Protocol.

## Architecture

1.  **Framework:** Cloudflare Workers (TypeScript)
2.  **Inference:** Workers AI (Llama-3-8B-Instruct)
3.  **State:** Durable Object (Synapse) for logging only.
4.  **Protocol:** Handoff Token (returns connection URL).

## Intent Detection Logic

**Input:**

- `query` (string): The user's natural language query.

**Process:**

1.  Verify Auth (JWT).
2.  Call `@cf/meta/llama-3-8b-instruct` with strict system prompt.
3.  Parse JSON response (`target`, `confidence`).
4.  Log decision to `Synapse` (Durable Object).

**Output:**

- `status`: "handoff"
- `target_agent`: Agent ID
- `connection_url`: `wss://{agent}.internal/v1/chat`

## Failure Modes

1.  **AI Failure:** If Llama-3 times out or errors, fallback to keyword matching.
2.  **Confidence < 0.7:** If confidence is low, return `target_agent: "agent_research"` (General Knowledge fallback).

## Deployment

- **Env:** `cortex/wrangler.toml`
- **Secrets:** `AI_TOKEN`, `SYNAPSE_ID` (DO Binding).
- **CI/CD:** GitHub Actions -> `wrangler deploy`.
