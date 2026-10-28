# DPP Zanzibar Leave Management System — Authorization Root-Cause Audit

**Phase 1 deliverable.** Read-only investigation for the specification in `dpp_analysis.md`.
No application file in either repository was created, modified, or deleted during this audit.
The sole new artefact is this report. See §14 for the exact write record.

| | |
|---|---|
| Backend | `E:\Dev\Zee\backend-leave` (Laravel, MySQL `dpp_leave` @ 127.0.0.1:3306) |
| Frontend | `E:\Dev\Zee\Leave Management system` (Next.js 16, React) |
| Catalog at audit time | **21 permission codes** (was 60; 35 pruned by migration `2026_10_03_120000`) |
| Test baseline | 95 passed / 616 assertions (before this audit; unchanged by it) |
| Method | Full read of `routes/api.php`, all 14 API controllers, all 15 FormRequests, all 4 policies, all 9 services, `PermissionService`/`AccessScopeService`/`AuditService`, all models, the permission/seeder migrations, live schema via `SHOW CREATE TABLE`, and the frontend permission pipeline across all views |

**Labelling.** `CONFIRMED` = the cited code was read directly. `INFERRED` = reasoned from code
but not executed. Line numbers refer to the file as it stood at audit time.

---

## 1. Executive summary

The authorization chain is **sound at the bottom and broken at the top**. Record-level scoping
(`AccessScopeService`) is genuinely deny-by-default and is the strongest asset in the codebase.
Above it sit four defects that together mean the RBAC console materially misrepresents what the
system enforces:

1. **One of the 21 codes is not enforced at all** — `documents.view_medical_documents`, whose only
   reader is a policy that is never invoked. This is a regression introduced by the Phase-0 prune
   work; see §3.
2. **A wildcard sentinel** (`is_final_authority ⇒ ['*']`) grants one account every code,
   including codes that do not yet exist, and grants org-wide scope on every module.
3. **Enforcement coverage is thin** — 27 of 70 routes carry a `permission:` gate; two policies
   are never called; all 15 FormRequests `return true`.
4. **The frontend has two disagreeing permission engines**, one of which falls back to a
   hardcoded matrix, and the RBAC matrix Save button is ungated.

There are **no hard-coded user or employee IDs** in `app/` or `routes/`. All identity special-casing
flows through role ids or the `is_final_authority` flag.

---

## 2. Chain verdict

| Link | Verdict |
|---|---|
| User → Employee | **BROKEN** — `employees.user_id` has no UNIQUE constraint |
| Employee → EmployeeRole | **BROKEN** — FK `ON DELETE SET NULL` promotes a scoped grant to unscoped; `employee.is_active` never consulted |
| Role date windows | Works, but the predicate is duplicated and evaluated in UTC |
| Role → RolePermission → Permission | **SOUND** — unique codes, composite PK, both FKs CASCADE |
| Effective permissions | **BROKEN** — wildcard sentinel; 60s cache with a known invalidation hole; no lifecycle flags |
| Capability response (`/api/me`) | Works, but reports `["*"]` for DPP and advertises inactive roles |
| Frontend permission check | **BROKEN** — two engines that disagree; `can()` fails open to a static matrix |
| Route middleware | **PARTIAL** — 27/70 gated; comma-separated form broken; `permission:*` footgun |
| Controller / policy authorization | **PARTIAL** — 2 of 4 policies never invoked; 15/15 FormRequests return true |
| Service authorization | **BROKEN** — `decide()` validates before authorizing, returns 422 not 403 |
| Database scope | **SOUND** where applied; the gaps are endpoints that skip it (§7) |

---

## 3. Correction to prior work — the governance test false-passes

`PermissionCatalogIntegrityTest` was added earlier today to prevent decorative permission codes.
It has a **false pass**, and this audit is what exposed it.

The test scans `app/` and `routes/` for references to each code and treats any reference as
enforcement. It does not verify the referencing code is **reachable**. For
`documents.view_medical_documents`:

- the only reference is `app/Policies/LeaveDocumentPolicy.php:33`
- `LeaveDocumentPolicy` is **never invoked** — verified: `authorize()` is called exactly 7 times
  in the entire application (`CaseController.php:42,72,81,91`, `RequestController.php:76,136,143`),
  none against a `LeaveDocument`
- there is no document read or download route; `routes/api.php:74` is POST-only

**Consequence:** the medical-document privacy gate protects nothing. `documents.view_medical_documents`
is a decorative switch — the precise failure mode migration `2026_10_03_120000` was written to
eliminate, reintroduced by that same migration's own retention decision.

**Required fix.** The test must resolve a reference to a *reachable* enforcement point, not a
string occurrence. Minimum bar: a code is `implemented` only if referenced from (a) route
middleware, (b) a method reachable via `authorize()`, or (c) a service method with a live caller.
Until a document read/download endpoint exists, this code must be `planned`, not `implemented`.

Two further corrections to secondary findings, for the record:

- `EmployeePolicy` is also never invoked, but `staff.view_cross_zone` **is** enforced — via
  `AccessScopeService::applyEmployeeScope()` (called at `OrganizationController.php:130`) →
  `forUser($user, STAFF)` → `canViewAllZones()` → `can('staff','view_cross_zone')`. An initial
  grep missed this because PowerShell's `app\**\*.php` glob does not recurse past one directory
  level; the finding was re-verified with `Get-ChildItem -Recurse`.
- `CaseHandoverPolicy` **is** invoked (`CaseController.php:72,81,91`) via Laravel policy
  auto-discovery. A grep by class name reports zero references and is misleading here.

---

## 4. P0 findings

### P0-1 — `documents.view_medical_documents` is unenforced (see §3)

| | |
|---|---|
| **File:line** | `app/Policies/LeaveDocumentPolicy.php:33`; `routes/api.php:74` |
| **Current** | The only reference to the code sits in a policy with no call site. No document read/download endpoint exists. |
| **Expected** | A sensitive-document gate must guard every path that returns or streams a document. |
| **Security impact** | Birth certificates, medical certificates and antenatal records have no server-side privacy gate. The gate is client-side only (`documents.tsx:59`, `request-detail.tsx:30`), so filtering the UI is the only control. |
| **Dependencies** | None — needs a new read endpoint plus the policy call. |
| **Fix** | Add `GET /api/requests/{id}/documents/{document}` invoking `authorize('view', $document)`; return `documents` on the request detail with the policy applied; until then mark the code `planned`. |

### P0-2 — `POST /api/handovers/{leaveRequest}/propose` has zero authorization

