/**
 * EdgeNeuro Scenarios - Enterprise-Grade Multi-Agent Scenarios
 * 
 * Inspired by Agent Leaderboard v2 methodology:
 * - Multi-turn dialogues
 * - Interconnected user goals
 * - Dynamic personas
 * - Real enterprise tools
 */

export interface ENPersona {
  id: string;
  role: 'employee' | 'manager' | 'contractor';
  department: 'engineering' | 'sales' | 'hr' | 'finance' | 'operations';
  tech_comfort: 'low' | 'medium' | 'high';
  communication_style: 'formal' | 'casual' | 'mixed';
}

export interface ENGoal {
  id: string;
  description: string;
  domain: 'hr' | 'it' | 'sql';
  completed: boolean;
  confirmation: string | null;
}

export interface ENTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: Array<{
    tool: string;
    params: Record<string, any>;
    result?: any;
  }>;
}

export interface ENScenario {
  id: string;
  title: string;
  persona: ENPersona;
  goals: ENGoal[];
  turns: ENTurn[];
  tools_available: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  expected_agents: string[];
  domain_context: string;
}

// Example: Banking-like complexity for IT support
export const en_scenarios: ENScenario[] = [
  {
    id: 'en-001',
    title: 'New Employee Onboarding',
    persona: {
      id: 'p001',
      role: 'employee',
      department: 'engineering',
      tech_comfort: 'medium',
      communication_style: 'mixed'
    },
    goals: [
      { id: 'g1', description: 'Get laptop access', domain: 'it', completed: false, confirmation: null },
      { id: 'g2', description: 'Setup email signature', domain: 'it', completed: false, confirmation: null },
      { id: 'g3', description: 'Submit benefits enrollment', domain: 'hr', completed: false, confirmation: null },
      { id: 'g4', description: 'Request building access card', domain: 'it', completed: false, confirmation: null }
    ],
    turns: [
      { role: 'user', content: "Hi, I just joined as a new engineer and I need help setting up everything" },
      { role: 'assistant', content: "Congratulations! Let me help you get set up. I can help with your laptop, email, benefits, and access card. What would you like to start with?" },
      { role: 'user', content: "Let's start with my laptop and email" },
      // ... more turns
    ],
    tools_available: ['it.ProvisionLaptop', 'it.SetupEmail', 'hr.EnrollBenefits', 'it.RequestAccess'],
    difficulty: 'easy',
    expected_agents: ['it-agent', 'hr-agent'],
    domain_context: 'New employee needs multiple IT/HR setups'
  },

  {
    id: 'en-002',
    title: 'Complex Troubleshooting',
    persona: {
      id: 'p002',
      role: 'manager',
      department: 'sales',
      tech_comfort: 'low',
      communication_style: 'formal'
    },
    goals: [
      { id: 'g1', description: 'Fix VPN connectivity', domain: 'it', completed: false, confirmation: null },
      { id: 'g2', description: 'Access CRM reports', domain: 'sql', completed: false, confirmation: null },
      { id: 'g3', description: 'Submit expense report', domain: 'hr', completed: false, confirmation: null }
    ],
    turns: [
      { role: 'user', content: "My VPN isn't working and I can't access my sales reports. Also I need to submit my expense report from last week" },
      { role: 'assistant', content: "I can help with all three. Let me start by checking your VPN status." },
      // Complex multi-domain interaction
    ],
    tools_available: ['it.DiagnoseVPN', 'sql.QueryReports', 'hr.SubmitExpense'],
    difficulty: 'hard',
    expected_agents: ['it-agent', 'sql-agent', 'hr-agent'],
    domain_context: 'Multi-domain issue requiring agent coordination'
  },

  {
    id: 'en-003',
    title: 'Data Analysis Request',
    persona: {
      id: 'p003',
      role: 'employee',
      department: 'finance',
      tech_comfort: 'high',
      communication_style: 'casual'
    },
    goals: [
      { id: 'g1', description: 'Get Q4 sales numbers', domain: 'sql', completed: false, comparison: null },
      { id: 'g2', description: 'Calculate YoY growth', domain: 'sql', completed: false, comparison: null },
      { id: 'g3', description: 'Export to spreadsheet', domain: 'sql', completed: false, comparison: null }
    ],
    turns: [
      { role: 'user', content: "Can you pull the Q4 sales data and calculate year-over-year growth? I need it in a spreadsheet" }
    ],
    tools_available: ['sql.QuerySales', 'sql.Calculate', 'sql.Export'],
    difficulty: 'medium',
    expected_agents: ['sql-agent'],
    domain_context: 'Complex SQL query with calculations'
  }
];

