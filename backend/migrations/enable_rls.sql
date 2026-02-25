-- Enable Row Level Security on all tables
-- This is a security best practice even when using FastAPI as backend
-- RLS prevents direct access to tables via PostgREST

-- Enable RLS on all tables
ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stage_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_material_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_material_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stage_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations from service role only
-- This blocks direct PostgREST access while allowing backend (FastAPI) to work normally

-- Policy for alembic_version (migrations table - service role only)
DROP POLICY IF EXISTS "Service role only" ON public.alembic_version;
CREATE POLICY "Service role only" ON public.alembic_version
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for companies
DROP POLICY IF EXISTS "Service role only" ON public.companies;
CREATE POLICY "Service role only" ON public.companies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for users
DROP POLICY IF EXISTS "Service role only" ON public.users;
CREATE POLICY "Service role only" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for products
DROP POLICY IF EXISTS "Service role only" ON public.products;
CREATE POLICY "Service role only" ON public.products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for product_bom_items
DROP POLICY IF EXISTS "Service role only" ON public.product_bom_items;
CREATE POLICY "Service role only" ON public.product_bom_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for product_inventory
DROP POLICY IF EXISTS "Service role only" ON public.product_inventory;
CREATE POLICY "Service role only" ON public.product_inventory
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for product_sales
DROP POLICY IF EXISTS "Service role only" ON public.product_sales;
CREATE POLICY "Service role only" ON public.product_sales
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for stages
DROP POLICY IF EXISTS "Service role only" ON public.stages;
CREATE POLICY "Service role only" ON public.stages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for stage_edges
DROP POLICY IF EXISTS "Service role only" ON public.stage_edges;
CREATE POLICY "Service role only" ON public.stage_edges
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for projects
DROP POLICY IF EXISTS "Service role only" ON public.projects;
CREATE POLICY "Service role only" ON public.projects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for project_products
DROP POLICY IF EXISTS "Service role only" ON public.project_products;
CREATE POLICY "Service role only" ON public.project_products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for project_stages
DROP POLICY IF EXISTS "Service role only" ON public.project_stages;
CREATE POLICY "Service role only" ON public.project_stages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for project_stage_dependencies
DROP POLICY IF EXISTS "Service role only" ON public.project_stage_dependencies;
CREATE POLICY "Service role only" ON public.project_stage_dependencies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for project_material_requirements
DROP POLICY IF EXISTS "Service role only" ON public.project_material_requirements;
CREATE POLICY "Service role only" ON public.project_material_requirements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for project_material_purchases
DROP POLICY IF EXISTS "Service role only" ON public.project_material_purchases;
CREATE POLICY "Service role only" ON public.project_material_purchases
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for user_stage_access
DROP POLICY IF EXISTS "Service role only" ON public.user_stage_access;
CREATE POLICY "Service role only" ON public.user_stage_access
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for time_logs
DROP POLICY IF EXISTS "Service role only" ON public.time_logs;
CREATE POLICY "Service role only" ON public.time_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for stage_event_log
DROP POLICY IF EXISTS "Service role only" ON public.stage_event_log;
CREATE POLICY "Service role only" ON public.stage_event_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for financial_events
DROP POLICY IF EXISTS "Service role only" ON public.financial_events;
CREATE POLICY "Service role only" ON public.financial_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for suppliers
DROP POLICY IF EXISTS "Service role only" ON public.suppliers;
CREATE POLICY "Service role only" ON public.suppliers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for materials
DROP POLICY IF EXISTS "Service role only" ON public.materials;
CREATE POLICY "Service role only" ON public.materials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for material_purchases
DROP POLICY IF EXISTS "Service role only" ON public.material_purchases;
CREATE POLICY "Service role only" ON public.material_purchases
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for notifications
DROP POLICY IF EXISTS "Service role only" ON public.notifications;
CREATE POLICY "Service role only" ON public.notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions to service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verify RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
