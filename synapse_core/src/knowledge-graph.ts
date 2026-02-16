/**
 * EdgeNeuro Knowledge Graph Engine
 * 
 * Neuro-Symbolic Technology: Knowledge Graph Implementation
 * ========================================================
 * 
 * This module implements a GRAPH-BASED symbolic engine for access control.
 * Instead of simple key-value mappings, we use a proper knowledge graph
 * that enables:
 * - Complex queries (transitive access, implied permissions)
 * - Explainable reasoning (traceable decision paths)
 * - Dynamic updates without code changes
 * - Rich relationships between entities
 * 
 * GRAPH STRUCTURE:
 * 
 *    ┌──────────┐         ┌─────────┐         ┌─────────┐
 *    │   USER   │────────▶│   ROLE  │────────▶│ TOPIC  │
 *    └──────────┘         └─────────┘         └─────────┘
 *         │                    │                    │
 *         │                    │ CAN_ACCESS         │
 *         │                    │                    │
 *         │                    ▼                    │
 *         │              ┌─────────┐               │
 *         └────────────▶│PERMISSION│◀─────────────┘
 *                        └─────────┘
 *                             │
 *                    ┌────────┴────────┐
 *                    │                 │
 *                    ▼                 ▼
 *              [ALLOW]            [DENY]
 * 
 * @module knowledge-graph-engine
 * @version 2.0.0
 * @date 2026-02-15
 */

// =============================================================================
// TYPES - Graph Elements
// =============================================================================

/**
 * Node types in the knowledge graph
 */
export type NodeType = 'USER' | 'ROLE' | 'GROUP' | 'TOPIC' | 'AGENT' | 'RULE' | 'CAPABILITY';

/**
 * Edge types (relationships) in the knowledge graph
 */
export type EdgeType = 
  | 'HAS_ROLE'          // USER → ROLE
  | 'MEMBER_OF'         // USER → GROUP
  | 'HAS_CAPABILITY'    // USER → CAPABILITY (dynamic!)
  | 'GRANTED_BY'        // CAPABILITY → USER (who granted it)
  | 'CAN_ACCESS'        // ROLE/CAPABILITY → TOPIC (with access level)
  | 'REQUIRES'          // TOPIC requires CAPABILITY
  | 'MEMBER_OF_GROUP'   // GROUP → GROUP (nested groups)
  | 'HAS_PERMISSION'    // USER → TOPIC (direct permission)
  | 'DEFINED_BY'        // RULE → ROLE/TOPIC
  | 'ROUTES_TO'         // TOPIC → AGENT
  | 'EXPIRES_AT';       // CAPABILITY → timestamp

/**
 * Access level enum
 */
export type AccessLevel = 'NONE' | 'READ' | 'WRITE' | 'ADMIN';

/**
 * A node in the knowledge graph
 */
export interface KGNode {
  id: string;
  type: NodeType;
  name: string;
  properties: Record<string, any>;
  createdAt: number;
}

/**
 * An edge (relationship) in the knowledge graph
 */
export interface KGEdge {
  id: string;
  type: EdgeType;
  source: string;    // Node ID
  target: string;   // Node ID
  properties: Record<string, any>;  // e.g., { accessLevel: 'READ', condition: {...} }
  createdAt: number;
}

/**
 * A path through the graph (for explainability)
 */
export interface KGPath {
  nodes: KGNode[];
  edges: KGEdge[];
  totalWeight: number;
}

/**
 * Query result from the knowledge graph
 */
export interface KGQueryResult {
  nodes: KGNode[];
  paths: KGPath[];
  explanation: string;
}

/**
 * Access decision with graph-based reasoning
 */
export interface KGAccessDecision {
  decision: 'ALLOW' | 'DENY';
  reason: string;
  path: KGPath | null;  // Traceable decision path
  topic: string;
  userRole: string;
  alternatives: string[];
  auditId: string;
  graphReasoning: string;  // Human-readable reasoning
}

