# Skill Spec 003: Data Agent 📊

**Authors:** Eduardo Arana & Soda 🥤
**Status:** Draft

## Purpose
Executes read-only SQL queries and retrieves dashboard links.

## Intent Triggers
- `sql_query` ("Run this query", "Select * from sales")
- `report_lookup` ("Show me the Q3 report", "Sales dashboard")

## MCP Tools Exposed
1.  `run_snowflake_query(sql_safe)`
2.  `search_tableau(keyword)`

## Security Constraints
- **Read Only:** MUST NOT execute `INSERT`, `UPDATE`, `DELETE`, `DROP`.
- **PII Filter:** Results must be scanned for PII before returning to chat.
