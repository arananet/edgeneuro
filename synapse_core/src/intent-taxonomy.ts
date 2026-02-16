/**
 * EdgeNeuro Intent Taxonomy (Knowledge Graph)
 * 
 * Neuro-Symbolic Intent Detection
 * ===============================
 * 
 * This module implements the SYMBOLIC layer for INTENT DETECTION.
 * Instead of relying solely on LLM pattern matching, we use a 
 * Knowledge Graph to:
 * - Define explicit intent taxonomy
 * - Map keywords to intents
 * - Handle context and relationships between intents
 * - Validate LLM output against symbolic rules
 * 
 * HOW IT WORKS:
 * 
 *    User Query
 *         │
 *         ▼
 *    ┌─────────────────┐
 *    │  LLM (Neural)   │ → Initial intent detection
 *    └────────┬────────┘
 *              │
 *              ▼
 *    ┌─────────────────────┐
 *    │ Knowledge Graph    │ → Validate/resolve intent
 *    │ - Taxonomy         │   against known intents
 *    │ - Keywords         │
 *    │ - Relationships    │
 *    │ - Context rules    │
 *    └────────┬────────────┘
 *              │
 *              ▼
 *    ┌─────────────────────┐
 *    │  Symbolically       │ → Final intent with
 *    │  Resolved Intent   │   reasoning path
 *    └─────────────────────┘
 * 
 * @module intent-taxonomy
 * @version 2.0.0
 * @date 2026-02-15
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * An intent in the taxonomy
 */
export interface Intent {
  id: string;
  name: string;
  description: string;
  category: IntentCategory;
  keywords: string[];
  phrases: string[];
  related: string[];  // Related intents
  requiresContext: boolean;
  agent?: string;     // Default agent for this intent
  sensitivity: number; // 1=public, 4=restricted
}

/**
 * Intent categories
 */
export type IntentCategory = 
  | 'IT'           // IT Support
  | 'HR'           // Human Resources
  | 'SALES'        // Sales
  | 'FINANCE'      // Finance
  | 'MARKETING'    // Marketing
  | 'ENGINEERING'  // Engineering
  | 'GENERAL'      // General
  | 'SECURITY';    // Security

/**
 * Result of intent detection
 */
export interface IntentDetectionResult {
  intent: string;
  confidence: number;
  category: IntentCategory;
  reasoning: string;
  path: string[];  // Path through KG
  requiresContext: boolean;
  isAmbiguous: boolean;
  alternatives: string[];
}

/**
 * User query with context
 */
export interface QueryContext {
  userId: string;
  role: string;
  department: string;
  history?: string[];  // Previous queries
  sessionActive: boolean;
}

// =============================================================================
// INTENT TAXONOMY (Symbolic Knowledge Base)
// =============================================================================

/**
 * Complete intent taxonomy - the SYMBOLIC knowledge base for intent detection
 * This replaces pure LLM pattern matching with explicit, auditable rules
 */
