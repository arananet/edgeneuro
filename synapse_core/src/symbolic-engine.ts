/**
 * EdgeNeuro Symbolic Engine
 * 
 * Neuro-Symbolic Technology Implementation
 * =========================================
 * 
 * This module implements the SYMBOLIC layer of our neuro-symbolic architecture.
 * It provides explicit, auditable, and deterministic access control based on
 * formal rules, complementing the NEURAL layer (LLM-based intent detection).
 * 
 * PRINCIPLE: Default Deny (Privilege Minimal)
 * - If no explicit permission exists, access is DENIED
 * - This is more secure than "allow by default"
 * - Eliminates uncertainty in access decisions
 * 
 * ARCHITECTURE:
 * - Neural: LLM detects user intent (what they want)
 * - Symbolic: Knowledge Graph enforces access policy (what they CAN have)
 * 
 * KNOWLEDGE GRAPH:
 * - Nodes: USER, ROLE, GROUP, TOPIC, AGENT, RULE
 * - Edges: HAS_ROLE, CAN_ACCESS, MEMBER_OF, ROUTES_TO
 * - Enables: Complex queries, explainable reasoning, dynamic updates
 * 
 * @module symbolic-engine
 * @version 2.0.0
 * @date 2026-02-15
 */

import { KGAccessEngine, KnowledgeGraph, kgAccessEngine, KGAccessDecision } from './knowledge-graph';

// =============================================================================
// TYPES
// =============================================================================

/**
 * User profile extracted from authentication (OAuth, headers, etc.)
 */
export interface UserProfile {
  userId: string;
  email: string;
  role: string;
  department: string;
  groups: string[];
}

/**
 * Access policy maps topics to allowed roles
 * (Legacy - now using Knowledge Graph internally)
 */
export interface AccessPolicy {
  [topic: string]: string[];  // topic -> roles with access, "ALL" for anyone
}

/**
 * Result of intent detection (from LLM)
 */
export interface IntentResult {
  topic: string;
  confidence: number;
  reasoning: string;
}

/**
 * Decision returned by the symbolic engine
 */
export interface AccessDecision {
  decision: 'ALLOW' | 'DENY';
  reason: string;
  topic: string;
  userRole: string;
  alternatives: string[];
  auditId: string;
  graphReasoning?: string;  // New: explainable reasoning from KG
}

/**
 * Complete routing decision combining neural + symbolic
 */
export interface RoutingDecision {
  // Neural layer output
  intent: IntentResult;
  
  // Symbolic layer output
  access: AccessDecision;
  
  // Final routing
  allowed: boolean;
  target: string | null;
  response: {
    message: string;
    alternatives?: string[];
    action_suggestions?: string[];
  };
}

// =============================================================================
// DEFAULT ACCESS POLICY (LEGACY - Now using Knowledge Graph)
// =============================================================================

/**
 * Default enterprise access policy
 * 
 * This is the SYMBOLIC layer - explicit, auditable rules
 * NOTE: Now stored in Knowledge Graph for better queryability
 * 
 * Format: { TOPIC: [ROLES_WITH_ACCESS] }
 * Special value: "ALL" means any authenticated user
 */
