IMPLEMENT PHASE 2 ONLY: LEAVE WAIVER/DEFERRAL AND ALMANAC LEAVE PLANNING

Phase 0 audit and Phase 1 policy foundation are complete. The application already has existing leave_types, versioned leave_policies, LeavePolicyResolver, LeaveEligibilityService, leave_requests, leave_balances, employee scope logic, and existing workflow infrastructure.

Do not create a new leave_types system.
Do not duplicate existing leave types.
Do not implement Phase 3, 4, 5, 6, or 7.
Do not implement late-return deductions, email notifications, payment processing, digital signatures, official letters, or reports in this phase.

PART A: LEAVE WAIVER AND DEFERRAL

Create leave_waivers with:
- id
- employee_id
- leave_type_id
- leave_policy_id
- leave_cycle_start
- leave_cycle_end
- requested_action
- reason
- requested_by
- status
- reviewed_by
- reviewed_at
- decision_comment
- effect_json
- policy_snapshot
- timestamps

Use statuses:
- draft
- submitted
- under_review
- approved
- rejected
- cancelled
- expired

Use requested actions:
- employee_declined
- employee_requested_deferral
- employer_deferred
- rescheduled

Do not delete leave balances automatically.
Do not automatically forfeit or deduct leave without an active approved policy.
Apply any balance effect through an auditable balance transaction.
Prevent an employee from approving their own waiver.
Use existing workflow and scope authorization where possible.

PART B: ALMANAC LEAVE PLANNING

Create leave_plans with:
- id
- employee_id
- leave_type_id
- leave_policy_id
- cycle_start
- cycle_end
- status
- selected_option
- confirmed_start_date
- confirmed_end_date
- confirmed_by
- confirmed_at
- timestamps

Create leave_plan_options with:
- id
- leave_plan_id
- option_number
- start_date
- end_date
- days
- score
- score_breakdown_json
- availability_status
- reason
- timestamps

Use statuses:
- draft
- proposed
- employee_selected
- manager_review
- confirmed
- rejected
- expired
- converted_to_request
- cancelled

Implement LeaveDateProposalService. Generate up to three ranked date options using:
- resolved active policy
- LeaveEligibilityService
- available balance
- policy maximum
- minimum notice
- existing approved leave
- public holidays where configured
- blackout periods
- department staffing rules
- zone staffing rules
- employee preferences where available

Do not propose invalid dates.
Store score_breakdown_json explaining every option.
If fewer than three valid options exist, return the valid options and explain why fewer were available.
Do not invent dates when no valid option exists.

PART C: ACCESS SCOPE

Reuse the existing AccessScopeService and authorization model.

Support:
- employee own plan
- department manager view
- zone manager view
- HR organisation view where authorised

Do not expose medical reasons or sensitive documents in calendar views.
Add explicit permissions:
- leave_plans.view_own
- leave_plans.create_own
- leave_plans.select_own
- leave_plans.view_department
- leave_plans.view_zone
- leave_plans.confirm_department
- leave_plans.confirm_zone
- leave_waivers.create_own
- leave_waivers.review
- leave_waivers.approve

Use backend authorization policies, not frontend checks only.

PART D: PLAN CONVERSION

When an employee selects an option:
1. Re-run LeaveEligibilityService.
2. Re-check balance.
3. Re-check notice.
4. Re-check blackout dates.
5. Re-check staffing coverage.
6. Create or update the leave request.
7. Copy the current policy snapshot.
8. Mark the plan as converted_to_request.

Perform conversion inside a database transaction.
Make conversion idempotent.
Do not create duplicate leave requests if conversion is retried.
The transaction must roll back the request and plan update together if conversion fails.

PART E: API AND UI

Add endpoints for:
- create waiver
- submit waiver
- review waiver
- approve/reject waiver
- create leave plan
- generate date options
- view own plan
- select option
- manager calendar
- confirm plan
- convert plan to request

Use existing API response conventions.
Use clear blocker and validation messages.
Do not break existing leave request routes.

PART F: TESTS

Add tests for:
- existing leave types are reused
- employee can create own waiver
- employee cannot approve own waiver
- managers see only their scope
- sensitive medical data is hidden from calendar views
- exactly three valid options are generated when possible
- fewer options are explained
- blackout dates are excluded
- staffing minimums are respected
- balance and notice rules are respected
- expired plans cannot be selected
- selected plans are revalidated
- conversion creates one request only
- repeated conversion is idempotent
- failed conversion leaves data unchanged
- policy snapshots are preserved
- unauthorised access is denied

At the end, report:
- files changed
- migrations created
- routes added
- permissions added
- records created
- tests run and results
- unresolved policy decisions

Stop after Phase 2. Do not implement Phase 3 or later.