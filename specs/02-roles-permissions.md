# Roles & Permissions

Roles:
- SUPER_ADMIN (platform owner): create companies, manage platform.
- COMPANY_ADMIN/BOSS: full access within company, including finance & config.
- STAGE_LEAD: manage a stage (optional in MVP), can view stage work, assign tasks.
- STAGE_WORKER: only access assigned stages; cannot view finance.

Rules:
- Stage access is required to view/edit a ProjectStage.
- Finance visibility is restricted to COMPANY_ADMIN/BOSS.
- Field-level restriction: workers never see unit prices, totals, incomes/costs.