# MVP Scope (Phase 1)

In scope:
- Multi-company via company_id (tenant)
- Super Admin can create companies and the company "Boss" user
- Company Admin/Boss can:
  - Create stages (areas)
  - Define stage dependencies (edges) for branching flow
  - Create users and assign roles + stage access
  - Create products and BOM
  - Create projects: select which stages apply, set deadlines per selected stage, set qty, pick product(s)
  - View project details: board by stages, timeline, materials requirements, financial events
- Stage workers can:
  - See "My Work" for their assigned stages
  - Update qty_done, start/stop work timer, add notes/attachments
- Financial events:
  - Record incomes/costs per project (admin only)
  - Dashboard totals + simple charts

Out of scope (later):
- Formal accounting (PUC, taxes)
- Complex inventory movement/reservations
- Automated notifications/WhatsApp
- Fancy graph visualization (use Kanban/list first)