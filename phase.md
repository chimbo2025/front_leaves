IMPLEMENT PHASE 1 ONLY: POLICY FOUNDATION AND ELIGIBILITY

The existing application already has seven leave_types and an existing versioned leave_policies table. Do not create a new leave-types system, do not duplicate leave types, and do not delete or rewrite historical data.

Existing leave types:
- ANNUAL
- SICK
- MATERNITY
- PATERNITY
- EMERGENCY
- STUDY
- WITHOUT_PAY

The existing leave_policies table already uses:
- leave_type_id
- version
- effective_from
- effective_to

Reuse this table as the policy-version source for now. Do not create a separate leave_policy_versions table unless the implementation proves it is necessary and reports the reason before doing so.

Implement only the following:

1. Add nullable, additive lifecycle and provenance columns to leave_policies:
- status
- source_document
- regulation_reference
- is_inherited
- parent_policy_id
- priority

Use statuses:
- draft
- pending_legal_review
- approved
- active
- superseded
- retired

2. Create leave_rules:
- id
- leave_policy_id
- rule_key
- operator
- value_json
- condition_json
- priority
- is_inherited
- inherited_from_rule_id
- overridden
- source_reference
- timestamps

3. Create leave_reasons:
- id
- leave_type_id
- code
- name
- description
- maximum_days
- period_type
- requires_document
- active
- timestamps

4. Create leave_document_requirements:
- id
- leave_policy_id nullable
- leave_type_id
- document_type
- required
- condition_json
- verification_role
- sensitivity
- active
- timestamps

5. Extend leave_requests with nullable fields:
- policy_snapshot JSON
- required_docs_provided JSON
- medical_required boolean nullable
- eligibility_checked_at nullable
- eligibility_blockers JSON nullable
- eligibility_ok boolean nullable
- policy_version string nullable, only if needed in addition to policy_id

Do not backfill historical leave requests. New snapshots must be written only when a new request is submitted.

6. Update PolicyService.currentPolicy and policyEffectiveAt:
- Respect effective_from and effective_to.
- Exclude draft, pending_legal_review, superseded, and retired policies.
- Select only approved or active policies.
- Detect overlapping active policy windows.
- Do not allow missing or ambiguous policy resolution to pass silently.

7. Create LeavePolicyResolver:
- Resolve the applicable existing leave_policy by leave_type_id and date.
- Support inherited and overridden rules.
- Return policy ID, version, source, and resolved rules.

8. Create LeaveEligibilityService:
- Use the resolved policy.
- Check employee status.
- Check leave balance.
- Check policy maximum.
- Check maximum per request.
- Check minimum tenure.
- Check notice period.
- Check required documents.
- Check medical requirements where currently supported.
- Check probation where currently supported.
- Check overlapping leave.
- Return structured blockers and required documents.

9. Update eligibility endpoint and request submission:
- Run eligibility before allowing submission.
- Run the same check again on the backend during submission.
- Store policy_id, policy_version, policy_snapshot, eligibility_checked_at, eligibility_blockers, and eligibility_ok.
- Do not allow draft or pending-legal-review policies to calculate eligibility.

10. Preserve backward compatibility:
- Keep existing required_docs JSON working temporarily.
- Keep existing policy_id references working.
- Do not change historical request decisions.
- Do not change workflow behavior.
- Do not implement notifications, almanac, waiver, late-return deductions, payments, signatures, reports, or official letters in this phase.

11. Add tests:
- Existing seven leave types are reused.
- No duplicate leave types are created.
- Draft policies do not affect eligibility.
- Pending legal review policies do not affect eligibility.
- Active policy resolution works by effective date.
- Superseded policies are excluded.
- Overlapping active policies are rejected.
- Ineligible requests return clear blockers.
- Required documents are reported.
- New requests receive policy snapshots.
- Historical requests are not modified.
- Existing routes continue to work.
- Existing policy_id foreign keys remain valid.

Run migrations and tests in a safe database transaction where appropriate. Provide:
- Files changed.
- Migrations created.
- Existing records affected.
- New records inserted.
- Tests executed.
- Legal values still requiring confirmation.

Stop after Phase 1 and wait for review. Do not begin Phase 2.