export const INTENT_TAXONOMY: Intent[] = [
  // IT Category
  {
    id: 'intent:IT_VPN',
    name: 'IT_VPN',
    description: 'VPN and network connectivity issues',
    category: 'IT',
    keywords: ['vpn', 'network', 'connection', 'remote', 'connectivity'],
    phrases: ['can\'t connect', 'not working', 'connection failed', 'network error'],
    related: ['intent:IT_PASSWORD', 'intent:IT_ACCESS'],
    requiresContext: false,
    agent: 'agent_it',
    sensitivity: 2
  },
  {
    id: 'intent:IT_PASSWORD',
    name: 'IT_Password',
    description: 'Password reset and account access',
    category: 'IT',
    keywords: ['password', 'reset', 'login', 'access', 'locked'],
    phrases: ['forgot password', 'can\'t login', 'reset my password', 'account locked'],
    related: ['intent:IT_VPN', 'intent:IT_ACCESS'],
    requiresContext: false,
    agent: 'agent_it',
    sensitivity: 2
  },
  {
    id: 'intent:IT_HARDWARE',
    name: 'IT_Hardware',
    description: 'Laptop, equipment, and hardware requests',
    category: 'IT',
    keywords: ['laptop', 'hardware', 'equipment', 'mouse', 'keyboard', 'monitor'],
    phrases: ['need a laptop', 'broken screen', 'new computer', 'equipment request'],
    related: ['intent:IT_TICKET'],
    requiresContext: false,
    agent: 'agent_it',
    sensitivity: 1
  },
  {
    id: 'intent:IT_TICKET',
    name: 'IT_Ticket',
    description: 'Create or check IT support tickets',
    category: 'IT',
    keywords: ['ticket', 'support', 'issue', 'problem', 'help'],
    phrases: ['create ticket', 'check ticket', 'support request', 'open ticket'],
    related: ['intent:IT_VPN', 'intent:IT_PASSWORD'],
    requiresContext: false,
    agent: 'agent_it',
    sensitivity: 1
  },

  // HR Category
  {
    id: 'intent:HR_BENEFITS',
    name: 'HR_Benefits',
    description: 'Benefits enrollment and information',
    category: 'HR',
    keywords: ['benefits', 'insurance', 'health', 'dental', 'vision', 'vacation', 'pto'],
    phrases: ['vacation days', 'benefits info', 'health insurance', 'time off'],
    related: ['intent:HR_PAYROLL', 'intent:HR_POLICIES'],
    requiresContext: false,
    agent: 'agent_hr',
    sensitivity: 2
  },
  {
    id: 'intent:HR_PAYROLL',
    name: 'HR_Payroll',
    description: 'Payroll and compensation inquiries',
    category: 'HR',
    keywords: ['payroll', 'salary', 'paycheck', 'compensation', 'bonus'],
    phrases: ['my pay', 'paycheck', 'salary', 'bonus', 'compensation'],
    related: ['intent:HR_BENEFITS'],
    requiresContext: true,  // Sensitive!
    agent: 'agent_hr',
    sensitivity: 4
  },
  {
    id: 'intent:HR_POLICIES',
    name: 'HR_Policies',
    description: 'Company policies and handbooks',
    category: 'HR',
    keywords: ['policy', 'policies', 'handbook', 'guidelines', 'rules'],
    phrases: ['company policy', 'employee handbook', 'guidelines', 'rules'],
    related: ['intent:HR_BENEFITS'],
    requiresContext: false,
    agent: 'agent_hr',
    sensitivity: 1
  },
  {
    id: 'intent:HR_ONBOARDING',
    name: 'HR_Onboarding',
    description: 'New employee onboarding',
    category: 'HR',
    keywords: ['onboarding', 'new hire', 'new employee', 'setup'],
    phrases: ['new employee', 'onboarding', 'first day', 'getting started'],
    related: ['intent:HR_POLICIES', 'intent:IT_SETUP'],
    requiresContext: false,
    agent: 'agent_hr',
    sensitivity: 1
  },

  // Sales Category
  {
    id: 'intent:SALES_REPORTS',
    name: 'Sales_Reports',
    description: 'Sales data and reports',
    category: 'SALES',
    keywords: ['sales', 'revenue', 'quota', 'pipeline', 'deals', 'report'],
    phrases: ['sales report', 'revenue data', 'quota', 'pipeline'],
    related: ['intent:SALES_CUSTOMERS'],
    requiresContext: false,
    agent: 'sql-agent',
    sensitivity: 2
  },
  {
    id: 'intent:SALES_CUSTOMERS',
    name: 'Sales_Customers',
    description: 'Customer data and accounts',
    category: 'SALES',
    keywords: ['customer', 'account', 'client', 'crm'],
    phrases: ['customer data', 'accounts', 'client list', 'crm'],
    related: ['intent:SALES_REPORTS'],
    requiresContext: true,
    agent: 'sql-agent',
    sensitivity: 3
  },

  // Finance Category
  {
    id: 'intent:FINANCE_EXPENSES',
    name: 'Finance_Expenses',
    description: 'Expense reports and reimbursement',
    category: 'FINANCE',
    keywords: ['expense', 'reimbursement', 'receipt', 'submit'],
    phrases: ['expense report', 'submit expense', 'reimbursement'],
    related: ['intent:FINANCE_INVOICES'],
    requiresContext: false,
    agent: 'finance-agent',
    sensitivity: 2
  },
  {
    id: 'intent:FINANCE_INVOICES',
    name: 'Finance_Invoices',
    description: 'Invoice management',
    category: 'FINANCE',
    keywords: ['invoice', 'billing', 'payment'],
    phrases: ['invoice', 'billing', 'payment'],
    related: ['intent:FINANCE_EXPENSES'],
    requiresContext: true,
    agent: 'finance-agent',
    sensitivity: 3
  },

  // Engineering Category
  {
    id: 'intent:ENG_CODE',
    name: 'Eng_Code',
    description: 'Code repositories and access',
    category: 'ENGINEERING',
    keywords: ['code', 'repo', 'repository', 'git', 'github'],
    phrases: ['code repo', 'git access', 'repository'],
    related: ['intent:ENG_INFRA'],
    requiresContext: false,
    agent: 'eng-agent',
    sensitivity: 2
  },
  {
    id: 'intent:ENG_INFRA',
    name: 'Eng_Infra',
    description: 'Infrastructure and deployments',
    category: 'ENGINEERING',
    keywords: ['deploy', 'infrastructure', 'server', 'aws', 'cloud'],
    phrases: ['deploy', 'infrastructure', 'server', 'aws'],
    related: ['intent:ENG_CODE'],
    requiresContext: true,
    agent: 'eng-agent',
    sensitivity: 3
  },

  // Marketing Category
  {
    id: 'intent:MKT_CAMPAIGNS',
    name: 'Mkt_Campaigns',
    description: 'Marketing campaigns and analytics',
    category: 'MARKETING',
    keywords: ['campaign', 'marketing', 'analytics', 'advertising'],
    phrases: ['marketing campaign', 'analytics', 'ad performance'],
    related: ['intent:MKT_ASSETS'],
    requiresContext: false,
    agent: 'marketing-agent',
    sensitivity: 2
  },
  {
    id: 'intent:MKT_ASSETS',
    name: 'Mkt_Assets',
    description: 'Brand assets and creative',
    category: 'MARKETING',
    keywords: ['brand', 'assets', 'logo', 'creative', 'design'],
    phrases: ['brand assets', 'logo', 'creative files'],
    related: ['intent:MKT_CAMPAIGNS'],
    requiresContext: false,
    agent: 'marketing-agent',
    sensitivity: 1
  },

  // Security
  {
    id: 'intent:SECURITY',
    name: 'Security',
    description: 'Security incidents and concerns',
    category: 'SECURITY',
    keywords: ['security', 'breach', 'phishing', 'suspicious', 'hack'],
    phrases: ['security issue', 'phishing', 'suspicious email', 'breach'],
    related: ['intent:IT_VPN'],
    requiresContext: false,
    agent: 'security-agent',
    sensitivity: 4
  },

  // General
  {
    id: 'intent:GENERAL',
    name: 'General',
    description: 'General inquiries and help',
    category: 'GENERAL',
    keywords: ['help', 'question', 'general', 'other'],
    phrases: ['help', 'question', 'how do i'],
    related: [],
    requiresContext: false,
    agent: 'agent_fallback',
    sensitivity: 1
  }
];