| | |
|---|---|
| **File:line** | `routes/api.php:105`; `app/Http/Controllers/Api/CaseController.php:52-68`; `app/Services/CaseHandoverService.php:76-83` |
| **Current** | No `permission:` middleware, no `authorize()`, no ownership check. `from_employee_id` is taken from the caller with a `?? $leaveRequest->employee_id` fallback (`:62`). Contrast `accept`/`reject`/`complete` at `:72,81,91`. |
| **Expected** | `permission:requests.approve`, then `authorize('view', $leaveRequest)` — identical shape to the GET route at `routes/api.php:104`. |
| **Security impact** | **Any authenticated employee, including one holding no roles at all, can forge a case handover against any leave request in any zone**, naming an arbitrary `to_employee_id`. After the (separately gated) `accept`, `CaseHandoverService.php:96` reassigns the live prosecution case's `owner_id`. This is the entry point to case-file hijack, and it pauses the legitimate approver's chain (`decide()` returns `blocked_by_handover`). |
| **Dependencies** | None. |
| **Fix** | Add the middleware and the `authorize()` call; delete the fallback at `CaseController.php:62`; add `CaseHandoverPolicy::propose()` = `LeaveRequestPolicy::approve($user,$req) \|\| $req->employee_id === $user->employee?->id`. |

### P0-3 — `GET /api/eligibility` returns organisation-wide statistics to every token

| | |
|---|---|
| **File:line** | `routes/api.php:65`; `app/Http/Controllers/Api/EligibilityController.php:15-96`, specifically `orgSummary()` at `:59-96` |
| **Current** | No middleware, no policy, no scope. Returns the caller's own rows **plus** `Employee::where('is_active',true)->get()->groupBy('department_id'/'zone_id')` aggregates for the entire organisation. |
| **Expected** | Self rows ungated; aggregates behind `permission:reports.view` and scoped via `AccessScopeService`. |
| **Security impact** | Every authenticated user reads nationwide headcount and per-department/per-zone leave-eligibility statistics. This directly contradicts the specification's rule that regional offices access only their own zone. |
| **Dependencies** | None. |
| **Fix** | Split into `GET /eligibility` (self) and `GET /eligibility/summary` behind `permission:reports.view`, routed through `applyEmployeeColumnScope`. |

### P0-4 — Two requests from `admin.create` to unrestricted superuser

| | |
|---|---|
| **File:line** | `app/Http/Controllers/Api/RoleController.php:54` (create accepts the flag), `:70-75` (mutable on non-system roles); `app/Http/Controllers/Api/OrganizationController.php:341-351`; `app/Http/Requests/StorePositionRequest.php:24`; `app/Services/PermissionService.php:55-58`, `:167-169` |
| **Current** | `POST /api/roles {"name":"X","is_final_authority":true}` is accepted for any caller holding `admin.create`. `default_role_ids` is validated only as `exists:roles,id`. `POST /api/org/employees` then grants every `position_default_roles` row to the new employee. `is_final_authority` makes `codesFor()` return `['*']`, and `can()` tests `in_array('*', $codes)` **before** it ever inspects `$module`. |
| **Expected** | Minting an org-wide authority must require an authority at least as strong as it confers, and must not be reachable by role id string. |
| **Security impact** | `admin.create` + `admin.update` (both held by HR today) yields an account with every code plus org-wide scope on every module — invisible in the RBAC matrix, which shows `FINAL_AUTHORITY` holding only 7 codes. Any future partially-delegated admin role escalates instantly. |
| **Dependencies** | Blocked by the wildcard removal (P1-1); the reverse order leaves the sentinel able to auto-grant newly added codes. |
| **Fix** | Reject `is_final_authority: true` on `roles.store()`; gate any mutation of it behind a dedicated explicit code plus audit; validate `default_role_ids` against that same code; record the granted ids in the audit payload (`OrganizationController.php:363-367` currently records only a count). |

---

## 5. P1 findings

| # | File:line | Current behaviour | Expected | Security impact | Fix |
|---|---|---|---|---|---|
| **P1-1** | `PermissionService.php:55-58`, `:90-97`, `:167-169` | `is_final_authority ⇒ ['*']`; `can()` short-circuits on the sentinel before inspecting module or action | Explicit, versioned, enumerated grants | Grants codes that do not exist yet and never will; grants all route middleware; makes `canViewAllZones()` true for **every** module string, not just the three that define a `view_cross_zone` code. The explicitly seeded `FINAL_AUTHORITY` `view_cross_zone` rows are shadowed dead code. | Enumerate an approved profile for `FINAL_AUTHORITY`; delete the sentinel branch from both `codesFor()` and `effectiveGrants()`; keep a separately-approved, time-limited, audited break-glass role for recovery only |
| **P1-2** | `RoleController.php:75` vs `:77-80` | The `is_final_authority` flag is written at `:75`; cache invalidation sits inside `if ($form->has('permissions'))` at `:79` | Any authz-affecting write invalidates | `PATCH /api/roles/{custom}` with `{"is_final_authority":false}` returns 200, audits, and **drops nobody's cache**. Holders keep resolving `['*']` for up to 60s — no error, no signal | Move `invalidatePermsCache($role)` outside the branch |
| **P1-3** | `LeaveRequestService.php:221-223` vs `:227-235`; `routes/api.php:79` | `validateApprovedPeriod()` runs **before** the assignment-ownership check; failure raises `ValidationException` (422) | permission → ownership/scope → workflow state → business rules → mutate; failure = 403 | A caller with no pending assignment learns the leave type's `max_days_per_request` ceiling and whether the target employee has overlapping approved leave — a channel into a calendar that `LeaveRequestPolicy::view` and the whole scope layer exist to protect | Reorder so `:227-235` precedes `:221-223`; throw `AuthorizationException`; add `permission:requests.approve` to the route |
| **P1-4** | `CaseHandoverPolicy.php:43-50` | `complete()` falls back to `can('requests','approve')` with no zone/department check | AND the permission with record scope | Any supervisor anywhere can complete any handover in any zone and record themselves as `reviewed_by`; since `LeaveRequestService.php:47` treats `accepted` **or** `completed` as satisfying the final gate, a remote supervisor can prematurely close a colleague's approval chain | AND with `LeaveRequestPolicy::view($user, $handover->request)` |
| **P1-5** | `WorkflowResolver.php:66` | `$d->delegator_employee_id === ($holder?->id ?? $d->delegator_employee_id)` is tautological when no standing holder exists | Require a resolved holder and an exact delegator match | The **first** in-window active delegation for a role wins regardless of who created it, so one office's delegation can route another office's approvals to its own delegate — cross-zone approval substitution | `if (! $holder) { return null; }` before the delegation scan |
| **P1-6** | `CheckPermission.php:30`; `AuthController.php:37` | Middleware checks `users.is_active` only; `employees.is_active` is read at login and in 4 unrelated places, never in authorization | Both flags checked on every request | HR deactivates a terminated officer; the API returns 200 and **nothing changes** — the leaver keeps every permission, scope and approval assignment until the token expires. There is also **no endpoint anywhere that sets `users.is_active`**, so offboarding is not expressible without direct SQL | Check `$user->employee?->is_active` in middleware; add an audited deactivate verb that flips both flags and deletes all Sanctum tokens |
| **P1-7** | `OrganizationController.php:152-193`, `:192` | The `forget()` call sits inside `if (array_key_exists('role_ids', $data))` | Invalidate on any authorization-affecting field | Cache survives deactivation and role changes made through the same PATCH | Move the `forget()` call out of the branch |
| **P1-8** | `OrganizationController.php:213-247`; `RoleController.php:146-149` | `grantRole()` and `syncPermissions()` have no separation of duties | Cannot grant a permission or role you do not hold | An `admin.update` holder adds `admin.create` to any role, then grants that role to any employee including themselves | Add the anti-escalation guard plus `PermissionPolicy` and `RolePolicy` |
| **P1-9** | `…210010_create_employee_roles_table.php:32-33`; `PermissionService.php:104-105`; `AccessScopeService.php:58-63` | `department_id` and `scope_zone_id` are `ON DELETE SET NULL`, and NULL reads as "no constraint" | Deleting a zone/department removes or freezes the grant, never broadens it | Deleting one zone row promotes a zonal head's scoped grant to **org-wide**; deleting a department does the same for a department head | `ON DELETE RESTRICT`; add a test asserting holder scope never grows on zone/department deletion |
| **P1-10** | `config/app.php:68`; `PermissionService.php:159-160`; `AccessScopeService.php:54-55` | `'timezone' => 'UTC'` hardcoded (no `APP_TIMEZONE` in `.env`); six sites call `now()->toDateString()` | One shared date-window helper on a configured timezone | EAT = UTC+3, so between 00:00 and 03:00 local "today" is yesterday: an `effective_to = today` grant stays live for 3 extra hours daily, and an `effective_from = today` grant is inert for 3 hours after the admin clicks save | `env('APP_TIMEZONE', 'Africa/Dar_es_Salaam')`; introduce `DateWindow` and delete the duplicated predicate |
| **P1-11** | `RoleController.php:77-84`, `:58-62`; `OrganizationController.php:195-197` | Audit records `name`/`description` and `count($permissions)` instead of values | Before/after values for every security-relevant write | The ledger cannot answer "which permissions did this admin add to `SUPERVISOR`, and when" — the single most important question in an RBAC incident. Combined with P0-4 this is an undetectable escalation path | Record full before/after code and role-id lists |
| **P1-12** | `AuditService.php:37`, `:60-92`, `:106-109` | `append()` reads the previous hash with no lock and no transaction; `verify()` hashes only `payload` + `created_at`, so `entity_type`, `entity_id`, `action` and `reason` sit outside the chain; no IP or request-id columns | Locked append; all mutable columns hashed; correlation identifiers recorded | Two concurrent appends can fork the chain, making the integrity endpoint report `valid: false` — a DoS on the control itself. Column edits are undetectable | `lockForUpdate()` inside a transaction; extend the hash input; add `ip_address` and `request_id` |

