# EdgeNeuro 🧠
**Enterprise-Grade Serverless Orchestrator**

EdgeNeuro is a "Hot Potato" architecture orchestrator built on Cloudflare Workers (Cortex), Workers AI (Llama-3), and Durable Objects (Synapse).

## Architecture
1.  **Cortex (Router):** Ephemeral Edge Worker. Runs <50ms. Classifies intent using Llama-3-8B.
2.  **Synapse (State):** Durable Object. Stores routing history and serves real-time visualization data.
3.  **Viz (Dashboard):** Next.js dashboard visualizing the live agent network.

## Spec-Driven Development
This project follows GitHub Spec Kit. See `.spec/` for immutable rules and technical specifications.

## Setup
1.  **Install Deps:** `npm install`
2.  **Deploy Cortex:** `cd cortex && wrangler deploy`
3.  **Run Viz:** `cd viz && npm run dev`

## License
MIT
