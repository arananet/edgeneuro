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

interface IntentRule {
  id: string
  pattern: string
  agent_id: string
  priority: number
  enabled: boolean
}

interface AccessRule {
  id: string
  role: string
  topic: string
  access_level: 'READ' | 'WRITE' | 'ADMIN'
  enabled: boolean
}

const AVAILABLE_MODELS = [
  { id: 'llama-3.2-1b', name: 'Llama 3.2 1B', description: 'Fastest, lowest latency' },
  { id: 'llama-3.2-3b', name: 'Llama 3.2 3B', description: 'Balanced speed/accuracy' },
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', description: 'Higher accuracy' },
  { id: 'gemma-2-27b', name: 'Gemma 2 27B', description: 'Best accuracy, slower' },
]

const ROLES = ['EMPLOYEE', 'MANAGER', 'HR', 'IT', 'FINANCE', 'ADMIN']

const ORCHESTRATOR_URL = 'https://edgeneuro-synapse-core.info-693.workers.dev'
const AGENT_SECRET = 'potato123'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'models' | 'neurosymbolic' | 'rules'>('models')
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

  // Rules
  const [intentRules, setIntentRules] = useState<IntentRule[]>([])
  const [accessRules, setAccessRules] = useState<AccessRule[]>([])
  const [rulesActiveSubtab, setRulesActiveSubtab] = useState<'intent' | 'access'>('intent')
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [editingRule, setEditingRule] = useState<{ type: 'intent' | 'access', data?: IntentRule | AccessRule } | null>(null)

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

    // Load intent rules
    const savedIntentRules = localStorage.getItem('intent_rules')
    if (savedIntentRules) {
      setIntentRules(JSON.parse(savedIntentRules))
    } else {
      // Default rules
      setIntentRules([
        { id: '1', pattern: 'vacation|pto|leave', agent_id: 'agent_hr', priority: 1, enabled: true },
        { id: '2', pattern: 'vpn|network|login', agent_id: 'agent_it', priority: 2, enabled: true },
        { id: '3', pattern: 'payroll|salary|bonus', agent_id: 'agent_finance', priority: 3, enabled: true },
      ])
    }

    // Load access rules
    const savedAccessRules = localStorage.getItem('access_rules')
    if (savedAccessRules) {
      setAccessRules(JSON.parse(savedAccessRules))
    } else {
      // Default rules
      setAccessRules([
        { id: '1', role: 'EMPLOYEE', topic: 'hr:leave', access_level: 'READ', enabled: true },
        { id: '2', role: 'HR', topic: 'hr:*', access_level: 'ADMIN', enabled: true },
        { id: '3', role: 'IT', topic: 'it:*', access_level: 'ADMIN', enabled: true },
        { id: '4', role: 'MANAGER', topic: 'team:*', access_level: 'READ', enabled: true },
        { id: '5', role: 'FINANCE', topic: 'payroll:*', access_level: 'ADMIN', enabled: true },
      ])
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

  // Intent Rules Handlers
  const saveIntentRule = (rule: IntentRule) => {
    const updated = editingRule?.data 
      ? intentRules.map(r => r.id === rule.id ? rule : r)
      : [...intentRules, { ...rule, id: Date.now().toString() }]
    setIntentRules(updated)
    localStorage.setItem('intent_rules', JSON.stringify(updated))
    setShowRuleForm(false)
    setEditingRule(null)
  }

  const deleteIntentRule = (id: string) => {
    if (!confirm('Delete this rule?')) return
    const updated = intentRules.filter(r => r.id !== id)
    setIntentRules(updated)
    localStorage.setItem('intent_rules', JSON.stringify(updated))
  }

  const toggleIntentRule = (id: string) => {
    const updated = intentRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    setIntentRules(updated)
    localStorage.setItem('intent_rules', JSON.stringify(updated))
  }

  // Access Rules Handlers
  const saveAccessRule = (rule: AccessRule) => {
    const updated = editingRule?.data 
      ? accessRules.map(r => r.id === rule.id ? rule : r)
      : [...accessRules, { ...rule, id: Date.now().toString() }]
    setAccessRules(updated)
    localStorage.setItem('access_rules', JSON.stringify(updated))
    setShowRuleForm(false)
    setEditingRule(null)
  }

  const deleteAccessRule = (id: string) => {
    if (!confirm('Delete this rule?')) return
    const updated = accessRules.filter(r => r.id !== id)
    setAccessRules(updated)
    localStorage.setItem('access_rules', JSON.stringify(updated))
  }

  const toggleAccessRule = (id: string) => {
    const updated = accessRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    setAccessRules(updated)
    localStorage.setItem('access_rules', JSON.stringify(updated))
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
        <button
          className={activeTab === 'rules' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setActiveTab('rules')}
        >
          📋 Rules
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

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <>
          {/* Subtabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              className={rulesActiveSubtab === 'intent' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setRulesActiveSubtab('intent')}
            >
              🎯 Intent Classification
            </button>
            <button
              className={rulesActiveSubtab === 'access' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setRulesActiveSubtab('access')}
            >
              🔐 Access Control
            </button>
          </div>

          {/* Intent Classification Rules */}
          {rulesActiveSubtab === 'intent' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">🎯 Intent Classification Rules</h3>
                <button className="btn btn-primary" onClick={() => { setEditingRule(null); setShowRuleForm(true); }}>
                  + Add Rule
                </button>
              </div>

              <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                Define patterns that map user queries to specific agents. Rules are evaluated by priority order.
              </p>

              {showRuleForm && (
                <IntentRuleForm
                  rule={editingRule?.data as IntentRule | undefined}
                  onSave={saveIntentRule}
                  onCancel={() => { setShowRuleForm(false); setEditingRule(null); }}
                />
              )}

              <table className="table">
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Pattern</th>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {intentRules.sort((a, b) => a.priority - b.priority).map(rule => (
                    <tr key={rule.id} style={{ opacity: rule.enabled ? 1 : 0.5 }}>
                      <td><code>{rule.priority}</code></td>
                      <td><code>{rule.pattern}</code></td>
                      <td><span className="badge">{rule.agent_id}</span></td>
                      <td>
                        <button 
                          onClick={() => toggleIntentRule(rule.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                        >
                          {rule.enabled ? '✅' : '❌'}
                        </button>
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '2px 8px', fontSize: '11px', marginRight: '5px' }}
                          onClick={() => { setEditingRule({ type: 'intent', data: rule }); setShowRuleForm(true); }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '2px 8px', fontSize: '11px', color: '#dc3545' }}
                          onClick={() => deleteIntentRule(rule.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {intentRules.length === 0 && (
                <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                  No intent rules defined. Add one to start routing queries to agents.
                </p>
              )}
            </div>
          )}

          {/* Access Control Rules */}
          {rulesActiveSubtab === 'access' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">🔐 Access Control Rules</h3>
                <button className="btn btn-primary" onClick={() => { setEditingRule(null); setShowRuleForm(true); }}>
                  + Add Rule
                </button>
              </div>

              <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                Define which roles can access which topics. Supports wildcards (e.g., hr:*, it:*).
              </p>

              {showRuleForm && (
                <AccessRuleForm
                  rule={editingRule?.data as AccessRule | undefined}
                  onSave={saveAccessRule}
                  onCancel={() => { setShowRuleForm(false); setEditingRule(null); }}
                />
              )}

              <table className="table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Topic</th>
                    <th>Access Level</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accessRules.map(rule => (
                    <tr key={rule.id} style={{ opacity: rule.enabled ? 1 : 0.5 }}>
                      <td><span className="badge">{rule.role}</span></td>
                      <td><code>{rule.topic}</code></td>
                      <td>
                        <span className={`badge ${rule.access_level === 'ADMIN' ? 'badge-success' : rule.access_level === 'WRITE' ? '' : ''}`}
                          style={{ background: rule.access_level === 'ADMIN' ? '#d4edda' : rule.access_level === 'WRITE' ? '#fff3cd' : '#e2e3e5' }}
                        >
                          {rule.access_level}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => toggleAccessRule(rule.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                        >
                          {rule.enabled ? '✅' : '❌'}
                        </button>
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '2px 8px', fontSize: '11px', marginRight: '5px' }}
                          onClick={() => { setEditingRule({ type: 'access', data: rule }); setShowRuleForm(true); }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '2px 8px', fontSize: '11px', color: '#dc3545' }}
                          onClick={() => deleteAccessRule(rule.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {accessRules.length === 0 && (
                <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                  No access rules defined. Add one to control who can access what.
                </p>
              )}
            </div>
          )}
        </>
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

// Intent Rule Form Component
function IntentRuleForm({ rule, onSave, onCancel }: { rule?: IntentRule, onSave: (r: IntentRule) => void, onCancel: () => void }) {
  const [pattern, setPattern] = useState(rule?.pattern || '')
  const [agentId, setAgentId] = useState(rule?.agent_id || '')
  const [priority, setPriority] = useState(rule?.priority || 1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: rule?.id || '',
      pattern,
      agent_id: agentId,
      priority,
      enabled: rule?.enabled ?? true
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '6px' }}>
      <h4 style={{ marginBottom: '15px' }}>{rule ? 'Edit' : 'Add'} Intent Rule</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
        <div className="form-group">
          <label className="form-label">Pattern (regex)</label>
          <input className="form-input" value={pattern} onChange={e => setPattern(e.target.value)} placeholder="vacation|pto|leave" required />
        </div>
        <div className="form-group">
          <label className="form-label">Agent ID</label>
          <input className="form-input" value={agentId} onChange={e => setAgentId(e.target.value)} placeholder="agent_hr" required />
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <input type="number" className="form-input" value={priority} onChange={e => setPriority(parseInt(e.target.value))} min="1" required />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button type="submit" className="btn btn-success">Save Rule</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// Access Rule Form Component
function AccessRuleForm({ rule, onSave, onCancel }: { rule?: AccessRule, onSave: (r: AccessRule) => void, onCancel: () => void }) {
  const [role, setRole] = useState(rule?.role || 'EMPLOYEE')
  const [topic, setTopic] = useState(rule?.topic || '')
  const [accessLevel, setAccessLevel] = useState(rule?.access_level || 'READ')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: rule?.id || '',
      role,
      topic,
      access_level: accessLevel,
      enabled: rule?.enabled ?? true
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '6px' }}>
      <h4 style={{ marginBottom: '15px' }}>{rule ? 'Edit' : 'Add'} Access Rule</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
        <div className="form-group">
          <label className="form-label">Role</label>
          <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Topic</label>
          <input className="form-input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="hr:leave" required />
        </div>
        <div className="form-group">
          <label className="form-label">Access Level</label>
          <select className="form-select" value={accessLevel} onChange={e => setAccessLevel(e.target.value as any)}>
            <option value="READ">READ</option>
            <option value="WRITE">WRITE</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button type="submit" className="btn btn-success">Save Rule</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
