import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/layouts/AppShell';
import Login from '@/pages/Login';
import { Toaster } from '@/components/ui/toaster';

// Admin pages
import { AdminDashboard } from '@/pages/admin/Dashboard';
import { ProjectsList } from '@/pages/admin/ProjectsList';
import { NewProject } from '@/pages/admin/NewProject';
import { ProjectDetail } from '@/pages/admin/ProjectDetail';
import { ProjectStageView } from '@/pages/ProjectStageView';
import { Stages } from '@/pages/admin/Stages';
import { Users } from '@/pages/admin/Users';
import { Materials } from '@/pages/admin/Materials';
import { Products } from '@/pages/admin/Products';
import Suppliers from '@/pages/admin/Suppliers';
import { Settings } from '@/pages/admin/Settings';
import { Purchases } from '@/pages/admin/Purchases';
import { MaterialsInventory } from '@/pages/admin/MaterialsInventory';
import { ProductsInventory } from '@/pages/admin/ProductsInventory';
import { Templates } from '@/pages/admin/Templates';
import { TemplateEditor } from '@/pages/admin/TemplateEditor';

// Landing
import { Landing } from '@/pages/Landing';

// Worker pages
import { MyWork } from '@/pages/worker/MyWork';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  const role: 'ADMIN' | 'WORKER' =
    user?.role === 'STAGE_WORKER' ? 'WORKER' : 'ADMIN';

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Navigate
              to={role === 'ADMIN' ? '/admin/dashboard' : '/work'}
              replace
            />
          </ProtectedRoute>
        }
      />

      {role === 'ADMIN' && (
        <>
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <AdminDashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/projects"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <ProjectsList />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/projects/new"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <NewProject />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/projects/:id"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <ProjectDetail />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/projects/:projectId/stages/:stageId"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <ProjectStageView />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stages"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <Stages />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <Users />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/materials"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <Materials />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/suppliers"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <Suppliers />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <Products />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <Settings />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/purchases"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <Purchases />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/inventory/materials"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <MaterialsInventory />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/inventory/products"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <ProductsInventory />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/templates"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <Templates />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/templates/new"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <TemplateEditor />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/templates/:id/edit"
            element={
              <ProtectedRoute>
                <AppShell role="ADMIN">
                  <TemplateEditor />
                </AppShell>
              </ProtectedRoute>
            }
          />
        </>
      )}

      {role === 'WORKER' && (
        <>
          <Route
            path="/work"
            element={
              <ProtectedRoute>
                <AppShell role="WORKER">
                  <MyWork />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/projects/:projectId/stages/:stageId"
            element={
              <ProtectedRoute>
                <AppShell role="WORKER">
                  <ProjectStageView />
                </AppShell>
              </ProtectedRoute>
            }
          />
        </>
      )}

      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Navigate
              to={role === 'ADMIN' ? '/admin/dashboard' : '/work'}
              replace
            />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
