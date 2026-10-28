You are a senior Laravel and TypeScript engineer.

I need you to implement a complete “Download Configuration” feature for my DPP Zanzibar Leave Management System.

IMPORTANT:
Do not remove, rename, hide, simplify, or replace any existing module, button, permission, role, endpoint, page, or administrative feature.

The existing application contains these modules:

1. Dashboard
2. My Leave
3. Leave Requests
4. Leave Calendar
5. Leave Policies
6. Approval Workflows
7. Documents
8. Case Handovers
9. Notifications
10. Audit Trail
11. Admin & Organisation

The Admin & Organisation module contains:

1. Staff
2. Zones
3. Departments
4. Positions
5. Roles
6. Permissions
7. Role Assignments
8. Delegations
9. Access Scopes
10. Regional Data Separation

The current role and permission system is dynamic, but permissions are not reliably enforced for logged-in users. Some administrative buttons have disappeared, and the permission list is smaller than the actual application features.

Your task is to investigate the root cause first, then implement the complete solution.

==================================================
PART 1: ROOT-CAUSE AUDIT
==================================================

Before changing code, inspect the entire repository.

Trace the complete authorization chain:

User
→ Employee
→ EmployeeRole
→ Role
→ RolePermission
→ Permission
→ Effective Permissions
→ Authenticated User Capability Response
→ Frontend Permission Check
→ Route Middleware
→ Controller Authorization
→ Service Authorization
→ Database Scope

Find exactly where the chain breaks.

Check all of the following:

- User-to-employee relationship.
- Employee-to-role assignments.
- Active role dates.
- Role-to-permission relationships.
- Permission code mismatches.
- Duplicate permission codes.
- Incorrect module names.
- Missing permissions.
- Stale cached permissions.
- Old JWT/session claims.
- Missing route middleware.
- Missing controller authorization.
- Missing Laravel policies.
- Frontend permission checks.
- Hard-coded modules.
- Hard-coded counters.
- Removed or hidden buttons.
- Zone and department scope enforcement.
- Wildcard permissions such as `*`.
- Administrator bypasses.
- API responses used by the frontend.

Do not guess. Produce a root-cause report with:

- File name.
- Line number.
- Current behavior.
- Expected behavior.
- Security impact.
- Recommended fix.

Do not make destructive changes before completing this audit.

==================================================
PART 2: PRESERVE ALL EXISTING FEATURES
==================================================

Restore and preserve all existing pages, buttons, and actions.

The following actions must be available when the logged-in user has the appropriate permission:

Staff:
- View staff.
- Create staff.
- View staff details.
- Update staff.
- Delete or deactivate staff.
- Restore staff where soft deletion is used.
- Assign roles.
- Revoke roles.
- Configure zone scope.
- Configure department scope.

Zones:
- View zones.
- Create zone.
- Update zone.
- Delete or deactivate zone.
- Assign departments to zones.

Departments:
- View departments.
- Create department.
- Update department.
- Delete or deactivate department.
- Assign department heads.

Positions:
- View positions.
- Create position.
- Update position.
- Delete or deactivate position.

Roles:
- View roles.
- Create role.
- Update role.
- Delete or deactivate role.
- Assign permissions.
- Remove permissions.
- Configure role scope.

Permissions:
- View permissions.
- Create permission.
- Update permission.
- Delete or deactivate permission.
- Group permissions by module.
- Assign permissions to roles.

Delegations:
- View delegations.
- Create delegation.
- Update delegation.
- Cancel delegation.
- Expire delegation automatically.
- View delegation audit history.

Do not replace real dynamic data with static frontend arrays.

==================================================
PART 3: COMPLETE MODULE CATALOG
==================================================

Create or restore a complete dynamic module catalog:

- Dashboard.
- My Leave.
- Leave Requests.
- Leave Calendar.
- Leave Policies.
- Approval Workflows.
- Documents.
- Case Handovers.
- Notifications.
- Audit Trail.
- Admin & Organisation.

Every module must have:

- Code.
- Name.
- Description.
- Parent module where applicable.
- Route.
- Display order.
- Icon key if used by the frontend.
- Active/inactive status.

The frontend must load modules from the backend or a shared permission configuration.

Do not hard-code the module list in multiple frontend files.

==================================================
PART 4: COMPLETE PERMISSION CATALOG
==================================================

Create canonical permission codes.

Dashboard:
- dashboard.view
- dashboard.view_personal
- dashboard.view_zone
- dashboard.view_organisation

My Leave:
- leave.own.view
- leave.own.create
- leave.own.update
- leave.own.cancel
- leave.own.history.view
- leave.own.documents.create

Leave Requests:
- requests.view_own
- requests.view
- requests.view_zone
- requests.view_cross_zone
- requests.create
- requests.update
- requests.submit
- requests.cancel
- requests.approve
- requests.reject
- requests.return
- requests.delegate