---

## 6. P2 findings

### 6.1 Missing policies (7 required by the specification)

| Policy | Enforced today | What a policy adds |
|---|---|---|
| `ZonePolicy` | **Nothing.** `OrganizationController.php:33-36` — no middleware, no inline check, no scope | `viewAny` gate; containment for `zone_id` writes |
| `DepartmentPolicy` | **Nothing.** `:38-41` and `orgTree():374-396` | `viewAny`; scope the hierarchy |
| `PositionPolicy` | Route middleware only (`routes/api.php:45-47`); read at `:43-49` is ungated | Zone/department containment on update/delete; reject `FINAL_AUTHORITY` in `default_role_ids` |
| `RolePolicy` | Route middleware only; `is_system` checked at `:69` and `:101` **only** for the flag and for deletion | Deny permission-set edits on system roles; a `viewAny` that redacts `is_final_authority` |
| `PermissionPolicy` | `RoleController.php:39-44` behind `admin.view`; `syncPermissions()` accepts any existing code | `grant`/`revoke` ability implementing "cannot grant what you do not hold" |
| `ReportPolicy` | **Strongest area** — `permission:reports.view` on the group (`routes/api.php:125`), `view_gender_reports` on gender (`:129`), and full scoping in `ReportService.php:41-60` for all 9 reports | Per-report abilities; a date-range bound (`ReportController.php:17-26` accepts any `from`/`to`) |
| `DelegationPolicy` | Partial — route middleware plus "you hold the role" (`DelegationController.php:33-38`) and "you are the delegator" (`:61-63`) | Delegate active/scope/qualification checks, bounded `end_date`, duplicate guard, audit |

Additionally `EmployeePolicy` and `LeaveDocumentPolicy` exist but are **never invoked** (§3).

### 6.2 No permission lifecycle — the absence that forces the whole prune debate

- `permissions` has **no** `active`/`status` column: `id, code, module, action, label, hint, created_at, updated_at`
- `roles` has **no** `active` column: `id, name, description, approval_tier, is_final_authority, is_system, …`
- `employee_roles` has **no** `active` column
- There is **no endpoint that creates, edits, or deletes a `permissions` row.** `RoleController` writes
  only `role_permissions`; the catalog changes solely via migrations and the seeder.
- Consequently **deletion is the only off switch**, and it cascades irreversibly:
  `role_permissions.permission_id` is `ON DELETE CASCADE`, so removing a code strips it from every
  role, removes it from the matrix UI, and leaves **no record** of who previously held it
  (no grant-history table exists). During an incident there is no way to freeze one capability
  without destroying the configuration, and re-running the seeder uses `syncWithoutDetaching`, so it
  would not restore a deliberately removed grant.

**Dependencies:** this is the structural prerequisite for the lifecycle model the specification
requires. It also determines whether `documents.view_medical_documents` is `implemented` or `planned`.

### 6.3 Cache invalidation is manual and incomplete

`grep 'Cache::forget'` over `app/` returns exactly **two** production call sites:
`PermissionService.php:190-195` (`forget`) and `:198-206` (`forgetHoldersOf`). There are **no
Eloquent observers**. Call sites: `OrganizationController.php:192,239,282` and
`RoleController.php:154,133`.

| Gap | Effect |
|---|---|
| `RoleController.php:75` writes outside the invalidation branch | `is_final_authority` revocation silently fails for 60s (P1-2) |
| `OrganizationController.php:192` inside `if (role_ids)` | Deactivation and other role-affecting writes leave stale cache (P1-7) |
| `roles.store()` (`:46-65`) never invalidates | Harmless today (no holders yet), but the guard is absent rather than deliberate |
| `syncDefaultRoles()` (`:58-64, :86-98`) never propagates | Position default-role changes reach **no existing employee**; `PositionDefaultRole` is read in exactly one authorization-relevant place, `OrganizationController.php:341`, inside `store()`. The admin UI presents the setting as if it applies |
| Any write outside those two controllers | Fails open for 60s — raw SQL, `tinker`, queued jobs, and the prune migration itself |

