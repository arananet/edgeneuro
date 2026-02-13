-- D1 Database Schema for EdgeNeuro
-- Run: wrangler d1 execute edgeneuro-db --file=./schema.sql

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  intent_triggers TEXT,
  capabilities TEXT,
  connection TEXT NOT NULL,
  approved INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_agents_approved ON agents(approved);

-- Insert fallback agent if not exists
INSERT OR IGNORE INTO agents (id, name, intent_triggers, connection, approved)
VALUES ('agent_fallback', 'General Support', '["general", "help", "other", "support"]', '{"protocol": "http", "url": "https://support.internal", "auth_strategy": "none"}', 1);

-- OAuth Providers Configuration
CREATE TABLE IF NOT EXISTS oauth_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT,
  auth_url TEXT NOT NULL,
  token_url TEXT NOT NULL,
  userinfo_url TEXT,
  scopes TEXT NOT NULL,
  enabled INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Users table (linked to OAuth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  role TEXT DEFAULT 'operator',
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  last_login INTEGER
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);
