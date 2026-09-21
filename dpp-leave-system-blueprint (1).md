# DPP Zanzibar Leave Management System — Technical Blueprint
## Data Model, Workflow Resolution Logic, and Case Handover Module

---

## Part 1: Data Model / Schema (PostgreSQL)

### 1.1 Identity & Org Structure

```sql
CREATE TABLE zones (
    zone_id         SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,        -- e.g. 'Unguja North', 'Pemba'
    is_pemba_zone   BOOLEAN DEFAULT FALSE,
    parent_zone_id  INT REFERENCES zones(zone_id)  -- for regional hierarchy if needed
);

CREATE TABLE departments (
    department_id   SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,          -- e.g. 'Prosecutions', 'Records & Archives', 'ICT'
    zone_id         INT REFERENCES zones(zone_id)   -- NULL if department is HQ-only
);

CREATE TABLE positions (
    position_id     SERIAL PRIMARY KEY,
    title           VARCHAR(150) NOT NULL,          -- e.g. 'Senior State Attorney', 'Zonal Head'
    department_id   INT REFERENCES departments(department_id),
    zone_id         INT REFERENCES zones(zone_id),
    approval_tier   INT,                            -- numeric rank used by workflow resolver (see Part 2)
    is_final_authority BOOLEAN DEFAULT FALSE
);

CREATE TABLE users (
    user_id         SERIAL PRIMARY KEY,
    username        VARCHAR(100) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE employees (
    employee_id     SERIAL PRIMARY KEY,
    user_id         INT REFERENCES users(user_id),
    full_name       VARCHAR(200) NOT NULL,
    position_id     INT REFERENCES positions(position_id),
    zone_id         INT REFERENCES zones(zone_id),
    hire_date       DATE NOT NULL,
    gender          VARCHAR(20),                    -- for gender-disaggregated reporting only
    is_active       BOOLEAN DEFAULT TRUE
);

-- Reporting line is separate from position hierarchy because acting/delegated
-- relationships need to override it without altering the permanent org chart.
CREATE TABLE reporting_lines (
    reporting_line_id SERIAL PRIMARY KEY,
    employee_id     INT REFERENCES employees(employee_id),
    supervisor_employee_id INT REFERENCES employees(employee_id),
    relationship_type VARCHAR(30) DEFAULT 'primary', -- 'primary', 'acting', 'dotted_line'
    effective_from  DATE NOT NULL,
    effective_to    DATE                             -- NULL = still active
);

CREATE TABLE roles (
    role_id         SERIAL PRIMARY KEY,
    name            VARCHAR(100) UNIQUE NOT NULL     -- e.g. 'HR_OFFICER', 'ZONAL_HEAD', 'FINAL_AUTHORITY'
);

CREATE TABLE permissions (
    permission_id   SERIAL PRIMARY KEY,
    code            VARCHAR(100) UNIQUE NOT NULL     -- e.g. 'VIEW_MEDICAL_DOCS', 'APPROVE_LEAVE_ZONE'
);

CREATE TABLE role_permissions (
    role_id         INT REFERENCES roles(role_id),
    permission_id   INT REFERENCES permissions(permission_id),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE employee_roles (
    employee_id     INT REFERENCES employees(employee_id),
    role_id         INT REFERENCES roles(role_id),
    scope_zone_id   INT REFERENCES zones(zone_id),   -- NULL = organization-wide scope
    PRIMARY KEY (employee_id, role_id, scope_zone_id)
);
```

### 1.2 Leave Policy Engine (versioned — this is the fix for the gap flagged earlier)

