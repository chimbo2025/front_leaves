# Roles, Permissions & Features — System Report
**Mfumo wa Likizo (Leave Management System)**
Backend: Laravel 12 (`backend-leave`) · Frontend: Next.js · Database: MySQL `dpp_leave`
Report date: October 2026 · Status: verified (backend 213/213 tests green, frontend type-check clean)

## 1. Executive summary

The system implements RBAC with two independent axes: *capability* ("may you do X" — permission codes) and *scope* ("on whose records" — zone/department/own). A user can act only when **both** hold. There are **8 system roles**, a **79-code permission catalog across 15 modules**, and enforcement at three layers: route middleware (capability), policies + scope service (row visibility), and workflow-ownership checks (who may decide a case). The frontend never invents access — it renders purely from the server-issued capability payload and mirrors the scope rules so users never see buttons the API would refuse. Key guarantees: no wildcard permissions, no invisible permission grants, every catalogued code is actually enforced somewhere, and every grant is revocable with immediate effect.

## 2. Feature catalogue

| # | Feature | What it does |
|---|---------|--------------|
| 1 | Leave requests | Full lifecycle: draft → submit → approve / reject / return-for-correction → withdraw; resumption date set at approval; policy snapshot pinned at submit |
| 2 | Approval chains | Dynamic multi-step chains resolved from zone, department, role, leave type and duration; SLA per step with escalation |
| 3 | Delegation | Temporary transfer of SUPERVISOR/DEPT_HEAD/ZONAL_HEAD authority within a time window |
| 4 | Cases & handovers | Dockets attached to requests; ownership handover with accept/reject; final approval pauses until handovers complete |
| 5 | Documents | Upload/download/delete of certificates; medical & birth records restricted to HR |
| 6 | Policies & eligibility | Versioned leave policies (never edited in place); per-employee eligibility checks with blockers; balances and tips |
| 7 | Leave plans | Annual leave almanac: draft → propose ranked options → select → confirm → convert into a real request |
| 8 | Waivers / deferrals | Carry-over/deferral requests with review → approve/reject and a one-time ledger posting |
| 9 | Return-to-work | Auto-opened return case freezing the expected return date; late returns require explanation, review, possible deduction |
| 10 | Leave payments | Encashment/purchase cases: open → evaluate → HR review → approve → Accounting settlement (receive → paid) |
| 11 | Official letters & signatures | Generated approval/rejection letters with content hash, QR verification token, per-decision digital signatures |
| 12 | Notifications | Inbox, unread counts, mark-read, per-user channel preferences, mandatory vs optional events, scheduled reminders |
| 13 | Reports & exports | On-screen aggregates (requests, balances, staffing, gender-split, audit…), async exports with download/cancel/expiry |
| 14 | Roles & org admin | Role matrix editor, staff registration, zones/departments/positions, role grants with scope |
| 15 | Audit ledger | Hash-chained append-only log of every mutation, with chain-verification endpoints |

## 3. Roles

| Role | Tier | Purpose | Scope / reach |
|------|------|---------|---------------|
| SELF_SERVICE | 0 | Baseline floor held by **every active employee** (18 codes: file/view own requests, read policies, own documents, own plans/waivers/returns/payments, own notifications, own reports) | Own records only; no approvals, no cross-zone |
| SUPERVISOR | 1 | Line manager: day-to-day approvals within own reporting line | Own team |
| DEPT_HEAD | 2 | Heads one department; approve/return/reject | Department (from grant) |
| ZONAL_HEAD | 3 | Heads one region; approve/return/reject, incl. outside own zone via `approve_zone` | Zone (from grant) |
| HR | 4 | Central administration: staff, roles, policy, cross-zone reads, HR-side payment review | Cross-zone (requests/staff/reports) |
| ACCOUNTING | 4 | Settlement only: receive + process payments | Cross-zone, payments only — never approves |
| FINAL_AUTHORITY (DPP) | 5 | Final sign-off; holds all 79 codes enumerated | Org-wide only via explicit `view_cross_zone` codes |
| BREAK_GLASS | 5 | Emergency recovery; identical profile to Final Authority | Same; every grant hard-capped at **30 days**, never assigned by default |

Scope never comes from the role name — it comes from the individual grant (`employee_roles.scope_zone_id` / `department_id`). An empty scope means *own records only*, never organisation-wide. There is deliberately no HQ role.

## 4. Permission catalog (79 codes, 15 modules)

| Module | Codes |
|--------|-------|
| requests | view, create, approve*, approve_zone*, view_cross_zone† |
| policies | view, create, edit_policy |
| documents | view, create, delete, view_medical_documents |
| delegations | view, create, update |
| reports | view, view_own, view_department, view_zone, view_organisation, view_cross_zone†, view_gender_reports, export, view_audit, view_financial, view_sensitive |
| staff | view_cross_zone† |
| admin | view, create, update, delete |
| leave_plans | view_own, create_own, select_own, view_department, view_zone, view_cross_zone†, confirm_department, confirm_zone |
| leave_waivers | create_own, view_own, review, approve, reject, view_department, view_zone, view_cross_zone† |
| leave_returns | report_own, view_own, view_department, view_zone, view_cross_zone†, review, excuse, apply_deduction, close |
| leave_payments | view_own, view_department, view_zone, view_cross_zone†, create, review, approve, reject, receive, process, cancel |
| leave_documents | view_own, download_own, download_hr, generate, revoke |
| notifications | view_own, manage_preferences, view_sensitive |
| report_exports | download, cancel |
| audit_logs | view |

