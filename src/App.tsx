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
  Saldos,
  ProjectsDashboard,
  ProjectsList,
  ProjectForm,
  ProjectDetail,
  GanttView,
  Products,
  NPSSurveyForm,
  Users,
  KPIDashboard,
  ClientPortal,
  ClientProjectDetail,
  OKRInitiatives,
  TaskBoard,
  Landing,
  AgroLanding,
  Meetings,
  Manual,
  PlaybookDashboard,
  PlaybookEditor,
  PlaybookView,
} from './pages';
import {
  CRMDashboard,
  CRMControlPanel,
  LeadsList,
  LeadDetail,
  LeadForm,
  DealPipeline,
  DealDetail,
  DealForm,
  ActivityList,
} from './pages/crm';
import { BMCDashboard, BMCTemplates, BMCCanvasView, BMCRespond } from './pages/bmc';
import { ProposalsDashboard, ProposalForm, ProposalDetail, ProposalPublicView } from './pages/proposals';
import { ArcaConfig, ArcaPuntosVenta, ArcaInvoices } from './pages/finance/arca';
import {
  CheckinDashboard, CheckinDetail, CheckinPublicForm,
  CheckinHistory, CheckinConfigPage, CheckinPlantillas,
} from './pages/checkins';
import { ToolsDashboard } from './pages/tools/ToolsDashboard';
import { ROIDashboard } from './pages/tools/roi/ROIDashboard';
import { ROICalculator } from './pages/tools/roi/ROICalculator';
import { ProspectorDashboard } from './pages/tools/prospector/ProspectorDashboard';
import { ProspectorList } from './pages/tools/prospector/ProspectorList';
import { ProspectorForm } from './pages/tools/prospector/ProspectorForm';
import { ProspectorDetail } from './pages/tools/prospector/ProspectorDetail';
import { ProspectorSettings } from './pages/tools/prospector/ProspectorSettings';
import { ProspectorScraper } from './pages/tools/prospector/ProspectorScraper';
import { ProspectorScrapeHistory } from './pages/tools/prospector/ProspectorScrapeHistory';
import { Organizations, SuperUsers } from './pages/super';
import { HomeDashboard } from './pages/HomeDashboard';
import { Layout, ProtectedRoute } from './components';
import { useAuth } from './context/AuthContext';

function ClientFormKeyed() {
  const { id } = useParams();
  return <ClientForm key={id} />;
}

function HomeRedirect() {
  const { appUser } = useAuth();
  if (appUser?.userType === 'client') return <Navigate to="/portal" replace />;
  return <HomeDashboard />;
}