// =============================================================================
// KNOWLEDGE GRAPH CLASS
// =============================================================================

/**
 * Knowledge Graph for Access Control
 * 
 * This is the SYMBOLIC layer - stores explicit relationships
 * that can be queried and reasoned about.
 */
export class KnowledgeGraph {
  private nodes: Map<string, KGNode> = new Map();
  private edges: Map<string, KGEdge> = new Map();
  
  // Indexes for fast queries
  private outEdges: Map<string, KGEdge[]> = new Map();  // source → edges
  private inEdges: Map<string, KGEdge[]> = new Map();   // target → edges
  private typeIndex: Map<NodeType, Set<string>> = new Map();  // type → node IDs

  constructor() {
    this.initializeDefaultGraph();
  }

  /**
   * Initialize with default enterprise structure
   */
  private initializeDefaultGraph(): void {
    // Create default roles
    const roles = [
      { id: 'role:ADMIN', name: 'ADMIN', description: 'Full system access' },
      { id: 'role:HR_ADMIN', name: 'HR_ADMIN', description: 'HR Administrator' },
      { id: 'role:HR_MANAGER', name: 'HR_MANAGER', description: 'HR Manager' },
      { id: 'role:FINANCE', name: 'FINANCE', description: 'Finance team' },
      { id: 'role:VP_FINANCE', name: 'VP_FINANCE', description: 'VP Finance' },
      { id: 'role:SALES', name: 'SALES', description: 'Sales team' },
      { id: 'role:MARKETING', name: 'MARKETING', description: 'Marketing team' },
      { id: 'role:ENGINEERING', name: 'ENGINEERING', description: 'Engineering team' },
      { id: 'role:IT_ADMIN', name: 'IT_ADMIN', description: 'IT Administrator' },
      { id: 'role:EMPLOYEE', name: 'EMPLOYEE', description: 'Standard employee' },
      { id: 'role:CONTRACTOR', name: 'CONTRACTOR', description: 'External contractor' },
    ];

    for (const role of roles) {
      this.addNode({
        id: role.id,
        type: 'ROLE',
        name: role.name,
        properties: { description: role.description },
        createdAt: Date.now()
      });
    }

    // Create default topics
    const topics = [
      { id: 'topic:PAYROLL', name: 'PAYROLL', sensitivity: 4 },
      { id: 'topic:BENEFITS', name: 'BENEFITS', sensitivity: 3 },
      { id: 'topic:PERFORMANCE_REVIEWS', name: 'PERFORMANCE_REVIEWS', sensitivity: 4 },
      { id: 'topic:FINANCE_DASHBOARD', name: 'FINANCE_DASHBOARD', sensitivity: 4 },
      { id: 'topic:SALES_REPORTS', name: 'SALES_REPORTS', sensitivity: 3 },
      { id: 'topic:CUSTOMER_DATA', name: 'CUSTOMER_DATA', sensitivity: 4 },
      { id: 'topic:IT_TICKETS', name: 'IT_TICKETS', sensitivity: 1 },
      { id: 'topic:IT_HARDWARE', name: 'IT_HARDWARE', sensitivity: 1 },
      { id: 'topic:IT_VPN', name: 'IT_VPN', sensitivity: 2 },
      { id: 'topic:ENGINEERING_WIKI', name: 'ENGINEERING_WIKI', sensitivity: 2 },
      { id: 'topic:CODE_REPOS', name: 'CODE_REPOS', sensitivity: 3 },
      { id: 'topic:MARKETING_CAMPAIGNS', name: 'MARKETING_CAMPAIGNS', sensitivity: 2 },
      { id: 'topic:HR_POLICIES', name: 'HR_POLICIES', sensitivity: 1 },
      { id: 'topic:COMPANY_DIRECTORY', name: 'COMPANY_DIRECTORY', sensitivity: 1 },
      { id: 'topic:ADMIN_PANEL', name: 'ADMIN_PANEL', sensitivity: 4 },
      { id: 'topic:GENERAL_SUPPORT', name: 'GENERAL_SUPPORT', sensitivity: 1 },
    ];

    for (const topic of topics) {
      this.addNode({
        id: topic.id,
        type: 'TOPIC',
        name: topic.name,
        properties: { sensitivity: topic.sensitivity },
        createdAt: Date.now()
      });
    }

    // Create default permissions (CAN_ACCESS edges)
    const permissions: Array<{ role: string; topic: string; level: AccessLevel }> = [
      // HR
      { role: 'role:HR_ADMIN', topic: 'topic:PAYROLL', level: 'ADMIN' },
      { role: 'role:HR_ADMIN', topic: 'topic:BENEFITS', level: 'ADMIN' },
      { role: 'role:HR_ADMIN', topic: 'topic:PERFORMANCE_REVIEWS', level: 'ADMIN' },
      { role: 'role:HR_MANAGER', topic: 'topic:BENEFITS', level: 'READ' },
      { role: 'role:HR_MANAGER', topic: 'topic:PERFORMANCE_REVIEWS', level: 'READ' },
      
      // Finance
      { role: 'role:FINANCE', topic: 'topic:PAYROLL', level: 'READ' },
      { role: 'role:FINANCE', topic: 'topic:FINANCE_DASHBOARD', level: 'READ' },
      { role: 'role:VP_FINANCE', topic: 'topic:FINANCE_DASHBOARD', level: 'ADMIN' },
      { role: 'role:VP_FINANCE', topic: 'topic:PAYROLL', level: 'READ' },
      
      // Sales
      { role: 'role:SALES', topic: 'topic:SALES_REPORTS', level: 'READ' },
      { role: 'role:SALES', topic: 'topic:CUSTOMER_DATA', level: 'READ' },
      { role: 'role:MARKETING', topic: 'topic:SALES_REPORTS', level: 'READ' },
      { role: 'role:MARKETING', topic: 'topic:MARKETING_CAMPAIGNS', level: 'READ' },
      
      // Engineering
      { role: 'role:ENGINEERING', topic: 'topic:ENGINEERING_WIKI', level: 'READ' },
      { role: 'role:ENGINEERING', topic: 'topic:CODE_REPOS', level: 'READ' },
      { role: 'role:IT_ADMIN', topic: 'topic:IT_TICKETS', level: 'ADMIN' },
      { role: 'role:IT_ADMIN', topic: 'topic:IT_HARDWARE', level: 'ADMIN' },
      { role: 'role:IT_ADMIN', topic: 'topic:IT_VPN', level: 'ADMIN' },
      
      // Everyone
      { role: 'role:EMPLOYEE', topic: 'topic:IT_TICKETS', level: 'READ' },
      { role: 'role:EMPLOYEE', topic: 'topic:IT_HARDWARE', level: 'READ' },
      { role: 'role:EMPLOYEE', topic: 'topic:HR_POLICIES', level: 'READ' },
      { role: 'role:EMPLOYEE', topic: 'topic:COMPANY_DIRECTORY', level: 'READ' },
      { role: 'role:EMPLOYEE', topic: 'topic:GENERAL_SUPPORT', level: 'READ' },
      
      { role: 'role:CONTRACTOR', topic: 'topic:GENERAL_SUPPORT', level: 'READ' },
      
      // Admin
      { role: 'role:ADMIN', topic: 'topic:ADMIN_PANEL', level: 'ADMIN' },
    ];

    for (const perm of permissions) {
      this.addEdge({
        id: `edge:${perm.role}:${perm.topic}`,
        type: 'CAN_ACCESS',
        source: perm.role,
        target: perm.topic,
        properties: { accessLevel: perm.level },
        createdAt: Date.now()
      });
    }

    // =========================================================================
    // CAPABILITY NODES (Dynamic Permissions)
    // =========================================================================
    // Capabilities represent dynamic states that can be granted/removed
    // This makes access control truly scalable and agnostic
    
    const capabilities = [
      { id: 'cap:HAS_ACTIVE_SESSION', name: 'HAS_ACTIVE_SESSION', description: 'User has valid login session' },
      { id: 'cap:VALID_TICKET', name: 'VALID_TICKET', description: 'User has open support ticket' },
      { id: 'cap:MANAGER_APPROVED', name: 'MANAGER_APPROVED', description: 'Manager approved access' },
      { id: 'cap:SECURITY_CLEARED', name: 'SECURITY_CLEARED', description: 'Passed security check' },
      { id: 'cap:CONTRACT_SIGNED', name: 'CONTRACT_SIGNED', description: 'Contractor has signed agreement' },
      { id: 'cap:ONBOARDING_COMPLETE', name: 'ONBOARDING_COMPLETE', description: 'Completed onboarding process' },
      { id: 'cap:TRAINING_DONE', name: 'TRAINING_DONE', description: 'Completed required training' },
      { id: 'cap:VPN_ENABLED', name: 'VPN_ENABLED', description: 'VPN access enabled' },
    ];

    for (const cap of capabilities) {
      this.addNode({
        id: cap.id,
        type: 'CAPABILITY',
        name: cap.name,
        properties: { description: cap.description },
        createdAt: Date.now()
      });
    }

    // Capability-based permissions (access granted through capabilities)
    const capabilityPermissions: Array<{ capability: string; topic: string; level: AccessLevel }> = [
      { capability: 'cap:VALID_TICKET', topic: 'topic:IT_HARDWARE', level: 'READ' },
      { capability: 'cap:VPN_ENABLED', topic: 'topic:IT_VPN', level: 'WRITE' },
      { capability: 'cap:MANAGER_APPROVED', topic: 'topic:PAYROLL', level: 'READ' },
      { capability: 'cap:SECURITY_CLEARED', topic: 'topic:CUSTOMER_DATA', level: 'READ' },
      { capability: 'cap:CONTRACT_SIGNED', topic: 'topic:GENERAL_SUPPORT', level: 'READ' },
      { capability: 'cap:ONBOARDING_COMPLETE', topic: 'topic:HR_POLICIES', level: 'READ' },
      { capability: 'cap:TRAINING_DONE', topic: 'topic:CODE_REPOS', level: 'READ' },
    ];

    for (const perm of capabilityPermissions) {
      this.addEdge({
        id: `edge:${perm.capability}:${perm.topic}`,
        type: 'CAN_ACCESS',
        source: perm.capability,
        target: perm.topic,
        properties: { accessLevel: perm.level },
        createdAt: Date.now()
      });
    }
  }

