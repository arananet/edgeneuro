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

-- ============================================================================
-- NEURO-SYMBOLIC ACCESS CONTROL TABLES
-- ============================================================================
-- These tables support the symbolic layer of our neuro-symbolic architecture
-- Principle: Default Deny - if no explicit permission, access is DENIED
-- ============================================================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Insert default roles
INSERT OR IGNORE INTO roles (id, name, description) VALUES
  ('ADMIN', 'Administrator', 'Full system access'),
  ('HR_ADMIN', 'HR Administrator', 'Full HR access'),
  ('HR_MANAGER', 'HR Manager', 'Manage team HR'),
  ('FINANCE', 'Finance', 'Finance team access'),
  ('VP_FINANCE', 'VP Finance', 'Finance leadership'),
  ('VP_SALES', 'VP Sales', 'Sales leadership'),
  ('VP_ENGINEERING', 'VP Engineering', 'Engineering leadership'),
  ('VP_MARKETING', 'VP Marketing', 'Marketing leadership'),
  ('SALES', 'Sales', 'Sales team'),
  ('MARKETING', 'Marketing', 'Marketing team'),
  ('ENGINEERING', 'Engineering', 'Engineering team'),
  ('IT_ADMIN', 'IT Administrator', 'IT admin access'),
  ('CUSTOMER_SUCCESS', 'Customer Success', 'Customer success team'),
  ('EMPLOYEE', 'Employee', 'Standard employee'),
  ('CONTRACTOR', 'Contractor', 'External contractor');

-- Topics (resources that can be accessed)
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  sensitivity_level INTEGER DEFAULT 1,  -- 1=public, 2=internal, 3=confidential, 4=restricted
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Insert default topics
INSERT OR IGNORE INTO topics (id, name, sensitivity_level) VALUES
  ('PAYROLL', 'Payroll Data', 4),
  ('BENEFITS', 'Benefits Information', 3),
  ('PERFORMANCE_REVIEWS', 'Performance Reviews', 4),
  ('FINANCE_DASHBOARD', 'Finance Dashboard', 4),
  ('BUDGET', 'Budget Planning', 3),
  ('EXPENSES', 'Expense Reports', 2),
  ('INVOICES', 'Invoice Management', 3),
  ('SALES_REPORTS', 'Sales Reports', 3),
  ('CUSTOMER_DATA', 'Customer Data', 4),
  ('PIPELINE', 'Sales Pipeline', 3),
  ('IT_TICKETS', 'IT Support Tickets', 1),
  ('IT_HARDWARE', 'Hardware Requests', 1),
  ('IT_VPN', 'VPN & Access', 2),
  ('IT_SECURITY', 'Security Settings', 4),
  ('ENGINEERING_WIKI', 'Engineering Wiki', 2),
  ('CODE_REPOS', 'Code Repositories', 3),
  ('INFRASTRUCTURE', 'Infrastructure', 4),
  ('MARKETING_CAMPAIGNS', 'Marketing Campaigns', 2),
  ('MARKETING_ANALYTICS', 'Marketing Analytics', 2),
  ('BRAND_ASSETS', 'Brand Assets', 2),
  ('HR_POLICIES', 'HR Policies', 1),
  ('COMPANY_DIRECTORY', 'Company Directory', 1),
  ('ANNOUNCEMENTS', 'Company Announcements', 1),
  ('ONBOARDING', 'Onboarding', 1),
  ('ADMIN_PANEL', 'Admin Panel', 4),
  ('USER_MANAGEMENT', 'User Management', 4),
  ('AUDIT_LOGS', 'Audit Logs', 4),
  ('SYSTEM_CONFIG', 'System Configuration', 4),
  ('GENERAL_SUPPORT', 'General Support', 1);

-- Permissions: explicit role -> topic access
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL REFERENCES roles(id),
  topic_id TEXT NOT NULL REFERENCES topics(id),
  access_level TEXT DEFAULT 'READ',  -- READ, WRITE, ADMIN
  created_by TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  UNIQUE(role_id, topic_id)
);

-- Routing rules: additional conditions
CREATE TABLE IF NOT EXISTS routing_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  condition_json TEXT NOT NULL,  -- JSON conditions
  action TEXT NOT NULL,  -- ALLOW, DENY, REDIRECT
  redirect_topic TEXT,
  priority INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Access logs: audit trail
CREATE TABLE IF NOT EXISTS access_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_email TEXT,
  user_role TEXT,
  query_text TEXT,
  requested_topic TEXT,
  decision TEXT NOT NULL,  -- ALLOWED, DENIED, REDIRECTED
  reason TEXT,
  audit_id TEXT UNIQUE,
  timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_access_logs_user ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_topic ON access_logs(requested_topic);
CREATE INDEX IF NOT EXISTS idx_access_logs_audit ON access_logs(audit_id);

-- System Configuration
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
