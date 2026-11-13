# AI Agent Guidelines

This repository uses Matt Pocock's engineering skill framework for disciplined, test-driven, and aligned software development.

## Agent Skills Configuration
- **Issue Tracker:** See [docs/agents/issue-tracker.md](file:///e:/Faith%20Infotech/Camp%204[frontend]/ClinicManagementSystem/docs/agents/issue-tracker.md) for how tickets, PRs, and tasks are created and updated.
- **Triage State Machine:** See [docs/agents/triage-labels.md](file:///e:/Faith%20Infotech/Camp%204[frontend]/ClinicManagementSystem/docs/agents/triage-labels.md) for canonical label workflows (`needs-triage`, `ready-for-agent`, etc.).
- **Domain & Architecture:** See [docs/agents/domain.md](file:///e:/Faith%20Infotech/Camp%204[frontend]/ClinicManagementSystem/docs/agents/domain.md) and [docs/GLOSSARY.md](file:///e:/Faith%20Infotech/Camp%204[frontend]/ClinicManagementSystem/docs/GLOSSARY.md) for ubiquitous language and architectural decision conventions.

## Operating Principles
1. **Always Check the Ubiquitous Language:**
   - Before implementing features or creating migrations, check `docs/GLOSSARY.md`.
   - Never invent ad-hoc names for existing domain entities.
2. **Feedback Loops & TDD:**
   - Write or update tests before fixing bugs or adding new features (`Vitest` for UI, `Django TestCase` for backend).
   - Verify changes with smoke tests (`scripts/smoke_auth_flow.py`, `scripts/smoke_crud_flows.py`).
3. **Seams and Deep Modules:**
   - Keep frontend module boundaries clean (`src/modules/<module>/` and `src/api/<module>Api.js`).
   - Use adapter layers (`src/api/pharmacistAdapters.js`) for legacy or divergent backend field translations.