Leave Calendar:
- calendar.view_own
- calendar.view_department
- calendar.view_zone
- calendar.view_organisation
- calendar.manage

Leave Policies:
- policies.view
- policies.create
- policies.update
- policies.delete
- policies.activate
- policies.archive

Approval Workflows:
- workflows.view
- workflows.create
- workflows.update
- workflows.delete
- workflows.activate
- workflows.test

Documents:
- documents.view_own
- documents.view
- documents.create
- documents.download
- documents.delete
- documents.view_sensitive

Case Handovers:
- handovers.view_own
- handovers.view
- handovers.create
- handovers.accept
- handovers.reject
- handovers.complete
- handovers.reassign

Notifications:
- notifications.view_own
- notifications.view_all
- notifications.send
- notifications.manage_templates

Audit Trail:
- audit.view_own
- audit.view
- audit.export
- audit.manage_retention

Staff:
- staff.view_own
- staff.view
- staff.create
- staff.update
- staff.delete
- staff.view_cross_zone

Zones:
- zones.view
- zones.create
- zones.update
- zones.delete

Departments:
- departments.view
- departments.create
- departments.update
- departments.delete

Positions:
- positions.view
- positions.create
- positions.update
- positions.delete

Roles:
- roles.view
- roles.create
- roles.update
- roles.delete

Permissions:
- permissions.view
- permissions.create
- permissions.update
- permissions.delete
- permissions.assign

Role Assignments:
- role_assignments.view
- role_assignments.create
- role_assignments.update
- role_assignments.revoke

Delegations:
- delegations.view
- delegations.create
- delegations.update
- delegations.cancel

Reports:
- reports.view
- reports.view_zone
- reports.view_organisation
- reports.export

Do not use wildcard permissions such as `*` for ordinary roles. Future permissions must not automatically become available to existing users.

==================================================
PART 5: DATA MODEL
==================================================

Use dynamic database-backed configuration.

Required entities:

modules:
- id
- code
- name
- description
- parent_id
- route
- display_order
- active
- created_at
- updated_at

permissions:
- id
- module_id
- code
- action
- name
- description
- sensitivity
- active
- created_at
- updated_at

roles:
- id
- code
- name
- description
- system_role
- active
- created_at
- updated_at

role_permissions:
- role_id
- permission_id

employee_roles:
- employee_id
- role_id
- scope_zone_id
- department_id
- effective_from
- effective_to
- active
- assigned_by
- created_at
- updated_at

Add proper foreign keys, indexes, unique constraints, and soft deletion where appropriate.

Do not delete existing records during migration.

==================================================
PART 6: EFFECTIVE PERMISSIONS
==================================================

Implement one authoritative service:

```php
EffectivePermissionService
```

It must calculate permissions for the authenticated user based on:

- Active employee record.
- Active role assignments.
- Effective dates.
- Role permissions.
- Zone scope.
- Department scope.
- Delegated permissions.
- Explicit cross-zone permissions.

Do not return only permission strings. Return permission grants with scope:

```json
[
  {
    "code": "requests.view",
    "zone_ids":,[1]
    "department_ids": [],
    "source_role": "ZONAL_HEAD"
  }
]
```

Separate:

```php
can($user, 'requests.view')
```

from:

```php
canAccessLeaveRequest($user, $leaveRequest)
```

The first checks whether the user has the capability.

The second checks whether the user is allowed to access that particular record.

==================================================
PART 7: BACKEND ENFORCEMENT
==================================================

Enforce authorization on the backend.

Do not rely on frontend buttons or frontend filtering.

Use:

- Route middleware for broad permissions.
- Laravel policies for model-level authorization.
- Service-level checks for business rules.
- Query scopes for zone and department filtering.
- Deny-by-default behavior.

Create policies for:

- EmployeePolicy.
- LeaveRequestPolicy.
- LeaveDocumentPolicy.
- CaseHandoverPolicy.
- ZonePolicy.
- DepartmentPolicy.
- PositionPolicy.
- RolePolicy.
- PermissionPolicy.
- ReportPolicy.
- DelegationPolicy.

Authorization must happen before any state-changing operation.

For every update, delete, approve, reject, upload, download, accept, complete, or export action:

1. Authenticate the user.
2. Check the required permission.
3. Check record ownership or organisational scope.
4. Check workflow state.
5. Validate business rules.
6. Only then perform the mutation.

==================================================
PART 8: ZONE AND DEPARTMENT DATA SEPARATION
==================================================

Implement:

```text
Regional users:
- Access their own zone only.

Department heads:
- Access their assigned department, subject to policy.

Central HR:
- Access organisation-wide data only with explicit permission.

Final authority:
- Receive only explicitly assigned organisation-wide permissions.

Ordinary employees:
- Access their own records only.
```

Apply scope to:

- Staff lists.
- Leave requests.
- Leave-request details.
- Approvals.
- Documents.
- Case handovers.
- Reports.
- Dashboard aggregates.
- Exports.
- Search endpoints.
- Bulk operations.

