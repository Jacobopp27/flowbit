# Workflows with branching

Definitions:
- Stage: a generic step (e.g., Cut, Sew, Sublimation)
- Edge: dependency relationship between stages (A -> B means B is blocked until A is done)
- Project-selected stages: subset of stages that apply to the project

ProjectStage statuses:
- NOT_SELECTED (implicit; stage not included in project)
- BLOCKED
- READY
- IN_PROGRESS
- DONE
- SKIPPED (optional; allow admin)

State transitions:
- On project creation, compute READY stages: selected stages with no selected prerequisites.
- When a ProjectStage becomes DONE, recompute dependents; unblock if all prerequisites are DONE or SKIPPED.