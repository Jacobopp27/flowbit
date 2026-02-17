# Acceptance Criteria (high-level)

1) Company creation
- Given SUPER_ADMIN creates a company, a BOSS user is created and can log in.

2) Branching flow
- Given stages and edges exist, when a project selects a subset of stages,
  the system sets READY stages correctly (no selected prerequisites).

3) Stage worker restriction
- Worker assigned to "Cut" sees only Cut work items; cannot access finance endpoints.

4) Deadlines/timeline
- Each project stage shows planned_due_date and actual timestamps.
- When a stage is marked DONE, timeline updates and dependent stages can become READY.

5) BOM snapshot
- Creating a project with product qty generates material requirements with totals.
- Editing the project's requirements does not alter the product BOM.