# Finance (visual, not formal accounting)

FinancialEvent:
- type: INCOME | COST
- project_id
- amount
- date
- category (e.g., fabric, labor, transport, payment_received)
- note
- attachment(optional)

Metrics:
- per project: total_income, total_cost, margin = income - cost
- global: monthly totals, top projects by margin (basic)