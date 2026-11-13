# Domain Documentation Layout

Rules and locations for ubiquitous language, domain models, and architecture decisions in this repository.

## Locations
- **Domain Glossary:** `docs/GLOSSARY.md`
- **Architecture Decision Records (ADRs):** `docs/adr/`
- **Agent Configuration:** `docs/agents/`

## Agent Discipline
1. **Ubiquitous Language:**
   - Every agent interacting with this repo must read `docs/GLOSSARY.md` before designing models, endpoints, or UI components.
   - Do not invent synonyms for established clinic domain concepts (e.g., use `Consultation`, not `Meeting` or `Session`; use `LabPrescription`, not `TestRequest`).
2. **Sharpening Terminology:**
   - Whenever an ambiguity arises or a new domain concept is introduced, update `docs/GLOSSARY.md` inline.
3. **Architecture Decision Records (ADRs):**
   - Record significant design decisions (e.g. JWT rotation strategy, inventory ledger calculations, database indexing) as Markdown files inside `docs/adr/` using the format `YYYY-MM-DD-<title>.md`.

