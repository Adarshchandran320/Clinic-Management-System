# Issue Tracker Configuration

## Backend
- **Tracker Type:** GitHub Issues
- **Repository:** `Adarshchandran320/Clinic-Management-System`
- **CLI Tool:** `gh` (GitHub CLI)

## Conventions
- **Creating Tickets:**
  - Create issues with a clear title following `<type>: <summary>` (e.g., `feat: patient appointment queue filter` or `fix: token expiration refresh`).
  - Add relevant triage labels upon creation.
- **Querying Tickets:**
  - Command: `gh issue list` or `gh issue view <issue-number>`
- **Updating & Linking:**
  - Reference issues in commits and pull requests with `#<issue-number>` (e.g. `Resolves #12`).
  - Update ticket status and discussion directly on GitHub.
- **Closing Tickets:**
  - Use `gh issue close <issue-number>` or close via PR merge keyword.

