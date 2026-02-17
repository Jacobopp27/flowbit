# API Contract (v1)

Auth:
- POST /auth/login

Super Admin:
- POST /platform/companies
- GET  /platform/companies

Company config:
- POST /companies/{company_id}/stages
- GET  /companies/{company_id}/stages
- POST /companies/{company_id}/stage-edges
- GET  /companies/{company_id}/stage-edges

Users:
- POST /companies/{company_id}/users
- GET  /companies/{company_id}/users

Products/BOM:
- POST /companies/{company_id}/materials
- POST /companies/{company_id}/products
- POST /companies/{company_id}/products/{product_id}/bom-items

Projects:
- POST /companies/{company_id}/projects
- GET  /companies/{company_id}/projects
- GET  /companies/{company_id}/projects/{project_id}

Project work (stage inbox):
- GET  /me/work-items
- PATCH /project-stages/{project_stage_id}  (update status, qty_done)
- POST  /project-stages/{project_stage_id}/time-logs/start
- POST  /project-stages/{project_stage_id}/time-logs/stop

Finance:
- POST /projects/{project_id}/financial-events
- GET  /projects/{project_id}/financial-events