  // =========================================================================
  // GRAPH OPERATIONS
  // =========================================================================

  /**
   * Add a node to the graph
   */
  addNode(node: KGNode): void {
    this.nodes.set(node.id, node);
    
    // Update type index
    if (!this.typeIndex.has(node.type)) {
      this.typeIndex.set(node.type, new Set());
    }
    this.typeIndex.get(node.type)!.add(node.id);
  }

  /**
   * Add an edge to the graph
   */
  addEdge(edge: KGEdge): void {
    this.edges.set(edge.id, edge);
    
    // Update indexes
    if (!this.outEdges.has(edge.source)) {
      this.outEdges.set(edge.source, []);
    }
    this.outEdges.get(edge.source)!.push(edge);
    
    if (!this.inEdges.has(edge.target)) {
      this.inEdges.set(edge.target, []);
    }
    this.inEdges.get(edge.target)!.push(edge);
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): KGNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes of a type
   */
  getNodesByType(type: NodeType): KGNode[] {
    const ids = this.typeIndex.get(type);
    if (!ids) return [];
    return Array.from(ids).map(id => this.nodes.get(id)).filter(Boolean) as KGNode[];
  }

  /**
   * Get outgoing edges from a node
   */
  getOutEdges(nodeId: string): KGEdge[] {
    return this.outEdges.get(nodeId) || [];
  }