export const DEFAULT_ACCESS_POLICY: AccessPolicy = {
  // HR Topics - Restricted
  'PAYROLL': ['HR_ADMIN', 'FINANCE', 'CEO', 'VP_FINANCE'],
  'BENEFITS': ['HR_ADMIN', 'HR_MANAGER', 'CEO'],
  'PERFORMANCE_REVIEWS': ['HR_ADMIN', 'HR_MANAGER', 'CEO', 'VP_SALES', 'VP_ENGINEERING'],
  
  // Finance Topics - Restricted
  'FINANCE_DASHBOARD': ['FINANCE', 'CEO', 'VP_FINANCE'],
  'BUDGET': ['FINANCE', 'CEO', 'VP_FINANCE', 'VP_SALES', 'VP_ENGINEERING'],
  'EXPENSES': ['ALL'],  // Everyone can submit expenses
  'INVOICES': ['FINANCE', 'CEO', 'VP_FINANCE'],
  
  // Sales Topics - More open
  'SALES_REPORTS': ['SALES', 'MARKETING', 'CEO', 'VP_SALES', 'VP_FINANCE'],
  'CUSTOMER_DATA': ['SALES', 'CUSTOMER_SUCCESS', 'CEO', 'VP_SALES'],
  'PIPELINE': ['SALES', 'CEO', 'VP_SALES'],
  
  // IT Topics - Generally open for employees
  'IT_TICKETS': ['ALL'],
  'IT_HARDWARE': ['ALL'],
  'IT_VPN': ['ALL'],
  'IT_SECURITY': ['IT_ADMIN', 'SECURITY', 'CEO'],
  'IT_ADMIN': ['IT_ADMIN'],
  
  // Engineering
  'ENGINEERING_WIKI': ['ENGINEERING', 'CTO', 'VP_ENGINEERING'],
  'CODE_REPOS': ['ENGINEERING', 'CTO', 'VP_ENGINEERING'],
  'INFRASTRUCTURE': ['ENGINEERING', 'IT_ADMIN', 'CTO', 'VP_ENGINEERING'],
  
  // Marketing
  'MARKETING_CAMPAIGNS': ['MARKETING', 'CEO', 'VP_MARKETING'],
  'MARKETING_ANALYTICS': ['MARKETING', 'CEO', 'VP_MARKETING'],
  'BRAND_ASSETS': ['MARKETING', 'CREATIVE', 'CEO', 'VP_MARKETING'],
  
  // General/Public
  'HR_POLICIES': ['ALL'],
  'COMPANY_DIRECTORY': ['ALL'],
  'ANNOUNCEMENTS': ['ALL'],
  'ONBOARDING': ['ALL'],
  
  // Admin
  'ADMIN_PANEL': ['ADMIN'],
  'USER_MANAGEMENT': ['ADMIN', 'HR_ADMIN'],
  'AUDIT_LOGS': ['ADMIN', 'SECURITY'],
  'SYSTEM_CONFIG': ['ADMIN', 'IT_ADMIN', 'CTO'],
  
  // Fallback
  'GENERAL_SUPPORT': ['ALL'],
  'FALLBACK': ['ALL']
};

/**
 * Topic aliases - maps common queries to canonical topics
 * This helps the symbolic engine understand user intent
 */
export const TOPIC_ALIASES: Record<string, string> = {
  // HR aliases
  'vacation': 'BENEFITS',
  'pto': 'BENEFITS',
  'time off': 'BENEFITS',
  'payroll': 'PAYROLL',
  'salary': 'PAYROLL',
  'bonus': 'PAYROLL',
  'compensation': 'PAYROLL',
  'review': 'PERFORMANCE_REVIEWS',
  'performance': 'PERFORMANCE_REVIEWS',
  
  // Finance aliases
  'revenue': 'FINANCE_DASHBOARD',
  'budget': 'BUDGET',
  'expense': 'EXPENSES',
  'invoice': 'INVOICES',
  
  // Sales aliases
  'customers': 'CUSTOMER_DATA',
  'accounts': 'CUSTOMER_DATA',
  'pipeline': 'PIPELINE',
  'quota': 'SALES_REPORTS',
  'deals': 'SALES_REPORTS',
  
  // IT aliases
  'ticket': 'IT_TICKETS',
  'laptop': 'IT_HARDWARE',
  'hardware': 'IT_HARDWARE',
  'vpn': 'IT_VPN',
  'password': 'IT_VPN',
  'access': 'IT_VPN',
  'security': 'IT_SECURITY',
  
  // Engineering aliases
  'code': 'CODE_REPOS',
  'repository': 'CODE_REPOS',
  'repo': 'CODE_REPOS',
  'infrastructure': 'INFRASTRUCTURE',
  'deploy': 'INFRASTRUCTURE',
  
  // Marketing aliases
  'campaign': 'MARKETING_CAMPAIGNS',
  'analytics': 'MARKETING_ANALYTICS',
  'brand': 'BRAND_ASSETS',
  
  // General
  'policy': 'HR_POLICIES',
  'policies': 'HR_POLICIES',
  'directory': 'COMPANY_DIRECTORY',
  'help': 'GENERAL_SUPPORT',
  'support': 'GENERAL_SUPPORT'
};

// =============================================================================
// SYMBOLIC ENGINE CORE (Now using Knowledge Graph)
// =============================================================================

/**
 * The Symbolic Engine - Core of Neuro-Symbolic Access Control
 * 
 * Uses Knowledge Graph for:
 * - Deterministic decisions (no randomness)
 * - Full auditability (every decision logged)
 * - Explicit rules (no "maybe" answers)
 * - Explainable reasoning (traceable paths)
 * - Default deny (most secure approach)
 * 
 * @version 2.0 - Now with Knowledge Graph
 */
export class SymbolicEngine {
  private kgEngine: KGAccessEngine;
  