Never trust:

- `scope=all`.
- A frontend dropdown.
- A frontend zone filter.
- `is_hq`.
- A role name alone.
- A user-supplied employee ID.

==================================================
PART 9: AUTHENTICATED USER CAPABILITIES
==================================================

Create or update:

```http
GET /api/auth/me/capabilities
```

Return:

```json
{
  "user": {},
  "roles": [],
  "permissions": [],
  "grants": [],
  "zones": [],
  "departments": [],
  "features": {},
  "authorization_version": 1
}
```

Example:

```json
{
  "features": {
    "staff": {
      "view": true,
      "create": true,
      "update": true,
      "delete": false
    },
    "requests": {
      "view": true,
      "approve": true,
      "view_cross_zone": false
    }
  }
}
```

The frontend must use this response for navigation and button visibility.

After a role or permission change:

- Increment authorization version.
- Clear affected caches.
- Invalidate or refresh stale tokens.
- Force the next request to reload effective permissions.

==================================================
PART 10: RESTORE FRONTEND FEATURES
==================================================

Do not remove buttons because permissions are incomplete.

Restore all buttons based on canonical capabilities:

- Create staff.
- Edit staff.
- Delete/deactivate staff.
- Create zone.
- Edit zone.
- Delete zone.
- Create department.
- Edit department.
- Delete department.
- Create position.
- Edit position.
- Delete position.
- Create role.
- Edit role.
- Delete role.
- Assign permissions.
- Assign roles.
- Create delegation.
- Cancel delegation.

If a button is hidden, identify exactly which permission hides it.

Remove:

- Static module arrays.
- Static counts.
- Hard-coded role assumptions.
- Frontend-only security.
- Dead `supervisorMode` logic.
- Duplicate permission mappings.

==================================================
PART 11: ADMIN CONFIGURATION
==================================================

Admin users must be able to configure dynamically:

- Modules.
- Permissions.
- Roles.
- Role permissions.
- Staff assignments.
- Zone scopes.
- Department scopes.
- Delegations.
- Effective dates.
- Activation status.
- Workflow permissions.

Every administrative change must create an audit record:

- Actor.
- Action.
- Entity.
- Entity ID.
- Old values.
- New values.
- Reason.
- Timestamp.
- IP address.
- Request ID.

Do not allow ordinary admins to edit or delete the highest-level security administrator without a protected process.

==================================================
PART 12: TESTS
==================================================

Add backend tests for:

1. User with `staff.create` sees the Create Staff button and can call the endpoint.
2. User without `staff.create` cannot call the endpoint even if the frontend request is manually sent.
3. Pemba Zonal Head sees only Pemba staff.
4. Pemba Zonal Head sees only Pemba leave requests.
5. Pemba Zonal Head cannot access an Unguja employee by direct ID.
6. Central HR with explicit cross-zone permission can access approved cross-zone data.
7. Department Head cannot access another department.
8. Removed permissions take effect after re-login or authorization refresh.
9. Newly granted permissions become effective after cache invalidation.
10. Expired roles no longer grant permission.
11. Delegation works only during its valid period.
12. Wildcard permissions are not granted to ordinary roles.
13. Reports are scope-filtered.
14. Exports are scope-filtered.
15. Documents enforce ownership and sensitivity rules.
16. Unauthorized mutations do not change database state.

Add frontend tests for:

- Navigation visibility.
- Button visibility.
- Capability refresh.
- Empty capability handling.
- Permission-denied UI.
- Admin module loading.
- Dynamic counters.

==================================================
PART 13: VALIDATION AND REPORTING
==================================================

After implementation, run:

```bash
php artisan migrate
php artisan db:seed
php artisan route:list
php artisan test
php artisan permission:sync
php artisan permission:verify
npm run typecheck
npm run lint
npm run build
```

If commands do not exist, create safe Artisan commands:

```bash
php artisan permissions:sync
php artisan permissions:verify
php artisan permissions:debug {userId}
```

The verification command must report:

- Missing permissions.
- Duplicate permission codes.
- Roles with missing permissions.
- Invalid role assignments.
- Expired assignments.
- Orphaned permissions.
- Missing module relationships.
- Scope conflicts.
- Frontend/backend permission mismatches.

==================================================
FINAL REQUIREMENTS
==================================================

Do not delete or simplify existing features.

Do not replace dynamic database data with static data.

Do not treat frontend filtering as authorization.

Do not use wildcard permissions for ordinary roles.

Do not assume that a role name automatically grants access.

Do not make cross-zone access implicit.

Do not modify unrelated business logic.

Before completing the task, provide:

1. Root-cause report.
2. List of files changed.
3. Database migration summary.
4. Complete module-permission matrix.
5. Role-permission matrix.
6. Zone/department scope rules.
7. API authorization summary.
8. Frontend capability summary.
9. Test results.
10. Remaining risks and manual configuration required.

If anything is uncertain, document the assumption and do not silently remove existing functionality.