  /**
   * Get incoming edges to a node
   */
  getInEdges(nodeId: string): KGEdge[] {
    return this.inEdges.get(nodeId) || [];
  }

  /**
   * Find all paths from source to target (BFS)
   */
  findPaths(sourceId: string, targetId: string, maxDepth: number = 5): KGPath[] {
    const paths: KGPath[] = [];
    
    interface SearchState {
      currentId: string;
      visited: Set<string>;
      nodes: KGNode[];
      edges: KGEdge[];
      weight: number;
    }
    
    const queue: SearchState[] = [{
      currentId: sourceId,
      visited: new Set([sourceId]),
      nodes: [this.nodes.get(sourceId)!],
      edges: [],
      weight: 0
    }];
    
    while (queue.length > 0) {
      const state = queue.shift()!;
      
      if (state.currentId === targetId) {
        paths.push({
          nodes: state.nodes,
          edges: state.edges,
          totalWeight: state.weight
        });
        continue;
      }
      
      if (state.visited.size >= maxDepth) continue;
      
      const outEdges = this.getOutEdges(state.currentId);
      for (const edge of outEdges) {
        if (state.visited.has(edge.target)) continue;
        
        const targetNode = this.nodes.get(edge.target);
        if (!targetNode) continue;
        
        queue.push({
          currentId: edge.target,
          visited: new Set([...state.visited, edge.target]),
          nodes: [...state.nodes, targetNode],
          edges: [...state.edges, edge],
          weight: state.weight + 1
        });
      }
    }
    
    return paths;
  }

