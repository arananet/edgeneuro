// The real dashboard code using ForceGraph
import ForceGraph2D from 'react-force-graph-2d';
import { useState, useEffect } from 'react';

export default function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  useEffect(() => {
    // 1. Fetch live data from Synapse
    const fetchData = async () => {
      // In prod, use real Worker URL
      // For dev, assume we run a proxy
      const res = await fetch('http://localhost:8787/graph-data'); 
      const history = await res.json();

      const nodeSet = new Set(['User', 'Router']);
      const links = [];

      history.forEach(event => {
        nodeSet.add(event.target);
        links.push({ source: 'User', target: 'Router', value: 1 });
        links.push({ source: 'Router', target: event.target, value: 3 });
      });

      const nodes = Array.from(nodeSet).map(id => ({
        id,
        group: id === 'Router' ? 1 : 2
      }));

      setGraphData({ nodes, links });
    };

    const interval = setInterval(fetchData, 2000); // 2s polling
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', background: '#000' }}>
      <h1 style={{ position: 'absolute', color: '#fff', zIndex: 10, padding: 20 }}>EdgeNeuro Cortex Live</h1>
      <ForceGraph2D
        graphData={graphData}
        nodeAutoColorBy="group"
        nodeLabel="id"
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={d => d.value * 0.001}
      />
    </div>
  );
}
