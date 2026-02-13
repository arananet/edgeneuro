interface RouteLog {
  timestamp: number;
  query: string;
  target: string;
  confidence: number;
  protocol: string;
}

export class SynapseState {
  state: DurableObjectState;
  history: RouteLog[] = [];

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    // Logging Endpoint (Internal)
    if (url.pathname === '/log-route') {
      const data = await request.json();
      this.history.push(data);
      if (this.history.length > 50) this.history.shift(); // Keep last 50
      return new Response('Logged');
    }

    // Visualization Endpoint (External)
    if (url.pathname === '/graph-data') {
      return Response.json(this.history, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response('Synapse Active');
  }
}