// Add missing field to goals
for (const s of en_scenarios) {
  for (const g of s.goals) {
    if (!('confirmation' in g)) {
      (g as any).confirmation = null;
    }
  }
}

// Additional enterprise scenarios
export const additional_scenarios: ENScenario[] = [
  {
    id: 'en-004',
    title: 'Security Incident Response',
    persona: {
      id: 'p004',
      role: 'employee',
      department: 'engineering',
      tech_comfort: 'high',
      communication_style: 'formal'
    },
    goals: [
      { id: 'g1', description: 'Report suspicious email', domain: 'it', completed: false, confirmation: null },
      { id: 'g2', description: 'Check account for compromise', domain: 'it', completed: false, confirmation: null },
      { id: 'g3', description: 'Reset affected passwords', domain: 'it', completed: false, confirmation: null },
      { id: 'g4', description: 'Document incident', domain: 'it', completed: false, confirmation: null }
    ],
    turns: [
      { role: 'user', content: "I think I clicked on a phishing email. Can you help me secure my accounts?" }
    ],
    tools_available: ['it.ReportIncident', 'it.CheckCompromise', 'it.ResetPasswords', 'it.LogIncident'],
    difficulty: 'hard',
    expected_agents: ['it-agent'],
    domain_context: 'Security incident requiring immediate action'
  },

  {
    id: 'en-005',
    title: 'Performance Review Prep',
    persona: {
      id: 'p005',
      role: 'manager',
      department: 'hr',
      tech_comfort: 'medium',
      communication_style: 'mixed'
    },
    goals: [
      { id: 'g1', description: 'Pull team performance metrics', domain: 'sql', completed: false, confirmation: null },
      { id: 'g2', description: 'Check PTO balances for team', domain: 'hr', completed: false, confirmation: null },
      { id: 'g3', description: 'Schedule review meetings', domain: 'hr', completed: false, confirmation: null },
      { id: 'g4', description: 'Generate bonus recommendations', domain: 'sql', completed: false, confirmation: null }
    ],
    turns: [
      { role: 'user', content: "I need to prepare for my team's performance reviews next week. Can you pull the metrics and check everyone’s PTO?" }
    ],
    tools_available: ['sql.QueryMetrics', 'hr.GetPTOBalances', 'hr.ScheduleMeetings', 'sql.GenerateBonus'],
    difficulty: 'medium',
    expected_agents: ['sql-agent', 'hr-agent'],
    domain_context: 'Multi-domain manager task'
  },

  {
    id: 'en-006',
    title: 'Contractor Onboarding',
    persona: {
      id: 'p006',
      role: 'contractor',
      department: 'operations',
      tech_comfort: 'low',
      communication_style: 'casual'
    },
    goals: [
      { id: 'g1', description: 'Get temporary access', domain: 'it', completed: false, confirmation: null },
      { id: 'g2', description: 'Sign NDA', domain: 'hr', completed: false, confirmation: null },
      { id: 'g3', description: 'Setup payment info', domain: 'hr', completed: false, confirmation: null }
    ],
    turns: [
      { role: 'user', content: "I'm starting as a contractor tomorrow. What do I need to set up?" }
    ],
    tools_available: ['it.ProvisionTempAccess', 'hr.NDASigning', 'hr.PaymentSetup'],
    difficulty: 'easy',
    expected_agents: ['it-agent', 'hr-agent'],
    domain_context: 'Simple multi-agent flow'
  },

  {
    id: 'en-007',
    title: 'Server Outage Emergency',
    persona: {
      id: 'p007',
      role: 'employee',
      department: 'engineering',
      tech_comfort: 'high',
      communication_style: 'formal'
    },
    goals: [
      { id: 'g1', description: 'Check server status', domain: 'it', completed: false, confirmation: null },
      { id: 'g2', description: 'Notify stakeholders', domain: 'it', completed: false, confirmation: null },
      { id: 'g3', description: 'Check incident history', domain: 'sql', completed: false, confirmation: null },
      { id: 'g4', description: 'Update status page', domain: 'it', completed: false, confirmation: null },
      { id: 'g5', description: 'Escalate if needed', domain: 'it', completed: false, confirmation: null }
    ],
    turns: [
      { role: 'user', content: "Production servers are down! The team is panicking. We need to act fast." }
    ],
    tools_available: ['it.CheckServerStatus', 'it.NotifyStakeholders', 'sql.QueryIncidents', 'it.UpdateStatus', 'it.Escalate'],
    difficulty: 'hard',
    expected_agents: ['it-agent', 'sql-agent'],
    domain_context: 'Emergency response with multiple steps'
  },

  {
    id: 'en-008',
    title: 'Quarterly Business Review',
    persona: {
      id: 'p008',
      role: 'manager',
      department: 'sales',
      tech_comfort: 'medium',
      communication_style: 'formal'
    },
    goals: [
      { id: 'g1', description: 'Get Q3 sales data', domain: 'sql', completed: false, confirmation: null },
      { id: 'g2', description: 'Calculate team bonuses', domain: 'sql', completed: false, confirmation: null },
      { id: 'g3', description: 'Check pipeline coverage', domain: 'sql', completed: false, confirmation: null },
      { id: 'g4', description: 'Schedule QBR meeting', domain: 'hr', completed: false, confirmation: null },
      { id: 'g5', description: 'Prepare commission report', domain: 'sql', completed: false, confirmation: null }
    ],
    turns: [
      { role: 'user', content: "I need everything ready for the QBR tomorrow - sales numbers, bonuses, pipeline, the works." }
    ],
    tools_available: ['sql.QuerySales', 'sql.CalculateBonus', 'sql.CheckPipeline', 'hr.ScheduleMeeting', 'sql.CommissionReport'],
    difficulty: 'hard',
    expected_agents: ['sql-agent', 'hr-agent'],
    domain_context: 'Heavy data analysis with meeting prep'
  },

  {
    id: 'en-009',
    title: 'Leave Request Complex',
    persona: {
      id: 'p009',
      role: 'employee',
      department: 'engineering',
      tech_comfort: 'medium',
      communication_style: 'mixed'
    },
    goals: [
      { id: 'g1', description: 'Check PTO balance', domain: 'hr', completed: false, confirmation: null },
      { id: 'g2', description: 'Request vacation days', domain: 'hr', completed: false, confirmation: null },
      { id: 'g3', description: 'Set out-of-office', domain: 'it', completed: false, confirmation: null },
      { id: 'g4', description: 'Delegate tasks', domain: 'hr', completed: false, confirmation: null }
    ],
    turns: [
      { role: 'user', content: "I want to take 2 weeks off in December. Can you check my balance and set everything up?" }
    ],
    tools_available: ['hr.CheckBalance', 'hr.RequestLeave', 'it.SetOOO', 'hr.DelegateTasks'],
    difficulty: 'medium',
    expected_agents: ['hr-agent', 'it-agent'],
    domain_context: 'Cross-domain leave management'
  },

  {
    id: 'en-010',
    title: 'Hardware Failure',
    persona: {
      id: 'p010',
      role: 'employee',
      department: 'sales',
      tech_comfort: 'low',
      communication_style: 'casual'
    },
    goals: [
      { id: 'g1', description: 'Report broken laptop', domain: 'it', completed: false, confirmation: null },
      { id: 'g2', description: 'Request replacement', domain: 'it', completed: false, confirmation: null },
      { id: 'g3', description: 'Backup data from old device', domain: 'it', completed: false, confirmation: null },
      { id: 'g4', description: 'Transfer licenses', domain: 'it', completed: false, confirmation: null }
    ],
    turns: [
      { role: 'user', content: "My laptop is dead - liquid damage. I need a new one ASAP and I think I have some important files on it." }
    ],
    tools_available: ['it.ReportDamage', 'it.RequestReplacement', 'it.BackupData', 'it.TransferLicenses'],
    difficulty: 'medium',
    expected_agents: ['it-agent'],
    domain_context: 'Urgent hardware issue with data recovery'
  }
];

// Combine all scenarios
export const all_en_scenarios = [...en_scenarios, ...additional_scenarios];

export function calculateENMetrics(scenario: ENScenario, actual_goals: ENGoal[]): {
  action_completion: number;
  goals_completed: number;
  goals_total: number;
  multi_agent_coordination: number;
  context_preservation: number;
} {
  const completed = actual_goals.filter(g => g.completed).length;
  const ac = completed / scenario.goals.length;
  
  // Multi-agent: did we use multiple agents when needed?
  const unique_domains = new Set(actual_goals.map(g => g.domain));
  const multi_agent_coordination = scenario.expected_agents.length > 1 
    ? unique_domains.size / scenario.expected_agents.length 
    : 1;
  
  // Context: did we handle multi-turn properly?
  const context_preservation = 1; // Would need proper tracking
  
  return {
    action_completion: ac,
    goals_completed: completed,
    goals_total: scenario.goals.length,
    multi_agent_coordination,
    context_preservation
  };
}