// =============================================================================
// KEYWORD MAPPINGS (for fast lookup)
// =============================================================================

/**
 * Fast keyword to intent mapping
 */
export const KEYWORD_TO_INTENT: Record<string, string[]> = {};

// Build keyword index
for (const intent of INTENT_TAXONOMY) {
  for (const keyword of intent.keywords) {
    if (!KEYWORD_TO_INTENT[keyword.toLowerCase()]) {
      KEYWORD_TO_INTENT[keyword.toLowerCase()] = [];
    }
    KEYWORD_TO_INTENT[keyword.toLowerCase()].push(intent.id);
  }
  for (const phrase of intent.phrases) {
    // Add first word of phrase
    const firstWord = phrase.split(' ')[0].toLowerCase();
    if (!KEYWORD_TO_INTENT[firstWord]) {
      KEYWORD_TO_INTENT[firstWord] = [];
    }
    KEYWORD_TO_INTENT[firstWord].push(intent.id);
  }
}

// =============================================================================
// SYMBOLIC INTENT DETECTION ENGINE
// =============================================================================

/**
 * Symbolic Intent Detector
 * 
 * Uses Knowledge Graph principles for intent detection:
 * - Explicit taxonomy (no hidden patterns)
 * - Keyword matching with context
 * - Related intent resolution
 * - LLM validation layer
 */
