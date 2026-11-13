# TICKET-003: Server-Authoritative Role-Based Redirects

- **Status:** ready-for-agent
- **Component:** `frontend/src/pages/Login.jsx`, `frontend/src/context/AuthContext.jsx`
- **Spec:** [docs/specs/login-portal-redesign-spec.md](file:///e:/Faith%20Infotech/Camp%204[frontend]/ClinicManagementSystem/docs/specs/login-portal-redesign-spec.md)

## Objective
Ensure seamless redirection to the respective module landing page upon successful login based strictly on the role claims returned by the backend.

## Deliverables
- [ ] Route mapping adherence:
  - `admin` $\rightarrow$ `/admin`
  - `doctor` $\rightarrow$ `/doctor`
  - `receptionist` $\rightarrow$ `/receptionist`
  - `lab` / `lab technician` $\rightarrow$ `/lab`
  - `pharmacist` $\rightarrow$ `/pharmacist`
  - Fallback $\rightarrow$ `/pharmacist`
- [ ] Post-login redirection uses `{ replace: true }` to avoid back-button trap into `/login`.

## Verification
- Unit test mocking `login()` resolved value with distinct roles and asserting navigation destination.