**Fix:** replace the 60s per-user memo with a `permission_catalog_version` counter bumped inside the
same transaction as any write to `roles`, `role_permissions`, `permissions` or `employee_roles`,
and include it in the cache key. That invalidates everyone atomically without an enumeration query.

### 6.4 Data-model integrity gaps

| Finding | File:line | Impact |
|---|---|---|
| `employees.user_id` not UNIQUE | `…210004_create_employees_table.php:13` | `User::employee()` is a `HasOne` with no tiebreak; a collision silently grants one account the union of two people's authority |
| `permissions.code` is `utf8mb4_unicode_ci` (case-insensitive) | `…210007:13` vs `PermissionService.php:171` case-sensitive `in_array` | A code inserted as `REQUESTS.VIEW` is listed by the API but can never match — a silently dead switch |
| `employee_roles_identity` does not cover NULLs | `…210010:29` | MySQL treats NULLs as distinct, so `(e7, SUPERVISOR, NULL, NULL)` can be inserted repeatedly; two sequential time-boxed grants of the same role+scope will collide on the index |
| `source` and `granted_by` are write-only | grep across `app/` | Provenance is recorded but never read; `granted_by` has no FK or index |
| `position_default_roles` materialised only at employee creation | `OrganizationController.php:341-351` | See §6.3 |
| `positions.is_final_authority` is dead | `Position.php:14,19` | Stored, never read; a decorative switch in the admin position form — precisely the pattern the prune migration targeted |

### 6.5 CheckPermission middleware defects

`app/Http/Middleware/CheckPermission.php` (40 lines, read in full):

| Line | Defect | Impact |
|---|---|---|
| `:23` | `explode('.', $permission, 2)` — comma-separated multi-code form is **not implemented**; `permission:a.b,c.d` becomes action `"b,c.d"` and always 403 | Fails closed, so not exploitable, but any route written to that form is unreachable. `permission:approve_zone` (no dot) resolves to `"approve_zone."` and also 403s |
| `:34` | `if ($module !== '*' && …)` — a route declared `permission:*` short-circuits the gate for **any** authenticated active user | Not currently reachable (no such route exists), but one line away from making every gate decorative. The docblock at `:12` advertises `*` as supported, which invites the mistake. Delete the branch |
| `:30` | Only `users.is_active` | See P1-6 |
| — | Registered per-route only; **no global default-deny layer** | Any new route added without a `permission:` string is authenticated-only. This is how P0-2 and P0-3 arose |
| — | No `$middleware->priority()` declared | `auth:sanctum` is on the outer group so ordering is currently correct, but route-model binding has not run when `CheckPermission` executes, so record-scoped checks are impossible at this layer |

### 6.6 Ungated sensitive reads

| Endpoint | Route | Finding |
|---|---|---|
| `GET /api/org/zones` | `routes/api.php:35` | No middleware/policy/scope. Leaks `is_hq` and `is_pemba`, which drive the ZONAL_HEAD bypass at `WorkflowResolver.php:197` |
| `GET /api/org/departments` | `:36` | No middleware/policy/scope |
| `GET /api/org/positions` | `:37` | No middleware/policy/scope. Returns `default_roles`, revealing which positions auto-grant powerful roles |
| `GET /api/org/tree` | `:48` | No middleware/policy/scope. Returns the full national department hierarchy |
| `GET /api/workflows`, `/{id}` | `:84,86` | Gated `policies.view`, which is a **self-service baseline** code — so every employee can read all workflow definitions org-wide |
| `GET /api/audit` | `:120` | Gated `admin.view` (held by HR) with **no scope** — HR reads the entire ledger including privilege changes made by central admins |
| `GET /api/org/employees` | `:38` | No `permission:` gate at all (scope + column hiding only). Revoking every role still leaves the endpoint open to any valid token |
| `GET /api/roles`, `/roles/permissions` | `:142,143` | `admin.view` only, no policy. Any `admin.view` holder sees the complete authorization model including which roles are `is_final_authority` — material assistance for P0-4 |

### 6.7 Deny-by-default violations

| # | File:line | Behaviour |
|---|---|---|
| D-01 | `CheckPermission.php:34` | `permission:*` disables the gate entirely (latent) |
| D-02 | `PermissionService.php:55-58`, `:167-169` | Wildcard ⇒ allow everything |
| D-03 | `CaseHandoverPolicy.php:43-50` | `complete()` has no scope check |
| D-04 | `EligibilityController.php:59-96` | Org-wide aggregates, ungated |
| D-05 | `OrganizationController.php:374-396` | Full org tree, ungated |
| D-06 | `AccessScopeService.php:157-170` | `applyEmployeeColumnScope` with two empty arrays compiles to no predicate and returns the unrestricted query. Every current caller pre-guards (`ReportService.php:49-51`, `AccessScopeService.php:95-97`) — latent; add an internal `whereRaw('1 = 0')` guard |
| D-07 | `AccessScopeService.php:96`, `:130` | `where('employee_id', null)` compiles to `whereNull`, i.e. "rows where the column is NULL" rather than "no rows" |
| D-08 | `WorkflowResolver.php:66` | Degenerate equality when no standing holder exists |
| D-09 | `CheckPermission.php:30` | Inactive employee not detected |
| D-10 | `PermissionService.php:35-40` | `SELF_SERVICE` unconditional baseline (see §8) |
| D-11 | `NotificationController.php:16,35`; `CaseController.php:28`; `DelegationController.php:22,30`; `RequestController.php:57` | `where('col', $user->employee?->id)` with a null employee compiles to `whereNull`; `$request->user()->employee->id` is unguarded property access on null |

### 6.8 Role-name and data-field coupling

| # | File:line | Finding |
|---|---|---|
| B-05 | `WorkflowResolver.php:197` | `role_required === 'ZONAL_HEAD' && $employee->zone?->is_hq && $leaveType?->code !== 'STUDY'` ⇒ the ZONAL_HEAD approval step is **silently dropped** for HQ-zone requesters. The only place a `Zone` flag changes an authorization outcome, and it is subtractive, unaudited, and guarded by no policy |
| B-07 | `WorkflowResolver.php:38-45,84,197-218`; `LeaveRequestService.php:329`; `StoreDelegationRequest.php:19` | Authorization branches on role-id **strings** (`SUPERVISOR`, `DEPT_HEAD`, …). Renaming is safe (`id` is the key) but re-purposing a role silently rewires who approves what |
| B-08 | `LeaveRequestService.php:328-346` | `is_emergency_exception` is set by the **requester** (`StoreLeaveRequest.php:28`) and triggers an SMS to their zonal head. Privacy-safe template enforced at `NotificationService.php:43-49`, low severity, but it is an unaudited requester-triggerable side channel |
| B-03 | `OrganizationController.php:66-83`, `:341-351` | `default_role_ids` unrestricted → part of P0-4 |
| B-10 | `RoleController.php:146-149` | No "cannot grant what you do not hold" → P1-8 |

