# ADR 001: Login Portal Redesign & Authentication Alignment

- **Date:** 2026-11-13
- **Status:** Accepted
- **Context:** Redesigning the Clinic Management System (CMS) login page using visual inspiration from the Stitch login prototype (`stitch_clinic_management_login_portal.zip`), connecting to the Django REST Framework JWT backend (`UnifiedLoginView`).

---

## Decisions

### 1. Removal of Client-Side Role Selector
- **Decision:** Remove the 5-role pill selector (`Admin`, `Doctor`, `Receptionist`, `Pharmacist`, `Lab Tech`) from the UI.
- **Rationale:** The Django REST backend (`UnifiedLoginView`) queries the user by `Username` and returns the authoritative role from `User.RoleId.RoleName`. The endpoint neither requires nor validates a client-supplied role parameter. Presenting a role selector creates an opportunity for artificial client-server mismatches (e.g. selecting "Doctor" while logging in as "Admin").
- **Consequence:** After authentication, the client directly inspects the server-returned role and navigates using `ROLE_HOME_PATHS[user.role]`.

### 2. Patient Persona Scope Boundary
- **Decision:** Omit the "Patient Portal" link and any patient authentication flows.
- **Rationale:** In `clinicmanagementsystem/apibackendapp/models.py`, `Patient` is an unauthenticated medical record entity without a `User` foreign key, username, or password. There are no patient routes in `AppRoutes.jsx`. Patient portal access is strictly out of scope for this milestone.

### 3. Credential Form Fields & Token Persistence
- **Decision:**
  - Label input strictly as **"Username"** with placeholder *"Enter your username"* (no email placeholder).
  - Omit the **"Remember me"** checkbox.
  - Tokens (`access` and `refresh`) remain managed via `localStorage` through `AuthContext.jsx` and `axiosClient.js`.

### 4. Admin-Managed Password Reset Helper
- **Decision:** Clicking **"Forgot password?"** toggles an inline helper message: *"Please contact your Clinic Administrator to reset your password."*
- **Rationale:** Staff accounts are provisioned and reset manually by Clinic Administrators. No self-service password reset API exists on the backend.

### 5. UI Architecture: Bootstrap 5 + Scoped CSS
- **Decision:** Implement the split-screen layout, rounded pill inputs, and `#111827` sign-in button using **Bootstrap 5.3 utilities and a dedicated `Login.css`** file.
- **Rationale:** The repository standardized on Bootstrap 5. Introducing Tailwind CSS from the Stitch prototype would duplicate CSS bundles and cause stylesheet collisions.

### 6. Local Asset Packaging & Static Hero Card
- **Decision:** The right-hand hero graphic is downloaded to `frontend/public/assets/login-illustration.png`. The carousel indicator dots are removed in favor of a static, distraction-free branding card with headline and feature summary.
