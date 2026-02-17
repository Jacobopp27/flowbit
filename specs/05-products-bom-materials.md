# Products, BOM, Materials

Material:
- name, unit (m, unit, etc.)

Product:
- name, sku(optional)
- BOM items: (material_id, qty_per_unit)

On project creation:
- If project includes products + quantities, generate ProjectMaterialRequirement snapshot:
  - qty_per_unit (copied from BOM, editable)
  - qty_total = qty_per_unit * project_qty
  - qty_available (editable)
  - qty_to_buy = max(0, qty_total - qty_available)

Important:
- Editing project requirements must NOT modify the product BOM.