// The real dashboard code using ForceGraph
import ForceGraph2D from 'react-force-graph-2d';
import { useState, useEffect } from 'react';

export default function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  useEffect(() => {
    // 1. Fetch live data from Synapse
    const fetchData = async () => {
      // In prod, use real Worker URL. For dev, we assume proxy.
      try {
        const res = await fetch('http://localhost:8787/graph-data');
        if (!res.ok) return;
        const history = await res.json();

        const nodeSet = new Map();
        const links = [];

        // Always have User and Router
        nodeSet.set('User', { id: 'User', group: 0 });
        nodeSet.set('Router', { id: 'Router', group: 1 });

        history.forEach((event) => {
          // Add Agent Node
          if (!nodeSet.has(event.target)) {
            nodeSet.set(event.target, { id: event.target, group: 2 });
          }

          // User -> Router Link
          links.push({
            source: 'User',
            target: 'Router',
            value: 1,
            label: event.query,
          });

          // Router -> Agent Link
          links.push({
            source: 'Router',
            target: event.target,
            value: event.confidence * 5, // Thicker line for higher confidence
            label: `${event.reasoning} (${(event.confidence * 100).toFixed(0)}%)`,
          });
        });

        setGraphData({
          nodes: Array.from(nodeSet.values()),
          links,
        });
      } catch (e) {
        console.error('Viz polling failed', e);
      }
    };

    const interval = setInterval(fetchData, 2000); // 2s polling
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: '#000',
        color: '#fff',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ position: 'absolute', zIndex: 10, padding: 20 }}>
        <h1>EdgeNeuro Cortex Live 🧠</h1>
        <p>Real-time Intent Detection & Handoff Visualization</p>
        <p style={{ fontSize: '0.8em', color: '#888' }}>
          Polling Synapse State...
        </p>
      </div>
      <ForceGraph2D
        graphData={graphData}
        nodeAutoColorBy="group"
        nodeLabel="id"
        linkLabel="label"
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={(d) => d.value * 0.002}
        linkWidth={(link) => link.value}
      />
    </div>
  );
}