```sql
CREATE TABLE leave_types (
    leave_type_id   SERIAL PRIMARY KEY,
    code            VARCHAR(30) UNIQUE NOT NULL,     -- 'ANNUAL', 'SICK', 'MATERNITY', etc.
    name            VARCHAR(100) NOT NULL,
    is_paid_default BOOLEAN DEFAULT TRUE
);

-- Versioned policy: never edit a row in place, insert a new version instead.
CREATE TABLE leave_policies (
    policy_id           SERIAL PRIMARY KEY,
    leave_type_id       INT REFERENCES leave_types(leave_type_id),
    version             INT NOT NULL,
    max_days_per_year   NUMERIC(5,1),
    min_tenure_months   INT DEFAULT 0,
    requires_documents  BOOLEAN DEFAULT FALSE,
    min_notice_days     INT DEFAULT 0,
    carry_over_max_days NUMERIC(5,1) DEFAULT 0,
    carry_over_expiry_month INT,                     -- e.g. 3 = expires end of March next year
    allow_half_day      BOOLEAN DEFAULT FALSE,
    effective_from      DATE NOT NULL,
    effective_to        DATE,                        -- NULL = current version
    created_by          INT REFERENCES users(user_id),
    approved_by         INT REFERENCES users(user_id), -- policy changes require sign-off too
    UNIQUE (leave_type_id, version)
);

CREATE TABLE leave_balances (
    balance_id      SERIAL PRIMARY KEY,
    employee_id     INT REFERENCES employees(employee_id),
    leave_type_id   INT REFERENCES leave_types(leave_type_id),
    year            INT NOT NULL,
    accrued_days    NUMERIC(5,1) NOT NULL,
    carried_over_days NUMERIC(5,1) DEFAULT 0,
    used_days       NUMERIC(5,1) DEFAULT 0,
    expiry_date     DATE,                            -- for carried-over portion
    UNIQUE (employee_id, leave_type_id, year)
);
```

### 1.3 Requests & Workflow

```sql
CREATE TABLE leave_requests (
    request_id      SERIAL PRIMARY KEY,
    employee_id     INT REFERENCES employees(employee_id),
    leave_type_id   INT REFERENCES leave_types(leave_type_id),
    policy_id       INT REFERENCES leave_policies(policy_id), -- pin the policy version at submit time
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_half_day     BOOLEAN DEFAULT FALSE,
    reason          TEXT,
    status          VARCHAR(30) DEFAULT 'draft',
        -- 'draft','submitted','under_review','returned_for_correction',
        -- 'approved','rejected','withdrawn','paused_pending_handover'
    is_emergency_exception BOOLEAN DEFAULT FALSE,
    exception_reason TEXT,
    submitted_at    TIMESTAMPTZ,
    decided_at      TIMESTAMPTZ
);

CREATE TABLE leave_request_dates (
    request_id      INT REFERENCES leave_requests(request_id),
    the_date        DATE NOT NULL,
    day_fraction    NUMERIC(3,2) DEFAULT 1.0,          -- 0.5 for half-day
    PRIMARY KEY (request_id, the_date)
);

CREATE TABLE leave_documents (
    document_id     SERIAL PRIMARY KEY,
    request_id      INT REFERENCES leave_requests(request_id),
    file_ref        TEXT NOT NULL,                     -- encrypted storage pointer, not raw path
    document_type   VARCHAR(50),                       -- 'medical_cert','study_admission','birth_doc'
    uploaded_by     INT REFERENCES users(user_id),
    uploaded_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workflow_definitions (
    workflow_def_id SERIAL PRIMARY KEY,
    leave_type_id   INT REFERENCES leave_types(leave_type_id),
    version         INT NOT NULL,
    min_duration_days INT DEFAULT 0,                   -- rule applies above this threshold
    zone_id         INT REFERENCES zones(zone_id),      -- NULL = applies to all zones
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    created_by      INT REFERENCES users(user_id),
    approved_by     INT REFERENCES users(user_id)       -- workflow changes are versioned + signed off too
);

CREATE TABLE workflow_steps (
    step_id         SERIAL PRIMARY KEY,
    workflow_def_id INT REFERENCES workflow_definitions(workflow_def_id),
    step_order      INT NOT NULL,
    role_required   INT REFERENCES roles(role_id),      -- resolved to a person at runtime
    sla_days        INT DEFAULT 3,                       -- per-step escalation SLA
    is_mandatory    BOOLEAN DEFAULT TRUE
);

CREATE TABLE workflow_assignments (
    assignment_id   SERIAL PRIMARY KEY,
    request_id      INT REFERENCES leave_requests(request_id),
    step_id         INT REFERENCES workflow_steps(step_id),
    assigned_employee_id INT REFERENCES employees(employee_id), -- resolved person, snapshotted
    assigned_role_id INT REFERENCES roles(role_id),      -- role_at_time, for audit even if role reassigned later
    status          VARCHAR(20) DEFAULT 'pending',        -- 'pending','done','escalated','skipped'
    due_at          TIMESTAMPTZ
);

CREATE TABLE approval_actions (
    action_id       SERIAL PRIMARY KEY,
    assignment_id   INT REFERENCES workflow_assignments(assignment_id),
    actor_employee_id INT REFERENCES employees(employee_id),
    decision        VARCHAR(20) NOT NULL,                 -- 'approved','rejected','returned'
    comments        TEXT,
    acted_at        TIMESTAMPTZ DEFAULT now(),
    workflow_rule_used INT REFERENCES workflow_steps(step_id)
);

CREATE TABLE delegations (
    delegation_id   SERIAL PRIMARY KEY,
    delegator_employee_id INT REFERENCES employees(employee_id),
    delegate_employee_id INT REFERENCES employees(employee_id),
    role_id         INT REFERENCES roles(role_id),        -- scope of delegated authority
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    authorized_by   INT REFERENCES employees(employee_id)
);
```