  /**
   * Query: What topics can a role access?
   */
  queryAccessibleTopics(roleId: string): { topic: string; level: AccessLevel; path: KGPath }[] {
    const results: { topic: string; level: AccessLevel; path: KGPath }[] = [];
    
    // Find all CAN_ACCESS edges from this role
    const edges = this.getOutEdges(roleId).filter(e => e.type === 'CAN_ACCESS');
    
    for (const edge of edges) {
      const path: KGPath = {
        nodes: [this.nodes.get(roleId)!, this.nodes.get(edge.target)!],
        edges: [edge],
        totalWeight: 1
      };
      
      results.push({
        topic: edge.target.replace('topic:', ''),
        level: edge.properties.accessLevel || 'READ',
        path
      });
    }
    
    return results;
  }

  /**
   * Query: Does role have access to topic? (with reasoning)
   */
  queryAccess(roleId: string, topicId: string): KGQueryResult {
    const roleNode = this.nodes.get(roleId);
    const topicNode = this.nodes.get(topicId);
    
    if (!roleNode || !topicNode) {
      return {
        nodes: [],
        paths: [],
        explanation: `Node not found: ${!roleNode ? roleId : ''} ${!topicNode ? topicId : ''}`
      };
    }
    
    const paths = this.findPaths(roleId, topicId);
    const accessEdges = paths.flatMap(p => p.edges).filter(e => e.type === 'CAN_ACCESS');
    
    const hasAccess = accessEdges.length > 0;
    const accessLevel = hasAccess ? accessEdges[0].properties.accessLevel : 'NONE';
    
    return {
      nodes: paths.flatMap(p => p.nodes),
      paths,
      explanation: hasAccess
        ? `Role ${roleNode.name} has ${accessLevel} access to ${topicNode.name}. Path: ${paths.map(p => p.nodes.map(n => n.name).join(' → ')).join(' | ')}`
        : `Role ${roleNode.name} does NOT have access to ${topicNode.name}. No path found in knowledge graph.`
    };
  }

  // =========================================================================
  // SERIALIZATION
  // =========================================================================

