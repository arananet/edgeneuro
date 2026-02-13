import { useState, useEffect } from 'react'

interface ModelConfig {
  id: string
  name: string
  base_model: string
  lora_id?: string
  enabled: boolean
  is_default: boolean
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
  const [activeTab, setActiveTab] = useState<'models' | 'oauth'>('models')
  const [models, setModels] = useState<ModelConfig[]>([])
  const [selectedModel, setSelectedModel] = useState('')

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
  }, [])

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId)
    localStorage.setItem('model_config', JSON.stringify({
      models,
      active: modelId
    }))
  }

  return (
    <div>
      {/* Model Selection */}
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
            <div>
              <span style={{ color: '#666' }}>Fine-tuned:</span>
              <span style={{ marginLeft: '8px' }}>{models.find(m => m.id === selectedModel)?.lora_id || 'None'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Available Models */}
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

      {/* LoRA Adapters */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Fine-Tuned LoRA Adapters</h3>
        </div>

        <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
          Upload custom LoRA adapters for domain-specific intent classification.
        </p>

        <div style={{ padding: '20px', border: '2px dashed #ddd', borderRadius: '6px', textAlign: 'center' }}>
          <p style={{ color: '#666', marginBottom: '10px' }}>Drag & drop LoRA adapter files here</p>
          <p style={{ fontSize: '12px', color: '#999' }}>Supported: .safetensors + adapter_config.json</p>
          <button className="btn btn-secondary" style={{ marginTop: '10px' }}>
            Browse Files
          </button>
        </div>

        {models.filter(m => m.lora_id).length > 0 && (
          <table className="table" style={{ marginTop: '15px' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Base Model</th>
                <th>LoRA ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.filter(m => m.lora_id).map(m => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.base_model}</td>
                  <td><code>{m.lora_id}</code></td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>
                      Test
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* AI Gateway Status */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">AI Gateway</h3>
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
