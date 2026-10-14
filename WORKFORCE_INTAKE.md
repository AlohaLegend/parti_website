# PARTI workforce intake

## Routes

- Single shareable people intake: `employee-intake.html`
- Independent project branch: `contractor-onboarding.html?unified=1` (entered through the single people intake)
- Talent review: `operations-contractors.html`
- Employee review and role-link builder: `operations-employees.html`

All routes are absent from public homepage navigation. Public intake pages use `noindex`, `nofollow`, and `noarchive`. PARTI only needs to share `employee-intake.html`. It first asks whether the person is discussing an employee role or independent project work, then routes them to the correct questions. Operations routes require an authenticated user on the existing PARTI admin allowlist.

## Adam guideline coverage

The employee intake follows the PARTI W-2 Employee Intake question bank:

1. A role briefing appears before candidate questions and includes role title, essential responsibilities, reporting line, location, schedule, approved compensation range, and currently available benefits.
2. Contact and opportunity questions cover legal and preferred name, personal contact information, location, portfolio, role, prior PARTI work, full-time or part-time preference, and realistic start date.
3. Contribution and growth cover day-one ownership, onboarding support, growth areas, 90-day success, representative work, preferred environment, feedback practices, and 2 to 3 year responsibility goals.
4. Compensation and priorities cover desired structure, desired base compensation, up to five priorities, essential and negotiable items, later review items, incentives, and long-term goals.
5. Working conditions cover arrangement, schedule constraints, travel, nights and weekends, equipment, current professional commitments, and a high-level agreement conflict question.
6. Timing and next steps cover decision criteria, open questions, package alternatives, decision deadline, live-discussion preference, and additional context.
7. Final acknowledgements state that the intake is not an offer, employment agreement, benefit guarantee, or waiver.
8. The internal review desk supports Approved now, Review later with owner, date, and prerequisite, and Not approved with an explanation or alternative.

The internal link builder requires each briefing field before it creates a shareable URL. It tells the team to use only currently approved terms. A missing value on a manually assembled link is shown to the candidate as missing, never invented.

## Intentional differences

- The public entry point is unified, but employee and contractor questions and records remain separate. Salary, benefit, career-development, and employee-management questions are not copied into the contractor path because doing so could blur the classification boundary. The contractor path keeps project rates, business independence, insurance, and safety readiness.
- The employee form does not ask for salary history. It asks only for desired compensation or lets the candidate wait for the approved range.
- No pre-offer intake asks about criminal history, medical or disability information, demographics, Social Security or tax numbers, banking, or identity documents.
- Full-time, part-time, and either are branches in one employee form until Adam's separate part-time question bank is reviewed. This avoids maintaining two inconsistent versions before the second source exists.
- Most long-form questions are required only when they affect a practical decision. Optional reflection fields remain available without forcing filler answers.
- Employee candidates receive no automated fit or hiring score. The contractor completeness score remains a record-completeness and routing aid, not a hiring, legal, or classification decision.

## Data and deployment

Run `supabase/employee_intake.sql` in the existing PARTI Supabase project. It creates an anonymous insert-only intake table and restricts reading and updating to authenticated PARTI admins. The complete setup is also included in `supabase/parti_setup.sql`.

Email notifications remain intentionally disconnected. New records appear in the appropriate protected operations desk.

Before PARTI uses the employee intake for a live role, an authorized team member should create a role-specific link in the Employee Candidates desk using only approved current information. Formal offers and signatures remain a later, separate workflow.