### 1.4 Case Handover (new table — not in either source document's table list)

```sql
CREATE TABLE cases (
    case_id         SERIAL PRIMARY KEY,
    case_reference  VARCHAR(100) UNIQUE NOT NULL,
    assigned_prosecutor_id INT REFERENCES employees(employee_id),
    next_hearing_date DATE,                              -- powers the court-calendar-awareness feature
    status          VARCHAR(30) DEFAULT 'active'
);

CREATE TABLE case_handovers (
    handover_id     SERIAL PRIMARY KEY,
    request_id      INT REFERENCES leave_requests(request_id),
    case_id         INT REFERENCES cases(case_id),
    from_employee_id INT REFERENCES employees(employee_id),
    to_employee_id  INT REFERENCES employees(employee_id),
    status          VARCHAR(30) DEFAULT 'proposed',
        -- 'proposed','accepted','rejected','reassigned','completed'
    proposed_at     TIMESTAMPTZ DEFAULT now(),
    responded_at    TIMESTAMPTZ,
    reviewed_by     INT REFERENCES employees(employee_id), -- supervisor/zonal head sign-off
    reviewed_at     TIMESTAMPTZ,
    notes           TEXT
);
```

### 1.5 Audit (tamper-evident, hash-chained)

```sql
CREATE TABLE audit_logs (
    audit_id        BIGSERIAL PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL,                 -- 'leave_request','policy','handover', etc.
    entity_id       INT NOT NULL,
    action          VARCHAR(30) NOT NULL,                 -- 'create','update','decision','correction'
    actor_user_id   INT REFERENCES users(user_id),
    payload         JSONB NOT NULL,                        -- full snapshot of the change
    reason          TEXT,                                  -- required for any correction
    prev_hash       CHAR(64),
    row_hash        CHAR(64) NOT NULL,                      -- sha256(prev_hash || payload || timestamp)
    created_at      TIMESTAMPTZ DEFAULT now()
);
```
`row_hash` is computed as each row is written (application layer, not trigger, so you can unit test it) and always includes the previous row's hash. Any retroactive tampering breaks the chain and is detectable by walking it forward.

---

## Part 2: Workflow Resolution Logic

The core idea: **the workflow is computed at submission time**, using the employee's zone/department/position and the leave request's type/duration — it is not a fixed sequence in code.

### 2.1 Resolution algorithm (pseudocode)