export class SymbolicIntentDetector {
  private taxonomy: Intent[];
  private keywordIndex: Record<string, string[]>;
  
  constructor() {
    this.taxonomy = INTENT_TAXONOMY;
    this.keywordIndex = KEYWORD_TO_INTENT;
  }
  
  /**
   * Detect intent using symbolic rules
   * 
   * @param query - User query string
   * @param context - Optional context (role, history)
   * @returns Detected intent with reasoning
   */
  detect(query: string, context?: QueryContext): IntentDetectionResult {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/);
    
    // Step 1: Find matching intents by keywords
    const candidates = this.findCandidates(queryLower, words);
    
    if (candidates.length === 0) {
      return this.unknownIntent(query);
    }
    
    if (candidates.length === 1) {
      return this.resolvedIntent(candidates[0], 'keyword_match', context);
    }
    
    // Step 2: Multiple candidates - check for disambiguation
    const disambiguated = this.disambiguate(candidates, queryLower, context);
    
    if (disambiguated) {
      return disambiguated;
    }
    
    // Step 3: Still ambiguous - return top candidate with alternatives
    const topCandidate = this.getTopCandidate(candidates, queryLower);
    return {
      ...this.intentToResult(topCandidate, context),
      isAmbiguous: true,
      alternatives: candidates.map(c => c.name),
      reasoning: `Multiple intents match. Selected: ${topCandidate.name}`
    };
  }
  
  /**
   * Find candidate intents matching query
   */
  private findCandidates(query: string, words: string[]): Intent[] {
    const scores: Map<string, number> = new Map();
    
    // Score by keyword matches
    for (const [keyword, intentIds] of Object.entries(this.keywordIndex)) {
      if (query.includes(keyword)) {
        for (const intentId of intentIds) {
          const current = scores.get(intentId) || 0;
          scores.set(intentId, current + 1);
        }
      }
    }
    
    // Sort by score
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1]);
    
    // Get intents
    const candidates: Intent[] = [];
    for (const [intentId] of sorted) {
      const intent = this.taxonomy.find(i => i.id === intentId);
      if (intent) {
        candidates.push(intent);
      }
    }
    
    return candidates;
  }
  
  /**
   * Disambiguate between candidates
   */
  private disambiguate(
    candidates: Intent[], 
    query: string,
    context?: QueryContext
  ): IntentDetectionResult | null {
    // Check if any intent is related to another
    for (const candidate of candidates) {
      if (candidate.related.length > 0) {
        const relatedMatch = candidates.find(c => 
          candidate.related.includes(c.id)
        );
        
        if (relatedMatch) {
          // Found related intents - prefer more specific
          if (candidate.keywords.length > relatedMatch.keywords.length) {
            return this.resolvedIntent(candidate, 'related_disambiguation', context);
          } else {
            return this.resolvedIntent(relatedMatch, 'related_disambiguation', context);
          }
        }
      }
    }
    
    // Check context
    if (context?.role) {
      const roleMatch = candidates.find(c => 
        c.agent && this.isAgentForRole(c.agent, context.role)
      );
      if (roleMatch) {
        return this.resolvedIntent(roleMatch, 'context_role', context);
      }
    }
    
    return null;
  }
  
  /**
   * Check if agent matches role
   */
  private isAgentForRole(agent: string, role: string): boolean {
    const roleAgentMap: Record<string, string[]> = {
      'IT': ['it-agent'],
      'HR': ['hr-agent'],
      'SALES': ['sql-agent'],
      'FINANCE': ['finance-agent'],
      'ENGINEERING': ['eng-agent'],
      'MARKETING': ['marketing-agent']
    };
    
    return roleAgentMap[role]?.includes(agent) || false;
  }
  
  /**
   * Get top candidate by keyword match score
   */
  private getTopCandidate(candidates: Intent[], query: string): Intent {
    let top = candidates[0];
    let maxKeywords = 0;
    
    for (const candidate of candidates) {
      let matchCount = 0;
      for (const keyword of candidate.keywords) {
        if (query.includes(keyword)) matchCount++;
      }
      if (matchCount > maxKeywords) {
        maxKeywords = matchCount;
        top = candidate;
      }
    }
    
    return top;
  }
  
  /**
   * Convert intent to detection result
   */
  private intentToResult(intent: Intent, context?: QueryContext): IntentDetectionResult {
    return {
      intent: intent.name,
      confidence: 0.9,
      category: intent.category,
      reasoning: `Intent detected via symbolic rules: ${intent.name}`,
      path: [`QUERY`, intent.id],
      requiresContext: intent.requiresContext,
      isAmbiguous: false,
      alternatives: []
    };
  }
  
  /**
   * Resolved intent with reasoning
   */
  private resolvedIntent(
    intent: Intent, 
    reason: string,
    context?: QueryContext
  ): IntentDetectionResult {
    return {
      intent: intent.name,
      confidence: reason === 'keyword_match' ? 0.95 : 0.85,
      category: intent.category,
      reasoning: `Symbolic resolution: ${reason}`,
      path: ['QUERY', intent.id],
      requiresContext: intent.requiresContext,
      isAmbiguous: false,
      alternatives: []
    };
  }
  
  /**
   * Unknown intent
   */
  private unknownIntent(query: string): IntentDetectionResult {
    return {
      intent: 'UNKNOWN',
      confidence: 0.0,
      category: 'GENERAL',
      reasoning: 'No matching intent found in taxonomy',
      path: ['QUERY', 'NO_MATCH'],
      requiresContext: false,
      isAmbiguous: false,
      alternatives: []
    };
  }
  
  /**
   * Get all intents (for inspection)
   */
  getAllIntents(): Intent[] {
    return this.taxonomy;
  }
  
  /**
   * Get intents by category
   */
  getIntentsByCategory(category: IntentCategory): Intent[] {
    return this.taxonomy.filter(i => i.category === category);
  }
  
  /**
   * Get taxonomy statistics
   */
  getStats(): { total: number; byCategory: Record<IntentCategory, number> } {
    const byCategory: Record<IntentCategory, number> = {
      'IT': 0, 'HR': 0, 'SALES': 0, 'FINANCE': 0,
      'MARKETING': 0, 'ENGINEERING': 0, 'GENERAL': 0, 'SECURITY': 0
    };
    
    for (const intent of this.taxonomy) {
      byCategory[intent.category]++;
    }
    
    return { total: this.taxonomy.length, byCategory };
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create intent detector
 */
export function createIntentDetector(): SymbolicIntentDetector {
  return new SymbolicIntentDetector();
}

/**
 * Default singleton
 */
export const intentDetector = new SymbolicIntentDetector();