---

## 7. Scope enforcement matrix

`AccessScopeService` (`app/Services/AccessScopeService.php`, 171 lines, read in full) is genuinely
deny-by-default, and its docblock claim that org-wide reach comes **only** from an explicit
`<module>.view_cross_zone` code is accurate for every path except the wildcard (§ P1-1).
`Zone.is_hq` and NULL/NULL grants are correctly **not** treated as grants.

| Endpoint | Scoped? | Where |
|---|---|---|
| `GET /requests` | Yes | `RequestController.php:47` / `:49` |
| `GET /requests/{id}`, `/workflow` | Yes | `LeaveRequestPolicy::view` via `:76`, `:136` |
| `POST /requests/{id}/documents` | Yes | `authorize('update')` `:143` |
| `GET /handovers/{id}` | Yes | `CaseController.php:42` |
| `POST /handovers/{id}/propose` | **No** | P0-2 |
| `POST /handovers/{h}/complete` | **No** | P1-4 |
| `GET /org/employees` | Yes | `OrganizationController.php:130` |
| All 9 `GET /reports/*` | Yes | `ReportService.php:41-60` |
| `GET /notifications`, `/unread-count` | Self | `NotificationController.php:16,35` |
| `GET /leave/balance`, `/balance/{type}`, `/tips/{type}` | Self — no `employee_id` parameter exists | `LeaveController.php:93,108,118` |
| `GET /cases` | Self | `CaseController.php:28` |
| `GET /audit` | **No** | `AuditController.php:19-23` |
| `GET /eligibility` | **No** (own rows only) | P0-3 |
| `GET /org/zones`, `/departments`, `/positions`, `/tree` | **No** | §6.6 |
| `GET /workflows`, `/{id}` | **No** | §6.6 |
| `GET /requests/inbox` | Self | `RequestController.php:169` |

**`scope=all` is correctly not trusted.** `RequestController.php:40` re-checks `requests.view` and
`:47` re-applies the scope rather than skipping it; the default branch is strictly own-records.
Locked in by `tests/Feature/Api/ZoneScopeTest.php:79-109`. **No finding.**

**No IDOR via `employee_id`.** Every `employee_id`-shaped input was enumerated: `leaveTypeId`
(self-scoped), `delegate_employee_id` and `to_employee_id` (writes, not reads), `supervisor_employee_id`
(write), `department_id` on the staff list (a filter, ANDed with scope at `:130`, so it can only narrow).

**State-change ordering** is correct for `attachDocument`, `accept`, `reject`, `complete`,
`update`, `withdraw`, `submit` and `resubmit`. Broken for `propose` (P0-2) and `decide` (P1-3).

---

## 8. The self-service baseline is four decorative matrix switches

`PermissionService.php:35-40` grants `requests.view`, `requests.create`, `policies.view` and
`documents.view` to **every** user with an employee record, merged unconditionally at `:64` and
again at `:123-137`. It is a hardcoded PHP array: deleting the catalog row would cascade-remove
every grant **and** remove the toggle from the matrix, while `codesFor()` would still emit the code.
Revocation requires a redeploy.

All four codes **are** in the catalog and **are** rendered as editable per-role switches. Migration
`2026_10_03_120000` states the governing principle:

> "Flipping such a switch changed no request outcome while looking like it had, which is the worst
> failure mode for an access-control screen."

Four such switches survive it. An admin who unticks `requests.view` from all five seeded roles sees
zero behavioural change for any user. Not a vulnerability — the codes are the four benign ones — but
a credibility problem that undermines trust in the 17 switches that do work, and it is the direct
cause of two further findings: `GET /workflows` is readable by every employee because it is gated
`policies.view`, and the Approval Workflows nav item is visible to all.

**Fix:** render these as a locked "All employees (baseline)" row, or move the baseline into a
`self_service_permissions` table with per-code opt-out.

---

## 9. Audit trail coverage

`AuditService.php` (110 lines, read in full) records actor, action, entity type/id, a free-form
payload, optional reason, and a tamper-evident `sha256(prev_hash · payload · unix_ts)` chain with a
`verify()` walker.

**Recorded:** actor `YES` · action `YES` · entity `YES` · old/new values `PARTIAL` (a summary payload,
no diff) · reason `YES` (only ever passed at `LeaveRequestService.php:270`) · **IP address NO** ·
**request id NO** · method/route/user-agent `NO` · tamper evidence `YES` (with the caveats in P1-12).

**19 call sites.** State-changing operations with **no** audit record:

| # | Operation | File:line | Severity |
|---|---|---|---|
| A-01 | The entire case-handover state machine (`propose`, `accept`, `reject`, `complete`) — accepting **reassigns `owner_id` of a live prosecution case** | `CaseController.php:60,74,83,93` | **High** — the ledger is blind to the highest-consequence mutation in the system |
| A-02 | Delegation create / revoke — silently redirects approval authority | `DelegationController.php:45-54`, `:64` | **High** — combined with P1-5 this is the blind spot that would hide an authority-transfer attack |
| A-03 | Role permission-set rewrite — records only `name` and `description` | `RoleController.php:77-84` | **High** |
| A-04 | Role reassignment via `PATCH /org/employees/{id}` — records only `full_name` | `OrganizationController.php:195-197` | **High** — `admin.update` can add `FINAL_AUTHORITY` to anyone and the ledger will not show it |
| A-05 | Position default-role change — records only `title` | `OrganizationController.php:78-81`, `:93-95` | Medium |
| A-06 | Workflow step rewrite — records only `count($steps)` | `WorkflowController.php:61-65`, `:95-98` | Medium — cannot show who changed the chain from SUPERVISOR→HR to SUPERVISOR→FINAL_AUTHORITY |
| A-07 | Document upload — a medical or birth certificate written with no actor, type, or request id | `RequestController.php:150-159` | Medium — sensitive PII handling is unaudited |
| A-08 | Password change and `payroll_no`/`email` change | `AuthController.php:72-83` | Medium — account-takeover and payroll-fraud investigations have no evidence |
| A-09 | Logout / token deletion | `AuthController.php:90` | Low |

---

## 10. Delegation enforcement

- **Honoured in exactly one place:** `WorkflowResolver::resolveApprover()` (`:58-90`), reached only
  from `resolveWorkflow()` — i.e. **only at submit/resubmit time** to pick an approver. It is not
  consulted by `PermissionService`, any policy, `CheckPermission`, or `decide()`.