  /**
   * Export graph as JSON (for persistence)
   */
  toJSON(): { nodes: KGNode[]; edges: KGEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values())
    };
  }

  /**
   * Import graph from JSON
   */
  fromJSON(data: { nodes: KGNode[]; edges: KGEdge[] }): void {
    this.nodes.clear();
    this.edges.clear();
    this.outEdges.clear();
    this.inEdges.clear();
    this.typeIndex.clear();
    
    for (const node of data.nodes) {
      this.addNode(node);
    }
    for (const edge of data.edges) {
      this.addEdge(edge);
    }
  }

  /**
   * Get graph statistics
   */
  getStats(): { nodes: number; edges: number; roles: number; topics: number; capabilities: number } {
    return {
      nodes: this.nodes.size,
      edges: this.edges.size,
      roles: this.getNodesByType('ROLE').length,
      topics: this.getNodesByType('TOPIC').length,
      capabilities: this.getNodesByType('CAPABILITY').length
    };
  }

  // =========================================================================
  // CAPABILITY MANAGEMENT
  // =========================================================================

  /**
   * Get all capability nodes
   */
  getCapabilities(): KGNode[] {
    return this.getNodesByType('CAPABILITY');
  }

  /**
   * Grant a capability to a user (dynamic permission)
   */
  grantCapability(userId: string, capabilityId: string, expiresAt?: number): void {
    const capabilityNode = this.nodes.get(capabilityId);
    if (!capabilityNode || capabilityNode.type !== 'CAPABILITY') {
      throw new Error(`Invalid capability: ${capabilityId}`);
    }

    // Create HAS_CAPABILITY edge
    this.addEdge({
      id: `edge:${userId}:${capabilityId}`,
      type: 'HAS_CAPABILITY',
      source: userId,
      target: capabilityId,
      properties: { 
        grantedAt: Date.now(),
        expiresAt: expiresAt || null
      },
      createdAt: Date.now()
    });
  }

  /**
   * Revoke a capability from a user
   */
  revokeCapability(userId: string, capabilityId: string): void {
    const edgeId = `edge:${userId}:${capabilityId}`;
    this.edges.delete(edgeId);
    
    // Remove from indexes
    const outEdges = this.outEdges.get(userId) || [];
    this.outEdges.set(userId, outEdges.filter(e => e.id !== edgeId));
  }

  /**
   * Check if user has a specific capability
   */
  hasCapability(userId: string, capabilityId: string): boolean {
    const outEdges = this.getOutEdges(userId);
    return outEdges.some(e => e.type === 'HAS_CAPABILITY' && e.target === capabilityId);
  }

  /**
   * Get all capabilities for a user
   */
  getUserCapabilities(userId: string): KGNode[] {
    const outEdges = this.getOutEdges(userId).filter(e => e.type === 'HAS_CAPABILITY');
    return outEdges.map(e => this.nodes.get(e.target)).filter(Boolean) as KGNode[];
  }

  /**
   * Query access including capabilities (role + capabilities)
   * This is the CORE access evaluation that considers BOTH roles AND capabilities
   */
  queryAccessWithCapabilities(userId: string, roleId: string, topicId: string): KGQueryResult {
    const paths: KGPath[] = [];
    
    // Path 1: Through role
    const rolePaths = this.findPaths(roleId, topicId);
    paths.push(...rolePaths);
    
    // Path 2: Through capabilities
    const userOutEdges = this.getOutEdges(userId).filter(e => e.type === 'HAS_CAPABILITY');
    for (const capEdge of userOutEdges) {
      const capPaths = this.findPaths(capEdge.target, topicId);
      // Prepend user node to path
      for (const path of capPaths) {
        path.nodes.unshift(this.nodes.get(userId)!);
        path.edges.unshift(capEdge);
      }
      paths.push(...capPaths);
    }
    
    const accessEdges = paths.flatMap(p => p.edges).filter(e => e.type === 'CAN_ACCESS');
    const hasAccess = accessEdges.length > 0;
    const accessLevel = hasAccess ? accessEdges[0].properties.accessLevel : 'NONE';
    
    return {
      nodes: paths.flatMap(p => p.nodes),
      paths,
      explanation: hasAccess
        ? `Access granted via: ${paths.map(p => p.nodes.map(n => n.name).join(' → ')).join(' OR ')}`
        : `No access path found from user ${userId} (role: ${roleId}) to topic ${topicId}`
    };
  }
}

