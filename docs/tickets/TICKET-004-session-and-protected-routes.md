# TICKET-004: Session Preservation & Protected Route Integration

- **Status:** ready-for-agent
- **Component:** `frontend/src/pages/Login.jsx`, `frontend/src/context/AuthContext.jsx`, `frontend/src/routes/ProtectedRoute.jsx`
- **Spec:** [docs/specs/login-portal-redesign-spec.md](file:///e:/Faith%20Infotech/Camp%204[frontend]/ClinicManagementSystem/docs/specs/login-portal-redesign-spec.md)

## Objective
Verify that if an already authenticated user navigates to `/login`, they are automatically redirected to their role home page without re-authenticating, and unauthenticated users accessing protected paths are redirected to `/login`.

## Deliverables
- [ ] If `isAuthenticated && user?.role`, render `<Navigate to={ROLE_HOME_PATHS[user.role]} replace />`.
- [ ] Preserve tokens in `localStorage` across page reload.

## Verification
- Unit test rendering `Login` with active auth context and verifying redirection.