- **Permission substitution is not implemented.** A delegate receives a `workflow_assignments` row
  (`LeaveRequestService.php:122-129`), which `decide()` keys on, so delegation *does* substitute
  approval. But the delegate gains **no permission codes** (`codesFor()` reads only `employee_roles`)
  and **no scope** (`forUser()` reads only `employee_roles`). A delegate can therefore **decide** a
  request they cannot **view** via `GET /requests/{id}`, cannot see in `GET /requests?scope=all`, and
  holds no `requests.approve` code — the endpoint that let them act is invisible to every read
  surface and to the RBAC matrix.
- **Expiry is enforced at resolution time only** (`WorkflowResolver.php:67-68`). A request submitted
  before expiry and decided after expiry remains decidable, because `decide()` never re-checks the
  delegation and no `starts_at`/`ends_at` is recorded on `workflow_assignments`.
  `DelegationController::index()` (`:21-25`) returns all delegations **unfiltered by date**, so the
  UI lists expired ones as live.
- **A delegation can widen scope beyond the delegator's, three ways:**
  1. `WorkflowResolver.php:66` — degenerate equality when no standing holder exists (P1-5).
  2. `resolveApprover():73` does `Employee::find($active->delegate_employee_id)` with **no
     `is_active` filter and no role check**, unlike `standingHolder():151` which does check
     `is_active`. A delegation to a terminated or unqualified employee creates a live approval
     assignment. Because `StoreDelegationRequest.php:19` restricts `role_id` to the three
     supervisory roles but never checks the delegate is inside the delegator's zone, a Zonal Head of
     `z4` can route cross-zone approvals to a colleague in `z1`.
  3. `DelegationController::store:33-38` uses `Employee::roles()` (`Employee.php:49-53`), which does
     **not** filter `effective_from`/`effective_to` — so a role grant whose window has **closed** can
     still be delegated, unlike `activeAssignments()` which does filter. `end_date` is unbounded
     (`StoreDelegationRequest.php:21` only requires `>= start_date`), `start_date` may be in the past,
     duplicates are permitted, and the id scheme `'del'.(count()+1)` collides after any deletion.

---

## 11. Frontend findings

Pipeline: `/api/me` → `resolvedPerms` (`leave-context.tsx:620-625`) → `hasPerm()` (`:633-636`) →
loader gates (`:750,761,769,775,783,790,807,827`). Navigation is filtered in
`leave-sidebar.tsx:96-103`; `app/page.tsx:40-56` `ViewRenderer` applies **no** per-view check, so the
sidebar filter is the only client-side gate.

### High

| # | File:line | Finding |
|---|---|---|
| FE-1 | `leave-context.tsx:979-991` vs `:633-636` | **Two permission engines that disagree.** `can()` falls back to `SEED_ROLE_PERMISSIONS` whenever `user` is momentarily null or `permissions` is `[]` while a token exists — granting `admin.*`, `documents.view_medical_documents` and `reports.view_gender_reports` from a hardcoded matrix. Masked today only because `codesFor()` always merges `SELF_SERVICE` and login requires an employee record |
| FE-2 | `settings.tsx:763`, `:780-796`, `:896-897` | **The RBAC matrix is fully writable by an `admin.view`-only user.** No `canEdit` guard on the toggles or Save. Backend `routes/api.php:145` returns 403, so the user only sees a toast — but the UI claims capability it does not have |
| FE-3 | `leave-context.tsx:621` | No token ⇒ `resolvedPerms = '*'` ⇒ `hasPerm()` true for every code. SSR/first paint can show the full admin navigation |
| FE-4 | `AuthController.php:37`, `CheckPermission.php:30`, `OrganizationController.php:152-159` | Staff deactivation does not revoke an active session (backend P1-6) |

### Medium

| # | File:line | Finding |
|---|---|---|
| FE-5 | `policies.tsx:131`, `documents.tsx:55` | **Two dead gates hide legitimate features permanently.** `can('policies','create')` and `can('documents','delete')` reference codes absent from both the catalog and `routes/api.php`, so "New leave type" and "Delete document" can never appear — including for HR. This is the direct cost of the prune, and it contradicts the specification's "do not remove buttons" rule |
| FE-6 | `requests.tsx:290` "New request" | Ungated, while `requests.create` is a non-revocable baseline (§8) — correct outcome, wrong mechanism |
| FE-7 | `leave-context.tsx:1300-1310`, `:1354-1370`, `:1372-1377`, `:1614-1624`, `:1626-1635` | **Five actions report success but never persist**: `closeCase`, `addDocument`, `deleteDocument`, `addZone`/`removeZone`, `addDepartment`/`removeDepartment` — all local state only. `leave-api.ts:691-702` `attachDocument` is dead. No zone/department/delete-document routes exist. HR believes a case is closed or a medical document is secured when nothing was written |
| FE-8 | `settings.tsx:645`, `:713-725`, `:541`, `:599` | **Wrong-granularity admin gates.** Position create+edit+**delete** are all under `admin.create`; zone/department add+**delete** likewise. Backend requires `admin.update`/`admin.delete` → dead buttons for delete-only holders, visible-but-403 controls for create-only holders |
| FE-9 | `settings.tsx:247-256`, `:493` | Staff row menu (Edit profile incl. `role_ids` and password, Activate/Deactivate) is entirely ungated |
| FE-10 | `reports.tsx:37-45`, `:88-91`, `:132-134`, `:203`, `:224`, `:237`; `dashboard.tsx:285` | **Org-wide aggregates computed from static mock arrays** (`ZONES`, `EMPLOYEES` imported from `@/lib/leave`), then exported via an ungated "Export CSV". A zone-scoped supervisor sees and exports head-counts for every zone |
| FE-11 | `leave-context.tsx:1312-1317` | `markAllRead` takes the first 50 unread rows with no owner filter; the backend rejects each. Up to 50 × 403 toasts per click |
| FE-12 | `auth.tsx:64-75`; `leave-api.ts:564-593` | Any `/api/me` error (500, offline) hard-logs-out the user, and there is **no global 401 handler** — a mid-session token revocation leaves a stale UI |
| FE-13 | `leave-context.tsx:266-273` | 403, 500 and "no data" collapse into one toast; empty lists render as legitimately empty |

### Low / hygiene

- `delegations.tsx:27-32` `SCOPES = ['SUPERVISOR','DEPT_HEAD','ZONAL_HEAD','ALL']` — hardcoded role
  names, and `'ALL'` is not a role the backend knows.
