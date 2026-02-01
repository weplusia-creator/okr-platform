import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import {
  Login,
  Register,
  Dashboard,
  FinanceDashboard,
  Clients,
  ClientForm,
  ClientDetail,
  Invoices,
  InvoiceForm,
  InvoiceDetail,
  CashFlow,
  ProjectsDashboard,
  ProjectsList,
  ProjectForm,
  ProjectDetail,
  MyModules,
  GanttView,
  Products,
  NPSSurveyForm,
  Users,
  KPIDashboard,
} from './pages';
import { Layout, ProtectedRoute } from './components';
import { useAuth } from './context/AuthContext';

function ClientFormKeyed() {
  const { id } = useParams();
  return <ClientForm key={id} />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <Register />}
      />
      <Route path="/nps/:token" element={<NPSSurveyForm />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* General / OKR Routes */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/okrs" element={<Dashboard />} />

        {/* Finance Routes */}
        <Route path="/finance" element={<FinanceDashboard />} />
        <Route path="/projects/clients" element={<Clients />} />
        <Route path="/projects/clients/new" element={<ClientForm />} />
        <Route path="/projects/clients/:id" element={<ClientDetail />} />
        <Route path="/projects/clients/:id/edit" element={<ClientFormKeyed />} />
        <Route path="/finance/invoices" element={<Invoices />} />
        <Route path="/finance/invoices/new" element={<InvoiceForm />} />
        <Route path="/finance/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/finance/invoices/:id/edit" element={<InvoiceForm />} />
        <Route path="/finance/cash-flow" element={<CashFlow />} />

        {/* Project Routes */}
        <Route path="/projects" element={<ProjectsDashboard />} />
        <Route path="/projects/list" element={<ProjectsList />} />
        <Route path="/projects/new" element={<ProjectForm />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/projects/:id/edit" element={<ProjectForm />} />
        <Route path="/projects/my-modules" element={<MyModules />} />
        <Route path="/projects/gantt" element={<GanttView />} />
        <Route path="/products" element={<Products />} />
        <Route path="/kpis" element={<KPIDashboard />} />
        <Route path="/admin/team" element={<Users key="team" />} />
        <Route path="/admin/clients" element={<Users key="clients" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