// =============================================================================
// ACCESS CONTROL ENGINE (using Knowledge Graph)
// =============================================================================

/**
 * Access Control Engine - Uses Knowledge Graph for decisions
 */
export class KGAccessEngine {
  private graph: KnowledgeGraph;
  
  constructor(graph?: KnowledgeGraph) {
    this.graph = graph || new KnowledgeGraph();
  }

  /**
   * Evaluate access request using graph reasoning (with capabilities!)
   */
  evaluateAccess(userRole: string, requestedTopic: string, userId?: string): KGAccessDecision {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Normalize IDs
    const roleId = userRole.startsWith('role:') ? userRole : `role:${userRole}`;
    const topicId = requestedTopic.startsWith('topic:') ? requestedTopic : `topic:${requestedTopic}`;
    const actualUserId = userId || 'anonymous';
    
    // Query the knowledge graph - now with capabilities!
    let result;
    if (userId) {
      // Use capability-aware query
      result = this.graph.queryAccessWithCapabilities(actualUserId, roleId, topicId);
    } else {
      // Fallback to role-only query
      result = this.graph.queryAccess(roleId, topicId);
    }
    
    if (result.paths.length > 0) {
      const path = result.paths[0];
      const edge = path.edges.find(e => e.type === 'CAN_ACCESS');
      const accessLevel = edge?.properties.accessLevel || 'READ';
      
      // Determine if access was via capability
      const viaCapability = path.nodes.some(n => n.type === 'CAPABILITY');
      
      return {
        decision: 'ALLOW',
        reason: result.explanation,
        path,
        topic: requestedTopic,
        userRole,
        alternatives: this.getAlternatives(userRole),
        auditId,
        graphReasoning: viaCapability 
          ? `Access granted via CAPABILITY: ${result.explanation}`
          : `Access granted via ROLE: ${result.explanation}`
      };
    }
    
    // DEFAULT DENY - No path found in knowledge graph
    return {
      decision: 'DENY',
      reason: `No explicit permission found. ${result.explanation}`,
      path: null,
      topic: requestedTopic,
      userRole,
      alternatives: this.getAlternatives(userRole),
      auditId,
      graphReasoning: result.explanation
    };
  }

  /**
   * Grant a capability to a user (for dynamic permissions)
   */
  grantCapability(userId: string, capabilityId: string, expiresAt?: number): void {
    this.graph.grantCapability(userId, capabilityId, expiresAt);
  }

  /**
   * Revoke a capability from a user
   */
  revokeCapability(userId: string, capabilityId: string): void {
    this.graph.revokeCapability(userId, capabilityId);
  }

  /**
   * Check user's capabilities
   */
  getUserCapabilities(userId: string): string[] {
    const caps = this.graph.getUserCapabilities(userId);
    return caps.map(c => c.name);
  }

  /**
   * Get topics the role CAN access (for UX suggestions)
   */
  getAlternatives(roleId: string): string[] {
    const normalizedRole = roleId.startsWith('role:') ? roleId : `role:${roleId}`;
    const accessible = this.graph.queryAccessibleTopics(normalizedRole);
    return accessible.map(a => a.topic);
  }

  /**
   * Get knowledge graph instance (for inspection)
   */
  getGraph(): KnowledgeGraph {
    return this.graph;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create access engine with default knowledge graph
 */
export function createKGAccessEngine(): KGAccessEngine {
  return new KGAccessEngine();
}

/**
 * Default singleton instance
 */
export const kgAccessEngine = new KGAccessEngine();