- `delegations.tsx:34` `AUTHORITY_HOLDERS = ['e1','e3','e4','e5','e6']` — hardcoded employee ids.
- `workflows.tsx:20` roles from a static `roleLabels` map, diverging from `AuthController.php:114`.
- `calendar.tsx:31-32` `{y:2026,m:8}` cursor and September-specific day-count logic.
- `dashboard.tsx:57-64` `new Date('2026-09-09')`, `starred` leave types, `zoneId==='z4'` ternaries.
- `settings.tsx:128` `matrixRole = 'HR'` — the most-privileged role preselected on load.
- `supervisorMode` used as an authority proxy in three unrelated places: `approvals.tsx:79-82`,
  `audit.tsx:161`, `notifications.tsx:40`.
- `leave-context.tsx:155-178` `SEED_ROLE_PERMISSIONS` duplicates `DatabaseSeeder::seedPermissions()`
  and has drifted: it gives `FINAL_AUTHORITY` a narrow set while the backend returns `['*']`, and it
  omits `delegations`/`admin` for every non-HR role.
- `leave-context.tsx:138` `ROLE_PERMISSION_ACTIONS` still contains `update|delete|approve` even when
  the server catalog omits them.
- Token in `localStorage` (`auth.tsx:58,88`), exfiltratable via XSS; no CSP.
- `auth.tsx:122` can write `token: undefined` into storage from a stale closure after a cross-tab change.
- `leave-context.tsx:1072-1084` optimistic self-approval — step 1 is assigned to the requester, so the
  submitter momentarily sees themselves as approver.

---

## 12. Enforcement reality of the 21 codes

| Code | Backend enforcement point | Enforced? |
|---|---|---|
| `requests.view` | `routes/api.php:70` + `SELF_SERVICE` | Yes (non-revocable) |
| `requests.create` | `routes/api.php:71` + `SELF_SERVICE` | Yes (non-revocable) |
| `requests.approve` | `CaseHandoverPolicy.php:49` only — **absent from the decide route** | Partial |
| `requests.approve_zone` | none in `app/` | **Frontend-only** (nav `leave-sidebar.tsx:50-51`, `approvals.tsx`) |
| `requests.view_cross_zone` | `AccessScopeService` (REQUESTS) | Yes |
| `policies.view` | `routes/api.php:84` + `SELF_SERVICE` | Yes (non-revocable) |
| `policies.edit_policy` | `routes/api.php:87,88,138` | Yes |
| `documents.view` | `SELF_SERVICE` only; no consuming route | Yes (non-revocable) |
| `documents.create` | `routes/api.php:74` | Yes (UI is mock — FE-7) |
| `documents.view_medical_documents` | `LeaveDocumentPolicy.php:33` — policy never invoked | **NO** |
| `delegations.view` | `routes/api.php:93` | Yes |
| `delegations.create` | `routes/api.php:94` | Yes |
| `delegations.update` | `routes/api.php:95` | Yes |
| `reports.view` | `routes/api.php:125` | Yes |
| `reports.view_gender_reports` | `routes/api.php:129` | Yes |
| `reports.view_cross_zone` | `ReportService.php:25` | Yes |
| `staff.view_cross_zone` | `AccessScopeService` (STAFF) via `OrganizationController.php:130` | Yes |
| `admin.view` | `routes/api.php:119,142,143` | Yes |
| `admin.create` | `routes/api.php:39,45,53,144` | Yes |
| `admin.update` | `routes/api.php:40,43,44,46,54,145` | Yes |
| `admin.delete` | `routes/api.php:47,146` | Yes |

**Honest count: 18 enforced, 1 partial, 1 frontend-only, 1 not enforced.** Not 21.

---

## 13. Phase 2 dependencies

Ordered by what blocks what:

1. **Settle `documents.view_medical_documents` first** (P0-1). It decides whether a code ships as
   `implemented` or `planned`, and it is the first real test of the lifecycle model.
2. **Add the lifecycle schema before any new code.** `permissions.status`, `permissions.active`,
   `roles.active`, `employee_roles.active`. Without these, "planned must not be assignable" is
   unenforceable and `PermissionCatalogIntegrityTest` cannot validate the rules the specification
   requires of it.
3. **Remove the wildcard before adding `implemented` codes** (P1-1). The sentinel auto-grants any
   code added later, so every new `implemented` permission would be silently live for the DPP the
   moment it is inserted — reproducing the exact defect this audit is about.
4. **Fix the enforcement-reference test to require reachability** (§3) before trusting any
   `implemented` label.
5. **Sequence the P0 route/controller gaps** (P0-2, P0-3) ahead of the catalog work; they are
   independent of the lifecycle schema and are the highest-impact live exposures.
6. **Resolve the two dead frontend gates** (FE-5) in the same phase, because the specification
   forbids removing buttons while the prune already removed the codes that revealed them.

## 14. Write record and repository state

**New file (this report):** `frontend/dpp_analysis_audit.md`. No other file was created, modified,
or deleted in either repository. Three throwaway PHP scripts under `backend-leave/` were used to dump
the live schema and were deleted immediately after use; `Get-ChildItem -Filter "tmp_*" -Recurse`
returns empty, and `audit_correctness_probe.sql` does not exist.

**Frontend git status** is unchanged at the 7 intentional files from the Phase-0 work:
`components/leave/leave-context.tsx`, `components/leave/leave-sidebar.tsx`,
`components/leave/views/approvals.tsx`, `components/leave/views/reports.tsx`,
`components/leave/views/requests.tsx`, `components/leave/views/settings.tsx`, `lib/leave-api.ts`.

**The backend is not a git repository.** `git -C E:\Dev\Zee\backend-leave status` returns
`fatal: not a git repository`. There is therefore no version-control safety net for the Phase-2
schema work: a migration cannot be reverted with `git checkout`, and a destructive
`ON DELETE RESTRICT` conversion (P1-9) cannot be undone from source. **A `mysqldump` of
`dpp_leave` must be taken before the first Phase-2 migration is applied.**

Both servers remain running (Laravel `:8000`, Next `:3000`).

---

# Appendix A — Phase 2 remediation record

Written after §14. The audit above is preserved verbatim as the point-in-time record; this
appendix states what was actually changed to close each finding, and what remains open.

| | |
|---|---|
| Catalog now | **23 codes / 7 modules** (`policies.create` and `documents.delete` restored) |
| Test baseline now | **100 passed / 822 assertions** (was 95 / 616) |
| Backend VCS | still not a git repository — the `mysqldump` safety net remains the only rollback |
| Safety dump taken | `dpp_leave_pre_phase2_20261004_231031.sql` (248,722 bytes) before the first Phase-2 migration |

## A.1 Findings closed

