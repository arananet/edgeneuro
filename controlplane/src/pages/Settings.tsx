import { useState, useEffect } from 'react'

interface ModelConfig {
  id: string
  name: string
  base_model: string
  enabled: boolean
  is_default: boolean
}

interface NeuroSymbolicConfig {
  enabled: boolean
  use_llm_validation: boolean
  confidence_threshold: number
  fallback_to_neural: boolean
  knowledge_graph_enabled: boolean
  max_path_depth: number
}

const AVAILABLE_MODELS = [
  { id: 'llama-3.2-1b', name: 'Llama 3.2 1B', description: 'Fastest, lowest latency' },
  { id: 'llama-3.2-3b', name: 'Llama 3.2 3B', description: 'Balanced speed/accuracy' },
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', description: 'Higher accuracy' },
  { id: 'gemma-2-27b', name: 'Gemma 2 27B', description: 'Best accuracy, slower' },
]

const ORCHESTRATOR_URL = 'https://edgeneuro-synapse-core.info-693.workers.dev'
const AGENT_SECRET = 'potato123'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'models' | 'neurosymbolic'>('models')
  const [models, setModels] = useState<ModelConfig[]>([])
  const [selectedModel, setSelectedModel] = useState('')

  // Neuro Symbolic Config
  const [neuroConfig, setNeuroConfig] = useState<NeuroSymbolicConfig>({
    enabled: true,
    use_llm_validation: true,
    confidence_threshold: 0.75,
    fallback_to_neural: true,
    knowledge_graph_enabled: true,
    max_path_depth: 5
  })

  useEffect(() => {
    // Load saved config
    const saved = localStorage.getItem('model_config')
    if (saved) {
      const config = JSON.parse(saved)
      setModels(config.models || [])
      setSelectedModel(config.active || 'llama-3.2-1b')
    } else {
      setSelectedModel('llama-3.2-1b')
    }

    // Load Neuro Symbolic config
    const savedNeuro = localStorage.getItem('neuro_symbolic_config')
    if (savedNeuro) {
      setNeuroConfig(JSON.parse(savedNeuro))
    }
  }, [])

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId)
    localStorage.setItem('model_config', JSON.stringify({
      models,
      active: modelId
    }))
  }

  const handleNeuroConfigChange = (key: keyof NeuroSymbolicConfig, value: any) => {
    const updated = { ...neuroConfig, [key]: value }
    setNeuroConfig(updated)
    localStorage.setItem('neuro_symbolic_config', JSON.stringify(updated))
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          className={activeTab === 'models' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setActiveTab('models')}
        >
          🤖 Models
        </button>
        <button
          className={activeTab === 'neurosymbolic' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setActiveTab('neurosymbolic')}
        >
          🧠 Neuro Symbolic
        </button>
      </div>

      {/* Models Tab */}
      {activeTab === 'models' && (
        <>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">AI Model Configuration</h3>
            </div>
            
            <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
              Select the model used for intent classification and routing. Smaller models are faster but less accurate.
            </p>

            <div className="form-group">
              <label className="form-label">Active Model</label>
              <select 
                className="form-select"
                value={selectedModel}
                onChange={e => handleModelSelect(e.target.value)}
              >
                {AVAILABLE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name} - {m.description}</option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '14px' }}>Current Configuration</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#666' }}>Base Model:</span>
                  <code style={{ marginLeft: '8px' }}>@cf/meta/{selectedModel}-instruct</code>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Available Models</h3>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {AVAILABLE_MODELS.map(m => (
                  <tr key={m.id}>
                    <td><strong>{m.name}</strong></td>
                    <td>{m.description}</td>
                    <td>
                      {selectedModel === m.id ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleModelSelect(m.id)}
                        >
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Neuro Symbolic Tab */}
      {activeTab === 'neurosymbolic' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🧠 Neuro Symbolic Engine Configuration</h3>
          </div>

          <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
            Configure the hybrid neuro-symbolic intent detection pipeline. Uses knowledge graph taxonomy with optional LLM validation.
          </p>

          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Enable/Disable */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={neuroConfig.enabled}
                  onChange={e => handleNeuroConfigChange('enabled', e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span><strong>Enable Neuro Symbolic Engine</strong></span>
              </label>
              <p style={{ margin: '5px 0 0 28px', fontSize: '12px', color: '#666' }}>
                When disabled, falls back to pure neural classification
              </p>
            </div>

            {/* Knowledge Graph */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={neuroConfig.knowledge_graph_enabled}
                  onChange={e => handleNeuroConfigChange('knowledge_graph_enabled', e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span><strong>Enable Knowledge Graph</strong></span>
              </label>
              <p style={{ margin: '5px 0 0 28px', fontSize: '12px', color: '#666' }}>
                Use knowledge graph for symbolic intent taxonomy and access control
              </p>
            </div>

            {/* LLM Validation */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={neuroConfig.use_llm_validation}
                  onChange={e => handleNeuroConfigChange('use_llm_validation', e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span><strong>LLM Validation</strong></span>
              </label>
              <p style={{ margin: '5px 0 0 28px', fontSize: '12px', color: '#666' }}>
                Use LLM to validate and refine symbolic intent detection results
              </p>
            </div>

            {/* Fallback */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={neuroConfig.fallback_to_neural}
                  onChange={e => handleNeuroConfigChange('fallback_to_neural', e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span><strong>Fallback to Neural</strong></span>
              </label>
              <p style={{ margin: '5px 0 0 28px', fontSize: '12px', color: '#666' }}>
                If confidence is below threshold, automatically use pure neural classification
              </p>
            </div>

            {/* Confidence Threshold */}
            <div className="form-group">
              <label className="form-label">Confidence Threshold</label>
              <input
                type="range"
                min="0"
                max="100"
                value={neuroConfig.confidence_threshold * 100}
                onChange={e => handleNeuroConfigChange('confidence_threshold', parseInt(e.target.value) / 100)}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                <span>0%</span>
                <span>{(neuroConfig.confidence_threshold * 100).toFixed(0)}%</span>
                <span>100%</span>
              </div>
              <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#666' }}>
                Minimum confidence required for symbolic intent detection
              </p>
            </div>

            {/* Max Path Depth */}
            <div className="form-group">
              <label className="form-label">Max Knowledge Graph Path Depth</label>
              <input
                type="number"
                className="form-input"
                value={neuroConfig.max_path_depth}
                onChange={e => handleNeuroConfigChange('max_path_depth', parseInt(e.target.value))}
                min="1"
                max="10"
                style={{ width: '100px' }}
              />
              <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#666' }}>
                Maximum traversal depth for knowledge graph path finding
              </p>
            </div>
          </div>

          {/* Status */}
          <div style={{ marginTop: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '14px' }}>Current Status</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#666' }}>Engine:</span>
                <span style={{ marginLeft: '8px', color: neuroConfig.enabled ? '#28a745' : '#dc3545' }}>
                  {neuroConfig.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div>
                <span style={{ color: '#666' }}>Knowledge Graph:</span>
                <span style={{ marginLeft: '8px' }}>{neuroConfig.knowledge_graph_enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div>
                <span style={{ color: '#666' }}>LLM Validation:</span>
                <span style={{ marginLeft: '8px' }}>{neuroConfig.use_llm_validation ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div>
                <span style={{ color: '#666' }}>Threshold:</span>
                <span style={{ marginLeft: '8px' }}>{(neuroConfig.confidence_threshold * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Gateway Status - Always visible */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3 className="card-title">📊 AI Gateway</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066cc' }}>-</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Requests Today</div>
          </div>
          <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>-</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Avg Latency</div>
          </div>
          <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066cc' }}>0%</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Cache Hit</div>
          </div>
        </div>
      </div>
    </div>
  )
}