```
function resolveWorkflow(employee, leaveRequest):
    duration = leaveRequest.end_date - leaveRequest.start_date + 1

    # 1. Find the applicable workflow_definition
    candidates = SELECT * FROM workflow_definitions
                 WHERE leave_type_id = leaveRequest.leave_type_id
                   AND (zone_id IS NULL OR zone_id = employee.zone_id)
                   AND min_duration_days <= duration
                   AND effective_from <= today AND (effective_to IS NULL OR effective_to > today)
                 ORDER BY zone_id NULLS LAST, min_duration_days DESC
                 LIMIT 1
    # zone-specific rule wins over a general rule; longer-duration rule wins over a shorter threshold

    workflowDef = candidates[0]
    steps = SELECT * FROM workflow_steps
            WHERE workflow_def_id = workflowDef.id
            ORDER BY step_order

    assignments = []
    for step in steps:
        person = resolveApprover(employee, step.role_required)
        assignments.append({
            step_id: step.id,
            assigned_employee_id: person.employee_id,
            assigned_role_id: step.role_required,
            due_at: now() + step.sla_days
        })
    return assignments


function resolveApprover(employee, role_id):
    # 1. Check active delegation first — delegated authority overrides standing reporting line
    delegation = SELECT * FROM delegations
                 WHERE role_id = role_id
                   AND start_date <= today AND end_date >= today
                   AND delegator_employee_id = standingHolderOf(role_id, employee)
    if delegation exists:
        return delegation.delegate_employee_id

    # 2. Otherwise resolve via reporting_lines / employee_roles scoped to employee's zone/department
    holder = SELECT employee_id FROM employee_roles
             WHERE role_id = role_id
               AND (scope_zone_id IS NULL OR scope_zone_id = employee.zone_id)
             LIMIT 1
    return holder
```

### 2.2 Key design decisions this encodes

- **Zone-specific workflow beats generic workflow.** A Pemba-specific rule for study leave, if defined, overrides the org-wide default — this is how "Pemba coordination office follows a different path" gets implemented without special-casing it in application code.
- **Delegation is resolved before the standing reporting line**, every time a step is assigned — not just at submission, but re-checked if a step is reassigned after escalation, so an approver going on leave themselves doesn't stall the chain.
- **`role_at_time` is snapshotted onto `workflow_assignments` and `approval_actions`.** If the zonal head role is reassigned to someone else next month, last month's approvals still show who actually held the role when they acted — critical for audit defensibility in a legal institution.
- **Policy and workflow versions are pinned onto the request at submission** (`leave_requests.policy_id`, and workflow resolution reads `effective_from/to` at submission time). A later policy change never silently rewrites the rules a pending request is being judged against.

### 2.3 Escalation

A background job runs daily:
```
SELECT * FROM workflow_assignments
WHERE status = 'pending' AND due_at < now()
```
For each match: notify the assigned approver, and if `escalation_after_sla = true` on the step config, create a new assignment at the next step's role (or a designated "next authority" role) while keeping the original assignment's status as `escalated` — never deleted, per the audit-trail requirement.

---

## Part 3: Case Handover Module

### 3.1 Why it gates approval, not just informs it

Handover isn't a checklist item — it's a **hard blocker** on final approval. The logic:

```
function canFinalApprove(leaveRequest):
    openCases = SELECT * FROM cases WHERE assigned_prosecutor_id = leaveRequest.employee_id
                AND status = 'active'

    if openCases is empty:
        return true   # nothing to hand over

    for case in openCases:
        handover = SELECT * FROM case_handovers
                   WHERE request_id = leaveRequest.id AND case_id = case.id
        if handover is NULL OR handover.status != 'accepted':
            return false   # block final approval

    return true
```

This function is called at the **final workflow step only** — earlier steps (supervisor recommendation, department review) can still proceed in parallel with handover negotiation, so the process isn't artificially slowed down. Only the last gate checks handover completeness.

### 3.2 Handover state machine

```
proposed → accepted → completed
proposed → rejected → (back to prosecutor/supervisor to propose a new receiving prosecutor)
```

**The rejection path** (flagged earlier as missing from both source documents) — this is the fix:

```
function onHandoverRejected(handover):
    handover.status = 'rejected'
    leaveRequest.status = 'paused_pending_handover'
    notify(handover.from_employee_id, handover.reviewed_by,
           "Handover for case {case_id} was declined by {to_employee}. Propose a new recipient.")
    # request does NOT get rejected outright — it's paused, preserving the
    # requester's place in the approval chain for the steps already completed
```

The request re-enters `under_review` only once a new handover proposal reaches `accepted`. This avoids forcing the employee to resubmit the whole leave request (losing already-completed supervisor/department approvals) just because one case handover fell through.

### 3.3 Supervisor/zonal review of capacity

Before a handover can move from `accepted` to `completed`, a supervisor or zonal head must confirm the receiving prosecutor actually has capacity — this is a distinct approval action, logged like any other:

