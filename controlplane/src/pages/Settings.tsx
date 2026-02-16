import { useState, useEffect, useRef } from 'react'

interface ModelConfig {
  id: string
  name: string
  base_model: string
  lora_id?: string
  enabled: boolean
  is_default: boolean
}

interface LoRAAdapter {
  id: string
  name: string
  base_model: string
  uploaded_at: string
  size: number
  status: 'ready' | 'error' | 'loading'
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
  const [activeTab, setActiveTab] = useState<'models' | 'lora' | 'neurosymbolic'>('models')
  const [models, setModels] = useState<ModelConfig[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [loraAdapters, setLoraAdapters] = useState<LoRAAdapter[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    // Load LoRA adapters
    const savedLoras = localStorage.getItem('lora_adapters')
    if (savedLoras) {
      setLoraAdapters(JSON.parse(savedLoras))
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

  // LoRA Upload Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = async (files: FileList) => {
    setUploading(true)
    
    // Simulate upload - in real app would upload to server
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const newAdapter: LoRAAdapter = {
        id: `lora_${Date.now()}_${i}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        base_model: 'llama-3.2-1b',
        uploaded_at: new Date().toISOString(),
        size: file.size,
        status: 'loading'
      }

      setLoraAdapters(prev => {
        const updated = [...prev, newAdapter]
        localStorage.setItem('lora_adapters', JSON.stringify(updated))
        return updated
      })

      // Simulate processing
      setTimeout(() => {
        setLoraAdapters(prev => {
          const updated = prev.map(a => 
            a.id === newAdapter.id 
              ? { ...a, status: 'ready' as const }
              : a
          )
          localStorage.setItem('lora_adapters', JSON.stringify(updated))
          return updated
        })
      }, 1500)
    }
    
    setUploading(false)
  }

  const handleDeleteLora = (id: string) => {
    if (!confirm('Delete this LoRA adapter?')) return
    setLoraAdapters(prev => {
      const updated = prev.filter(a => a.id !== id)
      localStorage.setItem('lora_adapters', JSON.stringify(updated))
      return updated
    })
  }

  const handleNeuroConfigChange = (key: keyof NeuroSymbolicConfig, value: any) => {
    const updated = { ...neuroConfig, [key]: value }
    setNeuroConfig(updated)
    localStorage.setItem('neuro_symbolic_config', JSON.stringify(updated))
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
          className={activeTab === 'lora' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setActiveTab('lora')}
        >
          📦 LoRA Adapters
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
                <div>
                  <span style={{ color: '#666' }}>Fine-tuned:</span>
                  <span style={{ marginLeft: '8px' }}>{models.find(m => m.id === selectedModel)?.lora_id || 'None'}</span>
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

      {/* LoRA Adapters Tab */}
      {activeTab === 'lora' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Fine-Tuned LoRA Adapters</h3>
          </div>

          <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
            Upload custom LoRA adapters for domain-specific intent classification.
          </p>

          <div 
            style={{ 
              padding: '30px', 
              border: `2px dashed ${dragActive ? '#0066cc' : '#ddd'}`,
              borderRadius: '6px', 
              textAlign: 'center',
              background: dragActive ? '#f0f7ff' : 'transparent',
              transition: 'all 0.2s'
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".safetensors,.json"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
            <p style={{ color: '#666', marginBottom: '10px' }}>
              {uploading ? 'Uploading...' : 'Drag & drop LoRA adapter files here'}
            </p>
            <p style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
              Supported: .safetensors + adapter_config.json
            </p>
            <button 
              className="btn btn-secondary" 
              style={{ marginTop: '10px' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Browse Files
            </button>
          </div>

          {loraAdapters.length > 0 && (
            <table className="table" style={{ marginTop: '20px' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Base Model</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loraAdapters.map(adapter => (
                  <tr key={adapter.id}>
                    <td><strong>{adapter.name}</strong></td>
                    <td>{adapter.base_model}</td>
                    <td>{formatBytes(adapter.size)}</td>
                    <td>{new Date(adapter.uploaded_at).toLocaleDateString()}</td>
                    <td>
                      {adapter.status === 'loading' && <span className="badge" style={{ background: '#fff3cd', color: '#856404' }}>Loading...</span>}
                      {adapter.status === 'ready' && <span className="badge badge-success">Ready</span>}
                      {adapter.status === 'error' && <span className="badge badge-success">Error</span>}
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '2px 8px', fontSize: '11px', marginRight: '5px' }}
                        onClick={() => alert(`Testing LoRA: ${adapter.name}`)}
                      >
                        Test
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '2px 8px', fontSize: '11px', color: '#dc3545' }}
                        onClick={() => handleDeleteLora(adapter.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {loraAdapters.length === 0 && (
            <p style={{ marginTop: '20px', textAlign: 'center', color: '#666' }}>
              No LoRA adapters uploaded yet.
            </p>
          )}
        </div>
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