function LandingRedirect() {
  const { user } = useAuth();
  const isAgro = window.location.hostname.startsWith('agro.');
  if (isAgro) return <AgroLanding />;
  if (user) return <Navigate to="/home" replace />;
  return <Landing />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingRedirect />} />
      <Route
        path="/login"
        element={user ? <Navigate to="/home" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/home" replace /> : <Register />}
      />
      <Route path="/nps/:token" element={<NPSSurveyForm />} />
      <Route path="/p/:token" element={<ProposalPublicView />} />
      <Route path="/checkin/:token" element={<CheckinPublicForm />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* General / OKR Routes */}
        <Route path="/home" element={<HomeRedirect />} />
        <Route path="/okrs" element={<Dashboard />} />
        <Route path="/okrs/initiatives" element={<OKRInitiatives />} />
        <Route path="/gestion" element={<TaskBoard />} />

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
        <Route path="/finance/saldos" element={<Saldos />} />
        {/* ARCA Routes */}
        <Route path="/finance/arca" element={<ArcaConfig />} />
        <Route path="/finance/arca/puntos-venta" element={<ArcaPuntosVenta />} />
        <Route path="/finance/arca/invoices" element={<ArcaInvoices />} />

        {/* Project Routes */}
        <Route path="/projects" element={<ProjectsDashboard />} />
        <Route path="/projects/list" element={<ProjectsList />} />
        <Route path="/projects/new" element={<ProjectForm />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/projects/:id/edit" element={<ProjectForm />} />
        {/* Portal (client users) */}
        <Route path="/portal" element={<ClientPortal />} />
        <Route path="/portal/:projectId" element={<ClientProjectDetail />} />
        <Route path="/projects/gantt" element={<GanttView />} />
        <Route path="/products" element={<Products />} />
        <Route path="/kpis" element={<KPIDashboard />} />
        <Route path="/admin/team" element={<Users key="team" />} />
        <Route path="/admin/clients" element={<Users key="clients" />} />
        <Route path="/admin/meetings" element={<Meetings />} />
        <Route path="/admin/manual" element={<Manual />} />
        {/* Playbook Routes */}
        <Route path="/playbook" element={<PlaybookDashboard />} />
        <Route path="/playbook/:id" element={<PlaybookEditor />} />
        <Route path="/playbook/:id/view" element={<PlaybookView />} />
        {/* CRM Routes */}
        <Route path="/crm" element={<CRMDashboard />} />
        <Route path="/crm/control" element={<CRMControlPanel />} />
        <Route path="/crm/leads" element={<LeadsList />} />
        <Route path="/crm/leads/new" element={<LeadForm />} />
        <Route path="/crm/leads/:id" element={<LeadDetail />} />
        <Route path="/crm/leads/:id/edit" element={<LeadForm />} />
        <Route path="/crm/pipeline" element={<DealPipeline />} />
        <Route path="/crm/deals/new" element={<DealForm />} />
        <Route path="/crm/deals/:id" element={<DealDetail />} />
        <Route path="/crm/deals/:id/edit" element={<DealForm />} />
        <Route path="/crm/activities" element={<ActivityList />} />
        {/* Proposal Routes */}
        <Route path="/proposals" element={<ProposalsDashboard />} />
        <Route path="/proposals/new" element={<ProposalForm />} />
        <Route path="/proposals/:id" element={<ProposalDetail />} />
        <Route path="/proposals/:id/edit" element={<ProposalForm />} />
        {/* Tools Routes */}
        <Route path="/tools" element={<ToolsDashboard />} />
        <Route path="/tools/roi" element={<ROIDashboard />} />
        <Route path="/tools/roi/new" element={<ROICalculator />} />
        <Route path="/tools/roi/:id" element={<ROICalculator />} />
        {/* Prospector B2B */}
        <Route path="/tools/prospector" element={<ProspectorDashboard />} />
        <Route path="/tools/prospector/list" element={<ProspectorList />} />
        <Route path="/tools/prospector/new" element={<ProspectorForm />} />
        <Route path="/tools/prospector/scrape" element={<ProspectorScraper />} />
        <Route path="/tools/prospector/history" element={<ProspectorScrapeHistory />} />
        <Route path="/tools/prospector/settings" element={<ProspectorSettings />} />
        <Route path="/tools/prospector/:id" element={<ProspectorDetail />} />
        <Route path="/tools/prospector/:id/edit" element={<ProspectorForm />} />
        {/* Check-in Routes */}
        <Route path="/checkins" element={<CheckinDashboard />} />
        <Route path="/checkins/plantillas" element={<CheckinPlantillas />} />
        <Route path="/checkins/config/:projectId" element={<CheckinConfigPage />} />
        <Route path="/checkins/history/:projectId" element={<CheckinHistory />} />
        <Route path="/checkins/:id" element={<CheckinDetail />} />
        {/* BMC Routes */}
        <Route path="/bmc" element={<BMCDashboard />} />
        <Route path="/bmc/templates" element={<BMCTemplates />} />
        <Route path="/bmc/:canvasId" element={<BMCCanvasView />} />
        <Route path="/bmc/:canvasId/respond" element={<BMCRespond />} />
        {/* Super Admin Routes */}
        <Route path="/super/organizations" element={<Organizations />} />
        <Route path="/super/users" element={<SuperUsers />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
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
