# EdgeNeuro Tutorials

Welcome to the EdgeNeuro tutorial series. These guides walk you through deploying, configuring, and evaluating the orchestrator.

## Getting Started

1. **[Deployment](./01-deployment.md)** - Deploy EdgeNeuro to Cloudflare Workers
2. **[Fine-Tuning](./02-fine-tuning.md)** - Train an SLM for intent detection
3. **[Configuration](./03-configuration.md)** - Configure agents and authentication
4. **[Testing & Evaluation](./04-testing-evaluation.md)** - Verify it actually works

## Evaluation is Critical

Don't just trust the architecture - prove it works. The [Testing & Evaluation](./04-testing-evaluation.md) guide covers:

- **Routing Accuracy**: >95% of users go to the right agent
- **Latency**: <50ms P50, <100ms P95  
- **Reliability**: 99.9% uptime, <0.1% errors
- **Protocol Compliance**: A2A handoff works end-to-end

## Quick Links

- [Architecture Overview](../ARCHITECTURE.md)
- [Fine-Tuning Strategy](../FINE_TUNING.md)
- [GitHub Repository](https://github.com/arananet/edgeneuro)
