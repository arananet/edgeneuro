# Skill Spec 001: HR Agent 👥

**Authors:** Eduardo Arana & Soda 🥤
**Status:** Draft

## Purpose
Handles human resource queries including payroll, leave management, and benefits.

## Intent Triggers (Geometric Clusters)
- `check_payroll` ("When do I get paid?", "Where is my payslip?")
- `request_leave` ("I need a holiday", "Book time off")
- `benefits_info` ("What is my dental plan?", "Health insurance")

## MCP Tools Exposed
1.  `get_payslip(employee_id, month)`
2.  `book_leave(employee_id, start_date, end_date, reason)`
3.  `get_benefits_summary(employee_id)`

## Handoff Contract
- **Success:** Returns plain text answer or link to Workday.
- **Failure:** If manual intervention needed, returns `HANDOFF_TO_SUPERVISOR` with intent `human_escalation`.