| Finding | Resolution |
|---|---|
| §1.2 wildcard sentinel | Removed. `FINAL_AUTHORITY` and `BREAK_GLASS` carry an enumerated profile; `codesFor()` never returns `*`. |
| §1.1 `documents.view_medical_documents` unenforced | Closed in **two** passes, and the first pass did not count — see A.2.6. The policy is now invoked from list, show and download; the medical code decides per document type and owner, and type matching is case/punctuation-insensitive so it matches the display strings the upload UI actually writes. Covered by `AuthSmokeTest › gates medical documents on documents.view_medical_documents`, including a same-request non-sensitive control so a `403` cannot pass for the wrong reason. |
| P0-2 handover `propose` unauthorized | `CaseController::propose()` now calls `authorize('view', $leaveRequest)` and rejects callers with no employee record. It was the only handover action without an authorization check. Covered by `ZoneScopeTest`. |
| P0-3 `/api/eligibility` org-wide leak | `orgSummary()` now aggregates only the population `AccessScopeService` allows the caller to read, and returns `scoped: true` when it narrowed. Covered by `ZoneScopeTest`. |
| P0-4 `admin.create` → superuser | `is_final_authority` is immutable through the API; only `admin.create` + `admin.update` can reach it, and minting a final-authority role via `POST /api/roles` is rejected. |
| §8 self-service merge | The four codes moved out of `array_merge()` in `codesFor()` into a real `SELF_SERVICE` role (migration `2026_10_05_090000`), assigned to **every** active employee. Revoking the role now genuinely revokes the codes — asserted in `EffectiveGrantsTest`. |
| HQ `ZONAL_HEAD` skip | Removed, so every zone resolves the same chain. HQ annual leave is now `SUPERVISOR → ZONAL_HEAD → HR`. |
| Duplicate/orphaned routes | Collapsed. `route:list` shows one policy route and one audit pair. |
| `policies.create` unreachable | Catalogued, granted, and now gates `POST /api/policies`. Leave-type CRUD was always real at `/api/leave/types`; the route removed earlier was a duplicate placeholder. |
| Document bytes unreachable | Added `GET /requests/{id}/documents/{doc}/download`, streaming the file under the same two-part authorization as the metadata read. `deleteDocument` now deletes from the `local` disk explicitly instead of `config('filesystems.default')`, which targeted the wrong root whenever `FILESYSTEM_DISK` was overridden. |
| FE dead gates | Zones and departments have real `store/update/destroy` endpoints with `admin.create/update/delete` gates; the UI renders Edit and Delete on every row. |

## A.2 New defects found while fixing the above

These were not in the original audit.

1. **Approvers could skip a step.** `LeaveRequestService::decide()` matched the actor against
   *any* pending assignment, so with steps `[ZONAL_HEAD → e8, HR → e1]` the DPP could approve the
   HR step while the regional sign-off in front of it was still pending — silently skipping a
   reviewer. Now only the head of the chain is decidable, and an out-of-turn attempt is a 422.
2. **`restore_pruned_codes` never granted the two codes.** It added `policies.create` and
   `documents.delete` to the catalog but not to any role. Because the enumerate migration runs
   *before* it, every upgraded database — unlike a freshly seeded one — ended up with
   `FINAL_AUTHORITY`, `BREAK_GLASS` and `HR` short of the catalog. The migration now grants them,
   idempotently, and rollback detaches them.
3. **Seeded zones and departments could not be edited in the UI.** The merge was
   `[...ZONES, ...customZones]`, so renaming or deleting a *seeded* row changed the database and
   not the screen: the static constant was still in the spread and no state change could remove it.
   Now keyed overrides plus tombstone sets, derived centrally in the context.
4. **Login rejected usernames.** The form used `type="email"`, so the browser refused a username
   before the request was sent, even though `AuthController::login()` accepts either. Now
   `type="text"`, labelled as email *or* username.
5. **Break-glass test was self-defeating.** It took `abs()` of a signed `diffInDays` to avoid
   Carbon's sign convention, which also made an already-expired grant pass. Now asserts
   `effective_to` is non-null and in the future, and the magnitude separately.
6. **The medical-document gate was still dead after being "fixed" — a second, subtler instance of
   the very finding it was meant to close.** Wiring `LeaveDocumentPolicy` into list/show/download
   changed nothing in practice: `SENSITIVE_TYPES` held snake_case codes (`medical_cert`,
   `birth_doc`, `antenatal_record`) while every real row stores the display string the upload UI
   sends (`Medical certificate`, `Antenatal record`, `Birth certificate`). `in_array(..., true)`
   matched **0 of 6** seeded documents, so `documents.view_medical_documents` remained
   assignment-only and every medical certificate was served to anyone who could see the request.
   Matching is now case- and punctuation-insensitive, and the regression test was verified to
   fail (`expected 403, received 200`) when the old constant is restored.

   Worth recording as a process note: the first version of the fix itself had the same class of
   bug. `preg_replace('/[^a-z0-9]+/', ...)` — dropping the `i` modifier — *strips* uppercase
   letters, silently turning `Medical certificate` into `edicalcertificate`. Both the original
   defect and the broken fix were invisible to a passing suite, because no test exercised the
   gate against a real row. Normalisation needs its own assertion; "the policy is now called" is
   a statement about the call, not about the outcome.

## A.3 Still open

| Item | Status |
|---|---|
| §6.2 permission lifecycle schema | **Not started.** No `permissions.status`/`active`, `roles.active`, `employee_roles.active`, `modules` table, or `enforcement_reference`. Deliberately deferred: the self-service decision took the real-role route (§8 closed above) instead of the lifecycle route, so nothing currently depends on it. This is the largest remaining structural gap. |
| System-role deletion | `RoleController` still refuses to delete a system role or one a workflow still requires. The UI renders the button and the server refuses with a reason. If every role must be removable, this needs archive/deactivate semantics rather than delete. |
| §9 audit-trail coverage, §10 delegation enforcement | Not addressed in this phase. (No `FR-6`/`p1.5`/`FR-10`/`p1.7` items exist in `dpp_analysis.md`; an earlier draft of this appendix cited them in error and the reference has been removed rather than left dangling.) |
| Browser verification | Zones, departments, roles, login and document UI were verified through the API and the build only; no end-to-end browser pass was run. |
| Frontend unit tests | No runner configured; all frontend verification is `tsc --noEmit` + `npm run build`. |

## A.4 QA account

A full-access account was created through `POST /api/org/employees` so the grant is written by the
application and lands in the audit ledger, rather than inserted straight into `employee_roles`:

- username `zahra`, password `QaAccess2026!`, employee `e13`, email `zahra.mwakalinga@dpp.go.tz`
- roles `FINAL_AUTHORITY`, `SELF_SERVICE`; holds all **23** codes

This exists to test the user's central claim: that unchecking a permission in the matrix actually
removes it. With it, change any cell in the RBAC matrix, save, and re-read `GET /api/me` — the code
should disappear from this account too, because nothing bypasses the matrix any more.