```
function reviewHandoverCapacity(handover, reviewer):
    # reviewer checks: does to_employee already have too many active cases / their own pending leave?
    activeCaseCount = COUNT(*) FROM cases WHERE assigned_prosecutor_id = handover.to_employee_id AND status='active'
    # this is advisory data shown to the reviewer — the system does not auto-block on a case count
    # threshold, consistent with "no AI/system auto-decision" principle
    record approval_action-equivalent entry, then:
    handover.status = 'completed'
    handover.reviewed_by = reviewer.id
    handover.reviewed_at = now()
```

### 3.4 Extension point: court-calendar awareness

Since `cases.next_hearing_date` is already in the schema, the natural next feature (suggested earlier) is trivial to bolt on:

```
function flagHearingConflict(leaveRequest):
    conflicts = SELECT * FROM cases
                WHERE assigned_prosecutor_id = leaveRequest.employee_id
                  AND next_hearing_date BETWEEN leaveRequest.start_date AND leaveRequest.end_date
    if conflicts not empty:
        flag_for_reviewer("Requested leave overlaps a scheduled hearing on {date} for case {ref}")
```
This is advisory only (per the rule-based-recommendation principle) — it surfaces the conflict to the department head/zonal reviewer rather than blocking the request automatically, since a hearing can sometimes be rescheduled or reassigned instead.

---

## Part 4: Notifications & Reporting

### 4.1 Schema

```sql
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    recipient_employee_id INT REFERENCES employees(employee_id),
    channel         VARCHAR(20) NOT NULL,            -- 'in_system','email','sms'
    event_type      VARCHAR(50) NOT NULL,
        -- 'submitted','escalated','approved','rejected','returned_for_correction',
        -- 'leave_starting_soon','leave_ending_soon','handover_proposed','handover_rejected'
    related_entity_type VARCHAR(50),                 -- 'leave_request','case_handover','workflow_assignment'
    related_entity_id INT,
    message         TEXT NOT NULL,
    is_privacy_safe BOOLEAN DEFAULT TRUE,             -- SMS must never contain medical/personal detail
    sent_at         TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

`is_privacy_safe` is enforced at the message-composition layer, not left to convention: any notification generated for `channel = 'sms'` is built from a **template that only ever references leave dates and employee name**, never `leave_type`, `reason`, or document contents. This is a code-level rule, not a data-level one — worth a comment in the codebase pointing back to this requirement so it doesn't get "optimized away" later by someone adding detail to make the SMS "more useful."

### 4.2 Trigger points (event → notification)

These hook into state changes already defined in Parts 1–3, so no new tables are needed to detect them — just listeners on existing writes:

| Trigger | Source | Recipient(s) | Channel |
|---|---|---|---|
| Request submitted | `leave_requests.status → 'submitted'` | First `workflow_assignments` approver | in_system + email |
| Step assigned | new row in `workflow_assignments` | Assigned employee | in_system + email |
| SLA breached (escalation) | daily job, Part 2.3 | Original approver + escalated-to approver | in_system + email |
| Decision made | new row in `approval_actions` | Requester | in_system + email |
| Returned for correction | `leave_requests.status → 'returned_for_correction'` | Requester | in_system + email |
| Handover proposed | new row in `case_handovers` (status='proposed') | Receiving prosecutor | in_system + email |
| Handover rejected | `case_handovers.status → 'rejected'` | Requester + reviewing supervisor | in_system + email |
| Emergency leave approved | `leave_requests.status → 'approved'` AND `leave_type = 'EMERGENCY'` | Zonal head of requester's zone | **sms** (privacy-safe template only) |
| Leave starting in N days | scheduled job scans `leave_request_dates` | Requester + their supervisor | in_system + email |
| Leave ending in N days | scheduled job scans `leave_request_dates` | Requester + their supervisor | in_system (return-to-work reminder) |

### 4.3 Example privacy-safe SMS template

```
"{employee_name} will be on approved leave from {start_date} to {end_date}.
Please adjust court schedule as needed. — DPP Leave System"
```
No leave type, no reason, no document reference — a zonal head needs to know *someone is absent and for how long* to reschedule hearings, not *why*.

### 4.4 Escalation job pseudocode (extends Part 2.3)

```
function runDailyNotificationSweep():
    # SLA breaches
    for assignment in pending_assignments_past_due():
        create_notification(assignment.assigned_employee_id, 'escalated', ...)
        if assignment.step.escalation_after_sla:
            create_notification(next_step_approver, 'escalated', ...)

    # Upcoming leave reminders
    for req in leave_requests_starting_within(days=3):
        create_notification(req.employee_id, 'leave_starting_soon', channel='email')
        create_notification(supervisor_of(req.employee_id), 'leave_starting_soon', channel='in_system')

    for req in leave_requests_ending_within(days=3):
        create_notification(req.employee_id, 'leave_ending_soon', channel='in_system')
