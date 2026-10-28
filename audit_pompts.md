PHASE 0 AND PHASE 1 ONLY: AUDIT AND CONNECT EXISTING LEAVE TYPES TO VERSIONED POLICIES

Important:
The application already has leave types. Do not create duplicate leave types and do not replace existing records.

First inspect the complete repository and database schema.

Audit:
1. Existing leave_types records and codes.
2. Existing leave policies and rules.
3. Leave requests and balance tables.
4. Existing leave controllers, routes, services, and frontend forms.
5. Existing approval workflow.
6. Existing eligibility checks.
7. Existing notification logic.
8. Existing employee leave history.
9. Duplicate or conflicting leave codes.
10. Any hard-coded leave durations or policy values.

Return an audit report containing:
- Existing table and column names.
- Existing leave types.
- Existing policy data.
- Existing APIs and routes.
- Existing services.
- Missing fields.
- Conflicting values.
- Duplicate codes.
- Required migrations.
- Risks to existing leave requests.

Do not modify or delete data during the audit.

After the audit, implement only the policy foundation:

1. Reuse existing leave_types records.
2. Add leave_policy_versions if missing.
3. Add leave_rules if missing.
4. Add leave_reasons if missing.
5. Add leave_document_requirements if missing.
6. Link policy rules to existing leave_types using leave_type_id.
7. Add policy statuses:
   draft, pending_legal_review, approved, active, superseded, retired.
8. Add effective_from and effective_to.
9. Add source document and regulation reference.
10. Support inherited and overridden rules.
11. Import the supplied Zanzibar leave data only against existing leave type records.
12. Create new leave types only when the audit proves they are missing.
13. Do not create duplicate codes.
14. Do not activate disputed legal values.
15. Do not modify historical leave requests.

Implement:
- LeavePolicyResolver.
- Policy version selection by effective date.
- LeaveEligibilityService using the resolved policy.
- Policy validation.
- Policy snapshot fields for new leave requests.

Before allowing a leave request to proceed, evaluate:
- employee status,
- leave type,
- dates,
- entitlement,
- balance,
- overlapping leave,
- policy version,
- required documents,
- medical requirements,
- probation,
- loan status,
- previous leave history,
- eligibility conditions.

Return clear eligibility reasons and required documents.

Add tests for:
- Existing leave types are reused.
- Duplicate leave types are not created.
- Correct policy version is selected.
- Draft policies do not affect eligibility.
- Active policies affect new requests.
- Historical requests retain their original values.
- Ineligible employees receive clear reasons.
- Missing policy rules fail safely.
- Conflicting effective dates are rejected.

Stop after Phase 0 and Phase 1. Report files changed, migrations, imported records, unresolved legal conflicts, and test results. Do not implement notifications, calendar, late-return deductions, payments, reports, signatures, or official letters yet.