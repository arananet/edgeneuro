import { useState, useEffect } from 'react'

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

interface CloudflareModel {
  id: string
  name: string
  task?: string
  description?: string
}

const AVAILABLE_MODELS = [
  { id: 'llama-3.2-1b', name: 'Llama 3.2 1B', description: 'Fastest, lowest latency' },
  { id: 'llama-3.2-3b', name: 'Llama 3.2 3B', description: 'Balanced speed/accuracy' },
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', description: 'Higher accuracy' },
  { id: 'gemma-2-27b', name: 'Gemma 2 27B', description: 'Best accuracy, slower' },
]

const ROLES = ['EMPLOYEE', 'MANAGER', 'HR', 'IT', 'FINANCE', 'ADMIN']

const ORCHESTRATOR_URL = 'https://edgeneuro-synapse-core.info-693.workers.dev'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'models' | 'neurosymbolic' | 'rules'>('models')
  const [selectedModel, setSelectedModel] = useState('')

  const [cfModels, setCfModels] = useState<CloudflareModel[]>([])
  const [cfLoading, setCfLoading] = useState(false)
  const [cfError, setCfError] = useState('')
  const [savingModel, setSavingModel] = useState(false)

  const [neuroConfig, setNeuroConfig] = useState<NeuroSymbolicConfig>({
    enabled: true,
    use_llm_validation: true,
    confidence_threshold: 0.75,
    fallback_to_neural: true,
    knowledge_graph_enabled: true,
    max_path_depth: 5
  })

  const [intentRules, setIntentRules] = useState<IntentRule[]>([])
  const [accessRules, setAccessRules] = useState<AccessRule[]>([])
  const [rulesActiveSubtab, setRulesActiveSubtab] = useState<'intent' | 'access'>('intent')
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [editingRule, setEditingRule] = useState<{ type: 'intent' | 'access', data?: IntentRule | AccessRule } | null>(null)

  // Fetch models from worker
  const fetchModels = async () => {
    setCfLoading(true)
    setCfError('')
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/v1/models`)
      const data = await res.json()
      if (data.error) {
        setCfError(data.error)
        setCfModels([
          { id: '@cf/meta/llama-3.2-1b-instruct', task: 'text-generation' },
          { id: '@cf/meta/llama-3.2-3b-instruct', task: 'text-generation' },
          { id: '@cf/meta/llama-3.1-8b-instruct', task: 'text-generation' },
          { id: '@cf/google/gemma-2-27b-instruct', task: 'text-generation' },
        ])
      } else if (data.models) {
        setCfModels(data.models)
      }
    } catch (err: any) {
      setCfError(err.message || 'Failed to fetch models')
    }
    setCfLoading(false)
  }

  // Load all config on mount
  useEffect(() => {
    fetch(`${ORCHESTRATOR_URL}/v1/config/model`)
      .then(res => res.json())
      .then(data => { if (data.model_id) setSelectedModel(data.model_id) })
      .catch(() => {})

    fetch(`${ORCHESTRATOR_URL}/v1/config/neuro`)
      .then(res => res.json())
      .then(data => { if (data.config) setNeuroConfig(data.config) })
      .catch(() => {})

    fetch(`${ORCHESTRATOR_URL}/v1/rules/intent`)
      .then(res => res.json())
      .then(data => {
        if (data.rules?.length > 0) {
          setIntentRules(data.rules.map((r: any) => ({ ...r, enabled: r.enabled === 1 })))
        }
      })
      .catch(() => {})

    fetch(`${ORCHESTRATOR_URL}/v1/rules/access`)
      .then(res => res.json())
      .then(data => {
        if (data.rules?.length > 0) {
          setAccessRules(data.rules.map((r: any) => ({ ...r, enabled: r.enabled === 1 })))
        }
      })
      .catch(() => {})

    fetchModels()
  }, [])

  const saveSelectedModel = async () => {
    if (!selectedModel) return
    setSavingModel(true)
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/v1/config/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: selectedModel })
      })
      const data = await res.json()
      if (data.success) {
        alert('Model saved!')
      } else {
        alert('Error: ' + (data.error || 'Unknown'))
      }
    } catch (e: any) { alert('Error: ' + e.message) }
    setSavingModel(false)
  }

  const handleNeuroChange = async (key: keyof NeuroSymbolicConfig, value: any) => {
    const updated = { ...neuroConfig, [key]: value }
    setNeuroConfig(updated)
    try {
      await fetch(`${ORCHESTRATOR_URL}/v1/config/neuro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: updated })
      })
    } catch (e) {}
  }

  const saveIntentRules = async (rules: IntentRule[]) => {
    setIntentRules(rules)
    try {
      await fetch(`${ORCHESTRATOR_URL}/v1/rules/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules })
      })
    } catch (e) {}
  }

  const saveAccessRules = async (rules: AccessRule[]) => {
    setAccessRules(rules)
    try {
      await fetch(`${ORCHESTRATOR_URL}/v1/rules/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules })
      })
    } catch (e) {}
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button className={activeTab === 'models' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActiveTab('models')}>🤖 Models</button>
        <button className={activeTab === 'neurosymbolic' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActiveTab('neurosymbolic')}>🧠 Neuro Symbolic</button>
        <button className={activeTab === 'rules' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActiveTab('rules')}>📋 Rules</button>
      </div>

      {activeTab === 'models' && (
        <>
          <div className="card">
            <div className="card-header"><h3 className="card-title">AI Model Configuration</h3></div>
            <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>Select the model for intent classification.</p>
            <div className="form-group">
              <label className="form-label">Active Model</label>
              <select className="form-select" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                {cfModels.length > 0 ? cfModels.map(m => <option key={m.id} value={m.id}>{m.id}</option>) :
                  AVAILABLE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            {selectedModel && (
              <div style={{ marginTop: '15px' }}>
                <button className="btn btn-primary" onClick={saveSelectedModel} disabled={savingModel}>
                  {savingModel ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">☁️ Cloudflare API</h3></div>
            <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
              To fetch available models, set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN as secrets in synapse_core worker.
            </p>
            <button className="btn btn-secondary" onClick={fetchModels} disabled={cfLoading}>
              {cfLoading ? 'Fetching...' : 'Refresh Models'}
            </button>
            {cfError && <p style={{ color: '#dc3545', marginTop: '10px' }}>{cfError}</p>}
          </div>
        </>
      )}

      {activeTab === 'neurosymbolic' && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">🧠 Neuro Symbolic Engine</h3></div>
          <div style={{ display: 'grid', gap: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" checked={neuroConfig.enabled} onChange={e => handleNeuroChange('enabled', e.target.checked)} />
              <span>Enable Neuro Symbolic Engine</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" checked={neuroConfig.knowledge_graph_enabled} onChange={e => handleNeuroChange('knowledge_graph_enabled', e.target.checked)} />
              <span>Enable Knowledge Graph</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" checked={neuroConfig.use_llm_validation} onChange={e => handleNeuroChange('use_llm_validation', e.target.checked)} />
              <span>LLM Validation</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" checked={neuroConfig.fallback_to_neural} onChange={e => handleNeuroChange('fallback_to_neural', e.target.checked)} />
              <span>Fallback to Neural</span>
            </label>
            <div>
              <label className="form-label">Confidence Threshold: {(neuroConfig.confidence_threshold * 100).toFixed(0)}%</label>
              <input type="range" min="0" max="100" value={neuroConfig.confidence_threshold * 100}
                onChange={e => handleNeuroChange('confidence_threshold', parseInt(e.target.value) / 100)} style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button className={rulesActiveSubtab === 'intent' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setRulesActiveSubtab('intent')}>🎯 Intent</button>
            <button className={rulesActiveSubtab === 'access' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setRulesActiveSubtab('access')}>🔐 Access</button>
          </div>

          {rulesActiveSubtab === 'intent' && (
            <IntentRulesTab rules={intentRules} onSave={saveIntentRules} />
          )}
          {rulesActiveSubtab === 'access' && (
            <AccessRulesTab rules={accessRules} onSave={saveAccessRules} />
          )}
        </>
      )}
    </div>
  )
}

function IntentRulesTab({ rules, onSave }: { rules: IntentRule[], onSave: (r: IntentRule[]) => void }) {
  const [localRules, setLocalRules] = useState(rules)
  const [showForm, setShowForm] = useState(false)
  const [editRule, setEditRule] = useState<IntentRule | null>(null)

  useEffect(() => { setLocalRules(rules) }, [rules])

  const handleSave = () => { onSave(localRules); setShowForm(false); setEditRule(null); }
  const addRule = (r: IntentRule) => setLocalRules([...localRules, { ...r, id: Date.now().toString() }])
  const deleteRule = (id: string) => { setLocalRules(localRules.filter(r => r.id !== id)); onSave(localRules.filter(r => r.id !== id)) }
  const toggleRule = (id: string) => {
    const updated = localRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    setLocalRules(updated); onSave(updated)
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Intent Classification Rules</h3>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Rule</button>
      </div>
      {showForm && <IntentRuleForm onSave={(r) => { addRule(r); setShowForm(false); }} onCancel={() => setShowForm(false)} />}
      <table className="table">
        <thead><tr><th>Priority</th><th>Pattern</th><th>Agent</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {localRules.sort((a, b) => a.priority - b.priority).map(r => (
            <tr key={r.id} style={{ opacity: r.enabled ? 1 : 0.5 }}>
              <td><code>{r.priority}</code></td>
              <td><code>{r.pattern}</code></td>
              <td>{r.agent_id}</td>
              <td><button onClick={() => toggleRule(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{r.enabled ? '✅' : '❌'}</button></td>
              <td><button className="btn btn-secondary" style={{ padding: '2px 8px', color: '#dc3545' }} onClick={() => deleteRule(r.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function IntentRuleForm({ onSave, onCancel }: { onSave: (r: IntentRule) => void, onCancel: () => void }) {
  const [pattern, setPattern] = useState('')
  const [agentId, setAgentId] = useState('')
  const [priority, setPriority] = useState(1)

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ id: '', pattern, agent_id: agentId, priority, enabled: true }); }} style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <input className="form-input" placeholder="Pattern (regex)" value={pattern} onChange={e => setPattern(e.target.value)} required />
        <input className="form-input" placeholder="Agent ID" value={agentId} onChange={e => setAgentId(e.target.value)} required />
        <input type="number" className="form-input" value={priority} onChange={e => setPriority(parseInt(e.target.value))} min="1" required />
      </div>
      <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
        <button type="submit" className="btn btn-success">Save</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function AccessRulesTab({ rules, onSave }: { rules: AccessRule[], onSave: (r: AccessRule[]) => void }) {
  const [localRules, setLocalRules] = useState(rules)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { setLocalRules(rules) }, [rules])

  const addRule = (r: AccessRule) => setLocalRules([...localRules, { ...r, id: Date.now().toString() }])
  const deleteRule = (id: string) => { setLocalRules(localRules.filter(r => r.id !== id)); onSave(localRules.filter(r => r.id !== id)) }
  const toggleRule = (id: string) => {
    const updated = localRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    setLocalRules(updated); onSave(updated)
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Access Control Rules</h3>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Rule</button>
      </div>
      {showForm && <AccessRuleForm onSave={(r) => { addRule(r); setShowForm(false); }} onCancel={() => setShowForm(false)} />}
      <table className="table">
        <thead><tr><th>Role</th><th>Topic</th><th>Access</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {localRules.map(r => (
            <tr key={r.id} style={{ opacity: r.enabled ? 1 : 0.5 }}>
              <td>{r.role}</td>
              <td><code>{r.topic}</code></td>
              <td>{r.access_level}</td>
              <td><button onClick={() => toggleRule(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{r.enabled ? '✅' : '❌'}</button></td>
              <td><button className="btn btn-secondary" style={{ padding: '2px 8px', color: '#dc3545' }} onClick={() => deleteRule(r.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AccessRuleForm({ onSave, onCancel }: { onSave: (r: AccessRule) => void, onCancel: () => void }) {
  const [role, setRole] = useState('EMPLOYEE')
  const [topic, setTopic] = useState('')
  const [accessLevel, setAccessLevel] = useState<'READ' | 'WRITE' | 'ADMIN'>('READ')

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ id: '', role, topic, access_level: accessLevel, enabled: true }); }} style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input className="form-input" placeholder="Topic (e.g. hr:leave)" value={topic} onChange={e => setTopic(e.target.value)} required />
        <select className="form-select" value={accessLevel} onChange={e => setAccessLevel(e.target.value as any)}>
          <option value="READ">READ</option>
          <option value="WRITE">WRITE</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>
      <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
        <button type="submit" className="btn btn-success">Save</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
