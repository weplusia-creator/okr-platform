import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import {
  Login,
  Register,
  Dashboard,
  OKRClientsHub,
  ObjectiveDetail,
  TableroControl,
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
  PortalOKRs,
  OKRInitiatives,
  TaskBoard,
  Landing,
  AgroLanding,
  AgroGuiaLanding,
  Meetings,
  Manual,
  PlaybookDashboard,
  PlaybookEditor,
  PlaybookView,
  PlaybookPublicView,
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
const ProposalsDashboard = lazy(() => import('./pages/proposals').then(m => ({ default: m.ProposalsDashboard })));
const ProposalForm = lazy(() => import('./pages/proposals').then(m => ({ default: m.ProposalForm })));
const ProposalDetail = lazy(() => import('./pages/proposals').then(m => ({ default: m.ProposalDetail })));
const ProposalPublicView = lazy(() => import('./pages/proposals').then(m => ({ default: m.ProposalPublicView })));
const ProposalSlideEditor = lazy(() => import('./pages/proposals').then(m => ({ default: m.ProposalSlideEditor })));
const PresentationsDashboard = lazy(() => import('./pages/presentations').then(m => ({ default: m.PresentationsDashboard })));
const PresentationForm = lazy(() => import('./pages/presentations').then(m => ({ default: m.PresentationForm })));
const PresentationDetail = lazy(() => import('./pages/presentations').then(m => ({ default: m.PresentationDetail })));
const PresentationPublicView = lazy(() => import('./pages/presentations').then(m => ({ default: m.PresentationPublicView })));
const ArcaConfig = lazy(() => import('./pages/finance/arca').then(m => ({ default: m.ArcaConfig })));
const ArcaPuntosVenta = lazy(() => import('./pages/finance/arca').then(m => ({ default: m.ArcaPuntosVenta })));
const ArcaInvoices = lazy(() => import('./pages/finance/arca').then(m => ({ default: m.ArcaInvoices })));
import {
  CheckinDashboard, CheckinDetail, CheckinPublicForm,
  CheckinHistory, CheckinConfigPage, CheckinPlantillas,
} from './pages/checkins';
import { EncuentroNuevo } from './pages/encuentros';
import { Organizations, SuperUsers } from './pages/super';
const QuizDashboard = lazy(() => import('./pages/quiz/QuizDashboard').then(m => ({ default: m.QuizDashboard })));
const QuizForm = lazy(() => import('./pages/quiz/QuizForm').then(m => ({ default: m.QuizForm })));
const QuizDetail = lazy(() => import('./pages/quiz/QuizDetail').then(m => ({ default: m.QuizDetail })));
const QuizLive = lazy(() => import('./pages/quiz/QuizLive').then(m => ({ default: m.QuizLive })));
const QuizPlay = lazy(() => import('./pages/quiz/QuizPlay').then(m => ({ default: m.QuizPlay })));
import { HomeDashboard } from './pages/HomeDashboard';
import { Layout, ProtectedRoute } from './components';
import { Toaster } from './components/ui/toast';
import { ConfirmDialogHost } from './components/ui/confirm';
import { CommandPaletteHost } from './components/ui/CommandPalette';
import { useAuth } from './context/AuthContext';

function ClientFormKeyed() {
  const { id } = useParams();
  return <ClientForm key={id} />;
}

function ProjectFormKeyed() {
  const { id } = useParams();
  return <ProjectForm key={id || 'new'} />;
}

function InvoiceFormKeyed() {
  const { id } = useParams();
  return <InvoiceForm key={id || 'new'} />;
}

function LeadFormKeyed() {
  const { id } = useParams();
  return <LeadForm key={id || 'new'} />;
}

function DealFormKeyed() {
  const { id } = useParams();
  return <DealForm key={id || 'new'} />;
}

function ProposalFormKeyed() {
  const { id } = useParams();
  return <ProposalForm key={id || 'new'} />;
}

function PresentationFormKeyed() {
  const { id } = useParams();
  return <PresentationForm key={id || 'new'} />;
}

function QuizFormKeyed() {
  const { id } = useParams();
  return <QuizForm key={id || 'new'} />;
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

function AgroGuiaRoute() {
  const isAgro = window.location.hostname.startsWith('agro.');
  if (isAgro) return <AgroGuiaLanding />;
  return <Navigate to="/" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#2e2a2b]">
        <div className="flex flex-col items-center gap-3">
          <img src="/wau-icon.png" alt="WAU" className="w-12 h-12 object-contain animate-pulse" />
          <p className="text-sm text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#2e2a2b]">
        <div className="flex flex-col items-center gap-3">
          <img src="/wau-icon.png" alt="WAU" className="w-12 h-12 object-contain animate-pulse" />
          <p className="text-sm text-gray-400">Cargando...</p>
        </div>
      </div>
    }>
      <Routes>
      <Route path="/" element={<LandingRedirect />} />
      <Route path="/manual-prospeccion" element={<AgroGuiaRoute />} />
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
      <Route path="/pres/:token" element={<PresentationPublicView />} />
      <Route path="/checkin/:token" element={<CheckinPublicForm />} />
      <Route path="/playbook/s/:token" element={<PlaybookPublicView />} />
      <Route path="/quiz/:token" element={<QuizPlay />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* General / OKR Routes */}
        <Route path="/home" element={<HomeRedirect />} />
        <Route path="/dashboard" element={<TableroControl />} />
        <Route path="/okrs" element={<OKRClientsHub />} />
        <Route path="/okrs/internal" element={<Dashboard scope="internal" />} />
        <Route path="/okrs/clients/:clientId" element={<Dashboard />} />
        <Route path="/okrs/objectives/:id" element={<ObjectiveDetail />} />
        <Route path="/okrs/initiatives" element={<OKRInitiatives />} />
        <Route path="/tareas" element={<TaskBoard />} />
        <Route path="/gestion" element={<TaskBoard />} />

        {/* Finance Routes */}
        <Route path="/finance" element={<FinanceDashboard />} />
        <Route path="/projects/clients" element={<Clients />} />
        <Route path="/projects/clients/new" element={<ClientForm />} />
        <Route path="/projects/clients/:id" element={<ClientDetail />} />
        <Route path="/projects/clients/:id/edit" element={<ClientFormKeyed />} />
        <Route path="/finance/invoices" element={<Invoices />} />
        <Route path="/finance/invoices/new" element={<InvoiceFormKeyed />} />
        <Route path="/finance/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/finance/invoices/:id/edit" element={<InvoiceFormKeyed />} />
        <Route path="/finance/cash-flow" element={<CashFlow />} />
        <Route path="/finance/saldos" element={<Saldos />} />
        {/* ARCA Routes */}
        <Route path="/finance/arca" element={<ArcaConfig />} />
        <Route path="/finance/arca/puntos-venta" element={<ArcaPuntosVenta />} />
        <Route path="/finance/arca/invoices" element={<ArcaInvoices />} />

        {/* Project Routes */}
        <Route path="/projects" element={<ProjectsDashboard />} />
        <Route path="/projects/list" element={<ProjectsList />} />
        <Route path="/projects/new" element={<ProjectFormKeyed />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/projects/:id/edit" element={<ProjectFormKeyed />} />
        {/* Portal (client users) */}
        <Route path="/portal" element={<ClientPortal />} />
        <Route path="/portal/okrs" element={<PortalOKRs />} />
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
        <Route path="/crm/leads/new" element={<LeadFormKeyed />} />
        <Route path="/crm/leads/:id" element={<LeadDetail />} />
        <Route path="/crm/leads/:id/edit" element={<LeadFormKeyed />} />
        <Route path="/crm/pipeline" element={<DealPipeline />} />
        <Route path="/crm/deals/new" element={<DealFormKeyed />} />
        <Route path="/crm/deals/:id" element={<DealDetail />} />
        <Route path="/crm/deals/:id/edit" element={<DealFormKeyed />} />
        <Route path="/crm/activities" element={<ActivityList />} />
        {/* Proposal Routes */}
        <Route path="/proposals" element={<ProposalsDashboard />} />
        <Route path="/proposals/new" element={<ProposalFormKeyed />} />
        <Route path="/proposals/:id" element={<ProposalDetail />} />
        <Route path="/proposals/:id/edit" element={<ProposalFormKeyed />} />
        <Route path="/proposals/:id/slides" element={<ProposalSlideEditor />} />
        {/* Presentation Routes */}
        <Route path="/presentations" element={<PresentationsDashboard />} />
        <Route path="/presentations/new" element={<PresentationFormKeyed />} />
        <Route path="/presentations/:id" element={<PresentationDetail />} />
        <Route path="/presentations/:id/edit" element={<PresentationFormKeyed />} />
        {/* Check-in Routes */}
        <Route path="/checkins" element={<CheckinDashboard />} />
        <Route path="/checkins/plantillas" element={<CheckinPlantillas />} />
        <Route path="/checkins/config/:projectId" element={<CheckinConfigPage />} />
        <Route path="/checkins/history/:projectId" element={<CheckinHistory />} />
        <Route path="/checkins/:id" element={<CheckinDetail />} />
        <Route path="/encuentros/nuevo" element={<EncuentroNuevo />} />
        {/* Quiz Routes */}
        <Route path="/quizzes" element={<QuizDashboard />} />
        <Route path="/quizzes/new" element={<QuizFormKeyed />} />
        <Route path="/quizzes/:id" element={<QuizDetail />} />
        <Route path="/quizzes/:id/edit" element={<QuizFormKeyed />} />
        <Route path="/quizzes/:id/live" element={<QuizLive />} />
        {/* Super Admin Routes */}
        <Route path="/super/organizations" element={<Organizations />} />
        <Route path="/super/users" element={<SuperUsers />} />
      </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster />
      <ConfirmDialogHost />
      <CommandPaletteHost />
    </BrowserRouter>
  );
}

export default App;