† `view_cross_zone` is the *only* route to organisation-wide visibility.
`requests.approve_zone` is a frontend-only signal (the API gates approvals by workflow-assignment ownership).

## 5. How enforcement works

**Capability check (may you?):** routes declare `permission:module.action` middleware backed by `PermissionService::can()` (`app/Services/PermissionService.php`, `app/Http/Middleware/CheckPermission.php`). A user's codes are exactly what their active, in-window role grants resolve to — cached 60 seconds and invalidated immediately on any grant change. Unauthenticated → 401; deactivated → 403; unknown code → 403 `Missing permission`; a `permission:*` typo fails loudly with 500 instead of silently opening the route.

**Scope check (on whose?):** `AccessScopeService` (`app/Services/AccessScopeService.php`) resolves cross-zone → zone → department → own from the same grants, and constrains every listing query; the caller's own rows are always retained. Object-level policies (`app/Policies/`, 9 files) add per-record rules on top.

**Decision check (this case?):** approving, returning or rejecting a request ignores the `requests.approve` code entirely — only the currently-assigned step owner (or active delegate) may decide, the requester is always excluded from their own chain, and payment cases additionally forbid self-approval at every stage.

**Privacy overlays:** medical/birth documents require `documents.view_medical_documents` (never implied by zone); notification bodies strip leave detail unless the recipient holds `notifications.view_sensitive`; QR verification and Accounting views expose only public-safe/payable facts; salary snapshots are visible only to HR-side reviewers.

## 6. Role lifecycle & safeguards

- **Assignment:** via position defaults on hiring (`position_default_roles`), explicit scoped grants (`admin.update`), or bulk role replacement — all validated *before* any write, so a rejected grant never half-creates a user.
- **No escalation:** `is_final_authority` can only be set by database migration, never via API; a granter cannot hand out codes they don't hold themselves.
- **Bounded emergency access:** every BREAK_GLASS grant expires in ≤ 30 days by construction.
- **Archive, don't delete:** removing a role flips it inactive (grants stop applying instantly) but preserves history; deletion is refused while a live approval workflow references the role, naming the blocking steps.
- **Every code revocable:** there is no hidden baseline merge — what the matrix shows is exactly what a user holds, and detaching a grant revokes access immediately.
- **Catalog integrity:** automated tests guarantee no decorative codes (every switch in the matrix is wired to a real check), every route code exists in the catalog, and every code is held by at least one active role.

## 7. Who can do what (condensed matrix)

| Capability | Employee | Supervisor | Dept/Zone head | HR | Accounting | Final Authority |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| File & view own leave | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Decide approval steps | – | own team | own dept/zone | ✓ | – | final steps |
| Manage delegations | – | ✓ | ✓ | ✓ | – | ✓ |
| See medical documents | – | – | – | ✓ | – | – |
| Create/edit policies | – | – | – | ✓ | – | ✓ |
| Review waivers/returns | – | – | scoped | ✓ | – | ✓ |
| HR-review payments | – | – | – | ✓ | – | ✓ |
| Settle (receive/process) payments | – | – | – | – | ✓ | – |
| Generate/revoke letters | – | – | – | ✓ | – | ✓ |
| Gender/financial/audit reports | – | – | – | ✓ | – | ✓ |
| Manage roles & staff | – | – | – | ✓ | – | ✓ |

## 8. Frontend behaviour

Login stores the token and the server-issued capability payload (`permissions[]` plus concrete `allowed_zone_ids`/`allowed_department_ids`; `lib/leave-api.ts`, `lib/auth.tsx`, `components/leave/leave-context.tsx`). While permissions are unresolved the app shows a loader and fires no requests (unknown = deny, so users never collect 403s). Navigation, queues, buttons and even table columns are gated per code (`requests.approve`, `documents.view_medical_documents`, `reports.view_gender_reports`, `admin.*`, …); supervisors see an office-wide queue while plain staff see only steps assigned to them; every list is pre-filtered by the same scope rule the server applies, so the screen never shows a row the API would refuse.

## 9. Design principles

1. **Capability ⊥ scope** — permission says *may*, grant says *where*, workflow ownership says *may decide this case*. A bare `reports.view` never widens rows.
2. **No wildcards, no invisible grants** — authority is enumerated row by row; the matrix is the single source of truth.
3. **Separation of duties** — HR approves payments, Accounting settles them; neither can do the other's job.
4. **Privacy by code, not by convention** — medical, salary and gender data each have their own gate, tested to stay hidden from managers and ordinary recipients.
5. **Everything pinned by tests** — 213 backend tests (2,902 assertions) lock the matrix, the scope rules, the lifecycle guards and the payment/letter/notification workflows.

## Sources

- Roles & matrix: `backend-leave/database/seeders/DatabaseSeeder.php`, `app/Services/PermissionService.php`, `app/Services/AccessScopeService.php`, `app/Http/Middleware/CheckPermission.php`, `config/permission_enforcement.php`
- Feature gates: `backend-leave/routes/api.php`, `app/Http/Controllers/Api/`, `app/Policies/`
- Frontend: `components/leave/leave-context.tsx`, `components/leave/views/`, `lib/leave-api.ts`, `lib/auth.tsx`, `lib/leave.ts`
