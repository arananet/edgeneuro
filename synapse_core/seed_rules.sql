-- ============================================================================
-- EdgeNeuro Default Rules Seed Data
-- Run: wrangler d1 execute edgeneuro-db --remote --file=./seed_rules.sql
-- ============================================================================

-- ============================================================================
-- INTENT RULES (Symbolic - keyword/pattern matching)
-- Priority: lower = higher priority
-- ============================================================================

-- IT Support Rules (agent_it)
INSERT OR IGNORE INTO intent_rules (id, pattern, agent_id, priority, enabled) VALUES
  ('rule_vpn', '(?i)(vpn|network|connection|remote|connect|wifi|internet|proxy)', 'agent_it', 1, 1),
  ('rule_password', '(?i)(password|login|access|locked|reset|2fa|mfa|authentication)', 'agent_it', 2, 1),
  ('rule_hardware', '(?i)(computer|laptop|keyboard|mouse|monitor|hardware|printer|scanner|device)', 'agent_it', 3, 1),
  ('rule_software', '(?i)(software|install|update|app|application|license|tool)', 'agent_it', 4, 1),
  ('rule_email', '(?i)(email|outlook|gmail|mail|exchange|distribution)', 'agent_it', 5, 1),
  ('rule_security', '(?i)(security|malware|virus|phishing|breach|permission|access)', 'agent_it', 6, 1),
  ('rule_account', '(?i)(account|ad|active directory|domain|windows|azure)', 'agent_it', 7, 1),

-- HR Support Rules (agent_hr)
  ('rule_vacation', '(?i)(vacation|holiday|pto|leave|time off|break|absent)', 'agent_hr', 10, 1),
  ('rule_payroll', '(?i)(pay|salary|payroll|bonus|compensation|stub|paycheck)', 'agent_hr', 11, 1),
  ('rule_benefits', '(?i)(benefits|insurance|health|dental|vision|401k|retirement)', 'agent_hr', 12, 1),
  ('rule_hiring', '(?i)(hire|recruit|interview|candidate|job|onboard|offer)', 'agent_hr', 13, 1),
  ('rule_policy', '(?i)(policy|procedure|handbook|guideline|rule)', 'agent_hr', 14, 1),
  ('rule_performance', '(?i)(performance|review| appraisal|goal|objective)', 'agent_hr', 15, 1),
  ('rule_complaint', '(?i)(complaint|harassment|concern|issue|report|escalate)', 'agent_hr', 16, 1);

-- ============================================================================
-- ACCESS RULES (Symbolic - Default Deny)
-- role -> topic -> access_level (READ, WRITE, ADMIN)
-- ============================================================================

-- IT Admin - Full Access
INSERT OR IGNORE INTO access_rules (id, role, topic, access_level, enabled) VALUES
  ('acc_it_admin_it', 'IT_ADMIN', 'IT_TICKETS', 'ADMIN', 1),
  ('acc_it_admin_hardware', 'IT_ADMIN', 'IT_HARDWARE', 'ADMIN', 1),
  ('acc_it_admin_vpn', 'IT_ADMIN', 'IT_VPN', 'ADMIN', 1),
  ('acc_it_admin_security', 'IT_ADMIN', 'IT_SECURITY', 'ADMIN', 1),
  ('acc_it_admin_infra', 'IT_ADMIN', 'INFRASTRUCTURE', 'ADMIN', 1),
  ('acc_it_admin_code', 'IT_ADMIN', 'CODE_REPOS', 'READ', 1),

-- HR Admin - Full HR Access
  ('acc_hr_admin_payroll', 'HR_ADMIN', 'PAYROLL', 'ADMIN', 1),
  ('acc_hr_admin_benefits', 'HR_ADMIN', 'BENEFITS', 'ADMIN', 1),
  ('acc_hr_admin_reviews', 'HR_ADMIN', 'PERFORMANCE_REVIEWS', 'ADMIN', 1),
  ('acc_hr_admin_hiring', 'HR_ADMIN', 'ONBOARDING', 'ADMIN', 1),
  ('acc_hr_admin_policy', 'HR_ADMIN', 'HR_POLICIES', 'READ', 1),

-- Manager - Team Access
  ('acc_manager_team', 'HR_MANAGER', 'PERFORMANCE_REVIEWS', 'WRITE', 1),
  ('acc_manager_approve', 'HR_MANAGER', 'EXPENSES', 'WRITE', 1),
  ('acc_manager_onboard', 'HR_MANAGER', 'ONBOARDING', 'WRITE', 1),

-- Employee - Basic Access
  ('acc_employee_tickets', 'EMPLOYEE', 'IT_TICKETS', 'WRITE', 1),
  ('acc_employee_hardware', 'EMPLOYEE', 'IT_HARDWARE', 'WRITE', 1),
  ('acc_employee_expenses', 'EMPLOYEE', 'EXPENSES', 'WRITE', 1),
  ('acc_employee_directory', 'EMPLOYEE', 'COMPANY_DIRECTORY', 'READ', 1),
  ('acc_employee_announce', 'EMPLOYEE', 'ANNOUNCEMENTS', 'READ', 1),
  ('acc_employee_policies', 'EMPLOYEE', 'HR_POLICIES', 'READ', 1),
  ('acc_employee_benefits', 'EMPLOYEE', 'BENEFITS', 'READ', 1),

-- Contractor - Limited Access
  ('acc_contractor_tickets', 'CONTRACTOR', 'IT_TICKETS', 'READ', 1),
  ('acc_contractor_directory', 'CONTRACTOR', 'COMPANY_DIRECTORY', 'READ', 1),
  ('acc_contractor_announce', 'CONTRACTOR', 'ANNOUNCEMENTS', 'READ', 1),

-- Finance - Finance Access
  ('acc_finance_invoices', 'FINANCE', 'INVOICES', 'ADMIN', 1),
  ('acc_finance_budget', 'FINANCE', 'BUDGET', 'READ', 1),
  ('acc_finance_reports', 'FINANCE', 'FINANCE_DASHBOARD', 'READ', 1),

-- Sales - Sales Access
  ('acc_sales_pipeline', 'SALES', 'PIPELINE', 'READ', 1),
  ('acc_sales_customers', 'SALES', 'CUSTOMER_DATA', 'READ', 1),
  ('acc_sales_reports', 'SALES', 'SALES_REPORTS', 'READ', 1);

-- ============================================================================
-- SYSTEM CONFIG
-- ============================================================================

INSERT OR IGNORE INTO system_config (key, value) VALUES
  ('routing_model', '@cf/meta/llama-3.2-1b-instruct'),
  ('neuro_symbolic_config', '{"enabled":true,"use_llm_validation":true,"confidence_threshold":0.75,"fallback_to_neural":true}');
