import { useState, useEffect } from 'react';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  type: 'ai_request' | 'ai_response' | 'worker_error' | 'access_denied' | 'routing' | 'system';
  agent_id?: string;
  model_id?: string;
  prompt?: string;
  response?: string;
  tokens_input?: number;
  tokens_output?: number;
  latency_ms?: number;
  error_message?: string;
  metadata?: string;
  user_id?: string;
  session_id?: string;
}

interface LogsResponse {
  logs: LogEntry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

const WORKER_URL = 'https://edgeneuro-synapse-core.info-693.workers.dev';

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{ type?: string; level?: string; agent?: string }>({});
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0, has_more: false });

  const fetchLogs = async (offset = 0) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('offset', offset.toString());
      if (filter.type) params.set('type', filter.type);
      if (filter.level) params.set('level', filter.level);
      if (filter.agent) params.set('agent', filter.agent);
      
      const response = await fetch(`${WORKER_URL}/v1/logs?${params}`);
      const data: LogsResponse = await response.json();
      
      if (data.logs) {
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const formatTimestamp = (ts: number) => {
    return new Date(ts * 1000).toLocaleString();
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-400';
      case 'WARN': return 'text-yellow-400';
      case 'DEBUG': return 'text-gray-400';
      default: return 'text-green-400';
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      ai_request: 'bg-blue-900 text-blue-200',
      ai_response: 'bg-green-900 text-green-200',
      worker_error: 'bg-red-900 text-red-200',
      access_denied: 'bg-orange-900 text-orange-200',
      routing: 'bg-purple-900 text-purple-200',
      system: 'bg-gray-700 text-gray-300'
    };
    return colors[type] || 'bg-gray-700 text-gray-300';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🧠 Observability Logs</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchLogs(pagination.offset - 50)}
            disabled={pagination.offset === 0}
            className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
          >
            ← Prev
          </button>
          <span className="px-3 py-1 text-gray-400">
            {pagination.offset + 1}-{Math.min(pagination.offset + 50, pagination.total)} of {pagination.total}
          </span>
          <button
            onClick={() => fetchLogs(pagination.offset + 50)}
            disabled={!pagination.has_more}
            className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filter.type || ''}
          onChange={(e) => setFilter(f => ({ ...f, type: e.target.value || undefined }))}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
        >
          <option value="">All Types</option>
          <option value="ai_request">AI Request</option>
          <option value="ai_response">AI Response</option>
          <option value="worker_error">Worker Error</option>
          <option value="access_denied">Access Denied</option>
          <option value="routing">Routing</option>
          <option value="system">System</option>
        </select>

        <select
          value={filter.level || ''}
          onChange={(e) => setFilter(f => ({ ...f, level: e.target.value || undefined }))}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
        >
          <option value="">All Levels</option>
          <option value="DEBUG">Debug</option>
          <option value="INFO">Info</option>
          <option value="WARN">Warning</option>
          <option value="ERROR">Error</option>
        </select>

        <input
          placeholder="Filter by agent..."
          value={filter.agent || ''}
          onChange={(e) => setFilter(f => ({ ...f, agent: e.target.value || undefined }))}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 flex-1"
        />

        <button
          onClick={() => fetchLogs()}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
        >
          Apply
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-4">
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No logs found. Try adjusting filters or make some requests first!
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-gray-800 border border-gray-700 rounded p-4 hover:border-gray-600"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-sm ${getLevelColor(log.level)}`}>
                    [{log.level}]
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${getTypeBadge(log.type)}`}>
                    {log.type}
                  </span>
                  {log.agent_id && (
                    <span className="text-gray-400 text-sm">agent: {log.agent_id}</span>
                  )}
                </div>
                <span className="text-gray-500 text-sm">
                  {formatTimestamp(log.timestamp)}
                </span>
              </div>

              {log.model_id && (
                <div className="mt-2 text-sm text-gray-400">
                  Model: <code className="bg-gray-900 px-1 rounded">{log.model_id}</code>
                </div>
              )}

              {log.prompt && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 uppercase mb-1">Prompt</div>
                  <div className="bg-gray-900 p-2 rounded text-sm text-gray-300 font-mono truncate">
                    {log.prompt}
                  </div>
                </div>
              )}

              {log.response && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 uppercase mb-1">Response</div>
                  <div className="bg-gray-900 p-2 rounded text-sm text-gray-300 font-mono truncate">
                    {log.response}
                  </div>
                </div>
              )}

              {log.error_message && (
                <div className="mt-2 text-red-400 text-sm">
                  Error: {log.error_message}
                </div>
              )}

              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                {log.latency_ms && (
                  <span>Latency: {log.latency_ms}ms</span>
                )}
                {log.tokens_input && (
                  <span>Input: {log.tokens_input} tokens</span>
                )}
                {log.tokens_output && (
                  <span>Output: {log.tokens_output} tokens</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
