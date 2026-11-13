# Domain Glossary (Ubiquitous Language)

This document establishes the single source of truth for domain vocabulary across developers and AI coding agents. Always use these exact terms in database models, serializers, API payloads, state, and UI labels.

---

### Core Personas & Roles
- **Staff:** Any clinic employee profile (`adminapp`, `doctor`, `receptionist`, `pharmacist`, `LabTechnicianApp`) linked to an authenticated system `User` account. Role permissions and routing (`ROLE_HOME_PATHS`) are strictly server-authoritative and determined by `User.RoleId.RoleName`.
- **Doctor:** Licensed physician assigned to a specific `Department` who performs consultations, prescribes medicines, and orders lab tests.
- **Receptionist:** Front-desk staff responsible for patient onboarding, scheduling appointments, generating queue tokens, and taking initial billing/consultation payments.
- **Pharmacist:** Staff managing pharmacy stock, validating prescription items against inventory, and generating medicine bills.
- **Lab Technician:** Staff executing prescribed diagnostic tests, recording numerical/observational findings, and issuing finalized lab reports.
- **Patient (Unauthenticated):** Clinical entity registered with demographic and baseline biometric data (blood group, height, weight). Does **not** possess system login credentials or a direct portal account in the current architecture.

---

### Clinical Workflow
- **Appointment:** A scheduled visit connecting a `Patient`, `Doctor`, and `Department`.
  - *Statuses:* `Scheduled`, `Waiting`, `Completed`, `Cancelled`.
- **Queue / Token:** Sequential visit order managed by Receptionists for walk-in or scheduled doctor consultations.
- **Consultation:** The clinical encounter record between Doctor and Patient containing diagnosis notes, symptoms, and vital checks.
- **Doctor Prescription:** Directives issued by a doctor during consultation specifying medication, dosage, duration, and frequency.
- **Lab Prescription (Order):** Diagnostic tests ordered by a doctor during consultation to be carried out by the lab.
- **Lab Report:** Formatted findings, reference ranges, and technician remarks resulting from a processed lab test.

---

### Pharmacy & Inventory
- **Master Medicine:** Canonical medicine catalog item (brand name, chemical generic name, category, strength, unit price).
- **Dosage:** Standardized administration rules (frequency, duration, meal-timing instructions).
- **Medicine Stock:** Current quantity on hand per batch, tracking expiry dates, supplier details, and reorder levels.
- **Reorder Request:** Automated or manual restock notification raised when inventory drops below the safety threshold.
- **Medicine Bill:** Final line-item invoice issued to the patient upon dispensing pharmaceuticals.

---

### Administrative & Platform
- **Department:** Medical specialty division (e.g., Cardiology, General Medicine, Pediatrics).
- **Audit Log:** Immutable event journal recording administrative and clinical actions (`ActionType`, `TableAffected`, `RecordId`, `StaffId`, `action_time`).
- **Notification:** System message alerting staff to pending actions (e.g., new test ordered, low stock alert).