  constructor(kgEngine?: KGAccessEngine) {
    // Use provided KG engine or create default
    this.kgEngine = kgEngine || kgAccessEngine;
  }
  
  /**
   * Resolve topic alias to canonical topic
   * This is part of the SYMBOLIC interpretation layer
   */
  resolveTopic(userQuery: string): string {
    const queryLower = userQuery.toLowerCase();
    
    // Check aliases first
    for (const [alias, canonical] of Object.entries(TOPIC_ALIASES)) {
      if (queryLower.includes(alias)) {
        return canonical;
      }
    }
    
    // Check if any policy topic is mentioned directly
    for (const topic of Object.keys(DEFAULT_ACCESS_POLICY)) {
      if (queryLower.includes(topic.toLowerCase())) {
        return topic;
      }
    }
    
    return 'GENERAL_SUPPORT';  // Default topic
  }
  
  /**
   * Evaluate access request using KNOWLEDGE GRAPH reasoning
   * 
   * This is the CORE of our neuro-symbolic approach:
   * - Input: User intent (from Neural layer) + User profile
   * - Process: Query Knowledge Graph for explicit permission paths
   * - Output: ALLOW or DENY with full graph reasoning
   * 
   * @param userIntent - Topic detected by LLM (Neural layer)
   * @param userProfile - User's role/department (from auth)
   * @returns AccessDecision with full reasoning
   */
  evaluateAccess(userIntent: string, userProfile: UserProfile): AccessDecision {
    const topic = this.resolveTopic(userIntent);
    
    // Use Knowledge Graph for access evaluation
    const kgDecision = this.kgEngine.evaluateAccess(userProfile.role, topic);
    
    // Convert KG decision to our format
    return {
      decision: kgDecision.decision,
      reason: kgDecision.reason,
      topic: kgDecision.topic,
      userRole: kgDecision.userRole,
      alternatives: kgDecision.alternatives,
      auditId: kgDecision.auditId,
      graphReasoning: kgDecision.graphReasoning  // NEW: Explainable reasoning
    };
  }
  
  /**
   * Get all topics a role can access (from Knowledge Graph)
   * Used for UX suggestions when access is denied
   */
  getAlternativesForRole(role: string): string[] {
    return this.kgEngine.getAlternatives(role);
  }
  
  /**
   * Full routing decision combining Neural + Symbolic
   * 
   * This is where NEURAL meets SYMBOLIC:
   * 1. Neural: LLM detects intent → userIntent
   * 2. Symbolic: Knowledge Graph evaluates policy → access decision
   * 3. Combined: Full routing response
   */
  makeRoutingDecision(
    intent: IntentResult,
    userProfile: UserProfile,
    agentMapping: Record<string, string>  // topic → agent ID mapping
  ): RoutingDecision {
    // Symbolic evaluation using Knowledge Graph
    const access = this.evaluateAccess(intent.topic, userProfile);
    
    if (access.decision === 'DENY') {
      return {
        intent,
        access,
        allowed: false,
        target: null,
        response: {
          message: `Access denied to ${access.topic}. Reason: ${access.graphReasoning || access.reason}`,
          alternatives: access.alternatives.slice(0, 5),
          action_suggestions: [
            'Contact your manager to request access',
            'Use the access request form',
            'Try one of the topics you have access to'
          ]
        }
      };
    }
    
    // Access allowed - map to agent
    const target = agentMapping[access.topic] || agentMapping['GENERAL_SUPPORT'];
    
    return {
      intent,
      access,
      allowed: true,
      target,
      response: {
        message: `Access granted to ${access.topic} (${access.graphReasoning || 'permission found'})`
      }
    };
  }
  
  /**
   * Get Knowledge Graph instance (for inspection/debugging)
   */
  getKnowledgeGraph(): KnowledgeGraph {
    return this.kgEngine.getGraph();
  }
  
  /**
   * Get graph statistics
   */
  getStats(): { nodes: number; edges: number; roles: number; topics: number } {
    return this.kgEngine.getGraph().getStats();
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create symbolic engine with default Knowledge Graph
 */
export function createSymbolicEngine(kgEngine?: KGAccessEngine): SymbolicEngine {
  return new SymbolicEngine(kgEngine);
}

/**
 * Default singleton instance
 */
export const symbolicEngine = new SymbolicEngine();

// Re-export Knowledge Graph components for direct use
export { KGAccessEngine, KnowledgeGraph, kgAccessEngine } from './knowledge-graph';
export type { KGAccessDecision, KGNode, KGEdge, KGPath, KGQueryResult } from './knowledge-graph';
