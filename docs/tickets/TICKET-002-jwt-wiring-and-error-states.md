# TICKET-002: JWT Endpoint Wiring, Loading & Error States

- **Status:** ready-for-agent
- **Component:** `frontend/src/pages/Login.jsx`, `frontend/src/test/login_auth.test.jsx`
- **Spec:** [docs/specs/login-portal-redesign-spec.md](file:///e:/Faith%20Infotech/Camp%204[frontend]/ClinicManagementSystem/docs/specs/login-portal-redesign-spec.md)

## Objective
Wire the login form to `useAuth().login` with client-side non-empty validation, in-flight disabled states, and dynamic server error rendering.

## Deliverables
- [ ] Client validation: Prevent empty username/password from triggering `login()`; show invalid feedback.
- [ ] In-flight loading state:
  - Form inputs (`username`, `password`), forgot password button, and submit button disabled during request.
  - Submit button switches text from *"Sign in"* to *"Verifying..."* with spinner icon.
- [ ] Error banner:
  - Collapsible red alert (`bg-danger-subtle border-danger-subtle text-danger`) rendering exact server error (e.g., *"Invalid username or password."*, *"User account is inactive. Please contact administration."*).
  - Clear error state when user modifies inputs or dismisses alert.
- [ ] Forgot password toggle:
  - Clicking "Forgot password?" reveals helper note: *"Please contact your Clinic Administrator to reset your password."*

## Verification
- Unit tests via Vitest: client validation, error alert display, in-flight button state.
