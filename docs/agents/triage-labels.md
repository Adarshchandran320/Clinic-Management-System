# Triage Labels Configuration

This repository uses canonical labels to represent the triage lifecycle state machine for tickets and tasks.

| Canonical Role | Repository Label | Description |
|---|---|---|
| `needs-triage` | `needs-triage` | Newly filed issue awaiting review, domain validation, and triage. |
| `needs-info` | `needs-info` | Blocked on missing requirements, user clarification, or reproduction steps. |
| `ready-for-agent` | `ready-for-agent` | Specification is unambiguous, tracer bullets defined, ready for autonomous agent execution. |
| `ready-for-human` | `ready-for-human` | Requires manual intervention, human design approval, credential access, or physical testing. |
| `wontfix` | `wontfix` | Rejected, superseded, or out of scope. |

## Triage State Machine
1. New issues are tagged `needs-triage`.
2. When triaged by an agent or maintainer:
   - If clear and actionable for coding agents $\rightarrow$ transition to `ready-for-agent`.
   - If questions remain $\rightarrow$ transition to `needs-info` and prompt the user.
   - If out of scope $\rightarrow$ transition to `wontfix` and close.
   - If requires human approval/action $\rightarrow$ transition to `ready-for-human`.