```

### 4.5 Reporting

Reports are queries against the existing schema, not new tables — the value is in defining the *right* queries once so every dashboard/export reuses them.

**Leave usage by zone/department/type:**
```sql
SELECT z.name AS zone, d.name AS department, lt.name AS leave_type,
       COUNT(*) AS requests, SUM(lb.used_days) AS total_days_used
FROM leave_requests lr
JOIN employees e ON e.employee_id = lr.employee_id
JOIN zones z ON z.zone_id = e.zone_id
JOIN positions p ON p.position_id = e.position_id
JOIN departments d ON d.department_id = p.department_id
JOIN leave_types lt ON lt.leave_type_id = lr.leave_type_id
JOIN leave_balances lb ON lb.employee_id = e.employee_id AND lb.leave_type_id = lr.leave_type_id
WHERE lr.status = 'approved'
GROUP BY z.name, d.name, lt.name;
```

**Gender-disaggregated usage** (only where legally appropriate — gate this report behind a specific permission, e.g. `VIEW_GENDER_REPORTS`, since `employees.gender` is sensitive):
```sql
SELECT e.gender, lt.name AS leave_type, COUNT(*) AS requests
FROM leave_requests lr
JOIN employees e ON e.employee_id = lr.employee_id
JOIN leave_types lt ON lt.leave_type_id = lr.leave_type_id
WHERE lr.status = 'approved'
GROUP BY e.gender, lt.name;
```

**Pending approvals (bottleneck view):**
```sql
SELECT wa.assignment_id, e.full_name AS approver, lr.request_id,
       req_emp.full_name AS requester, wa.due_at,
       (now() > wa.due_at) AS is_overdue
FROM workflow_assignments wa
JOIN employees e ON e.employee_id = wa.assigned_employee_id
JOIN leave_requests lr ON lr.request_id = wa.request_id
JOIN employees req_emp ON req_emp.employee_id = lr.employee_id
WHERE wa.status = 'pending'
ORDER BY wa.due_at ASC;
```

**Upcoming absences / staff availability (feeds the coverage-risk dashboard):**
```sql
SELECT z.name AS zone, d.name AS department, lrd.the_date,
       COUNT(DISTINCT lr.employee_id) AS staff_absent
FROM leave_request_dates lrd
JOIN leave_requests lr ON lr.request_id = lrd.request_id
JOIN employees e ON e.employee_id = lr.employee_id
JOIN zones z ON z.zone_id = e.zone_id
JOIN positions p ON p.position_id = e.position_id
JOIN departments d ON d.department_id = p.department_id
WHERE lr.status = 'approved' AND lrd.the_date >= CURRENT_DATE
GROUP BY z.name, d.name, lrd.the_date
ORDER BY lrd.the_date;
```
This last query is also what powers the "flag if too many staff from one unit are approved to be away at once" check at request-validation time (Part 2) — run it with a `HAVING staff_absent >= threshold` filter against the requested dates *before* approval, not just as a retrospective report.

---

## Build Order Recap

1. `zones`, `departments`, `positions`, `employees`, `reporting_lines`, `roles`/`permissions` — get org structure right first.
2. `leave_types`, `leave_policies` (versioned), `leave_balances`.
3. `leave_requests` + validation logic (Part 2 depends on none of this being wrong).
4. `workflow_definitions`/`steps`/`assignments` + the resolver in Part 2.
5. `cases`, `case_handovers` + the gating logic in Part 3 — wire it into step 4's final-approval check.
6. `delegations` — plug into `resolveApprover`.
7. `notifications` + trigger listeners (Part 4) — wire onto every status change introduced in steps 3–5.
8. `audit_logs` with hash chaining — retrofit onto every write from step 1 onward, don't leave it for last in practice even though it's listed last here.
