# TICKET-001: Login Form UI & Split Layout

- **Status:** ready-for-agent
- **Component:** `frontend/src/pages/Login.jsx`, `frontend/src/pages/Login.css`
- **Spec:** [docs/specs/login-portal-redesign-spec.md](file:///e:/Faith%20Infotech/Camp%204[frontend]/ClinicManagementSystem/docs/specs/login-portal-redesign-spec.md)

## Objective
Implement the responsive split-screen layout inspired by Stitch using Bootstrap 5 and scoped `Login.css`.

## Deliverables
- [ ] Create `frontend/src/pages/Login.css` defining:
  - Container max-width and background styling.
  - `#3FA66B` brand colors and `#EAF4EC` pale mint hero panel background.
  - Rounded pill input styling (`height: 52px`, `border-radius: 50rem`, icon padding).
  - `#111827` black pill submit button with hover `#000000`.
- [ ] Left column: Brand header, "Welcome back!" heading, Username input, Password input with eye toggle button, Forgot password helper toggle, submit button, and footer.
- [ ] Right column: Pale mint rounded card with `/assets/login-illustration.png`, headline *"Care, records and pharmacy in one place"*, and feature subtext.
- [ ] Responsive behavior: Split 5:7 column grid on `lg+`, single-column stacked on mobile/tablet.

## Verification
- Visual inspection and mobile viewport responsiveness.
