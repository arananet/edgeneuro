-- D1 Database Schema for EdgeNeuro
-- Run: wrangler d1 execute edgeneuro-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  intent_triggers TEXT,  -- JSON array
  capabilities TEXT,      -- JSON array
  connection TEXT NOT NULL, -- JSON object
  approved INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agents_approved ON agents(approved);

-- Insert fallback agent if not exists
INSERT OR IGNORE INTO agents (id, name, intent_triggers, connection, approved)
VALUES ('agent_fallback', 'General Support', '["general", "help", "other", "support"]', '{"protocol": "http", "url": "https://support.internal", "auth_strategy": "none"}', 1);
