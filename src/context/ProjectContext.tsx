import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase, getAccessTokenFresh } from '../lib/supabase';
import { fetchWithTimeout } from '../lib/fetchTimeout';
import { useAuth } from './AuthContext';
import { notify } from '../lib/notify';
import { todayLocalISO } from '../utils/helpers';
import type {
  Project,
  ProjectParticipant,
  ProjectDeliverable,
  ProjectModule,
  ModuleSession,
  ModuleTimeEntry,
  ModuleComment,
  ProjectDocument,
  ProjectActivityLog,
  ProjectPayment,
  ProjectNovedad,
  ModuleStatus,
  AlumniProfile,
  AttendanceSession,
  AttendanceRecord,
  NPSSurvey,
  NPSResponse,
  Product,
  ProductTemplateModule,
  ProductTemplateDeliverable,
  ProductTemplateObjective,
} from '../types/projects';

// Cast supabase client for project tables not yet in Database type
const db = supabase as any;

interface ProjectContextType {
  // State
  projects: Project[];
  currentProject: Project | null;
  participants: ProjectParticipant[];
  deliverables: ProjectDeliverable[];
  modules: ProjectModule[];
  documents: ProjectDocument[];
  activityLog: ProjectActivityLog[];
  loading: boolean;
  error: string | null;

  // Projects
  fetchProjects: () => Promise<void>;
  addProject: (data: Omit<Project, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getProject: (id: string) => Promise<Project | null>;

  // Participants
  fetchParticipants: (projectId: string) => Promise<void>;
  addParticipant: (data: Omit<ProjectParticipant, 'id' | 'createdAt'>) => Promise<ProjectParticipant | null>;
  updateParticipantRole: (id: string, role: string) => Promise<void>;
  removeParticipant: (id: string) => Promise<void>;

  // Deliverables
  fetchDeliverables: (projectId: string) => Promise<void>;
  addDeliverable: (data: Omit<ProjectDeliverable, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ProjectDeliverable | null>;
  updateDeliverable: (id: string, updates: Partial<ProjectDeliverable>) => Promise<void>;
  deleteDeliverable: (id: string) => Promise<void>;

  // Modules
  fetchModules: (projectId: string) => Promise<void>;
  addModule: (data: Omit<ProjectModule, 'id' | 'createdAt' | 'updatedAt' | 'totalHoursLogged' | 'sessions'>) => Promise<ProjectModule | null>;
  updateModule: (id: string, updates: Partial<ProjectModule>) => Promise<void>;
  completeModule: (moduleId: string) => Promise<void>;
  deleteModule: (id: string) => Promise<void>;

  // Module Sessions
  addModuleSession: (data: Omit<ModuleSession, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ModuleSession | null>;
  updateModuleSession: (id: string, updates: Partial<ModuleSession>) => Promise<void>;
  completeModuleSession: (id: string) => Promise<void>;
  deleteModuleSession: (id: string) => Promise<void>;

  // Time Entries
  fetchTimeEntries: (moduleId: string) => Promise<ModuleTimeEntry[]>;
  addTimeEntry: (data: Omit<ModuleTimeEntry, 'id' | 'createdAt'>) => Promise<ModuleTimeEntry | null>;
  deleteTimeEntry: (id: string) => Promise<void>;

  // Comments
  fetchComments: (moduleId: string) => Promise<ModuleComment[]>;
  addComment: (data: Omit<ModuleComment, 'id' | 'createdAt'>) => Promise<ModuleComment | null>;

  // Documents
  fetchDocuments: (projectId: string) => Promise<void>;
  addDocument: (data: Omit<ProjectDocument, 'id' | 'createdAt'>) => Promise<ProjectDocument | null>;
  updateDocument: (id: string, updates: Partial<ProjectDocument>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;

  // Activity Log
  fetchActivityLog: (projectId: string) => Promise<void>;
  logActivity: (projectId: string, action: string, entityType: string, entityId?: string, details?: Record<string, any>) => Promise<void>;

  // Alumni Profiles
  alumniProfile: AlumniProfile | null;
  fetchAlumniProfile: (projectId: string, userId: string) => Promise<AlumniProfile | null>;
  saveAlumniProfile: (data: Omit<AlumniProfile, 'id' | 'completedAt' | 'updatedAt'>) => Promise<AlumniProfile | null>;
  fetchAllAlumniProfiles: (projectId: string) => Promise<AlumniProfile[]>;

  // Novedades
  novedades: ProjectNovedad[];
  fetchNovedades: (projectId: string) => Promise<void>;
  addNovedad: (projectId: string, content: string) => Promise<ProjectNovedad>;
  updateNovedad: (id: string, content: string) => Promise<void>;
  deleteNovedad: (id: string) => Promise<void>;
  togglePinNovedad: (id: string, pinned: boolean) => Promise<void>;

  // Attendance
  attendanceSessions: AttendanceSession[];
  fetchAttendanceSessions: (projectId: string) => Promise<void>;
  fetchAttendanceRecords: (sessionId: string) => Promise<AttendanceRecord[]>;
  createAttendanceSession: (data: Omit<AttendanceSession, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AttendanceSession | null>;
  deleteAttendanceSession: (id: string) => Promise<void>;
  markAttendance: (sessionId: string, records: { participantId: string; present: boolean; notes?: string }[]) => Promise<void>;

  // Payments
  payments: ProjectPayment[];
  fetchPayments: (projectId: string) => Promise<void>;
  generatePayments: (projectId: string) => Promise<void>;
  markPaymentPaid: (id: string, paidDate?: string) => Promise<void>;
  markPaymentPending: (id: string) => Promise<void>;
  updatePaymentPaidDate: (id: string, paidDate: string) => Promise<void>;
  updatePaymentAmount: (id: string, amount: number) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  linkPaymentInvoice: (paymentId: string, invoiceId: string) => Promise<void>;
  fetchAllPayments: () => Promise<(ProjectPayment & { projectName: string; clientId?: string })[]>;

  // NPS
  npsSurveys: NPSSurvey[];
  fetchNPSSurveys: (projectId: string) => Promise<void>;
  createNPSSurvey: (projectId: string, sessionTitle: string) => Promise<NPSSurvey | null>;
  deleteNPSSurvey: (id: string) => Promise<void>;
  toggleNPSSurveyActive: (id: string, isActive: boolean) => Promise<void>;
  fetchNPSResponses: (surveyId: string) => Promise<NPSResponse[]>;

  // Products
  products: Product[];
  fetchProducts: () => Promise<void>;
  addProduct: (name: string, description: string | null) => Promise<Product | null>;
  updateProduct: (id: string, updates: Partial<Pick<Product, 'name' | 'description'>>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  fetchProductTemplateModules: (productId: string) => Promise<ProductTemplateModule[]>;
  addProductTemplateModule: (productId: string, title: string, description: string | null, sortOrder: number) => Promise<ProductTemplateModule | null>;
  updateProductTemplateModule: (id: string, updates: Partial<Pick<ProductTemplateModule, 'title' | 'description' | 'sortOrder'>>) => Promise<void>;
  deleteProductTemplateModule: (id: string) => Promise<void>;
  applyProductToProject: (productId: string, projectId: string) => Promise<void>;
  rescheduleModulesWeekly: (projectId: string) => Promise<void>;

  // Template Deliverables
  fetchTemplateDeliverables: (templateModuleId: string) => Promise<ProductTemplateDeliverable[]>;
  addTemplateDeliverable: (templateModuleId: string, name: string, description: string | null, sortOrder: number) => Promise<ProductTemplateDeliverable | null>;
  updateTemplateDeliverable: (id: string, updates: Partial<Pick<ProductTemplateDeliverable, 'name' | 'description' | 'sortOrder'>>) => Promise<void>;
  deleteTemplateDeliverable: (id: string) => Promise<void>;

  // Template Objectives
  fetchTemplateObjectives: (templateModuleId: string) => Promise<ProductTemplateObjective[]>;
  addTemplateObjective: (templateModuleId: string, text: string, sortOrder: number) => Promise<ProductTemplateObjective | null>;
  updateTemplateObjective: (id: string, updates: Partial<Pick<ProductTemplateObjective, 'text' | 'sortOrder'>>) => Promise<void>;
  deleteTemplateObjective: (id: string) => Promise<void>;

  // Aggregated NPS
  fetchAggregatedNPS: (productName: string) => Promise<Record<string, { avg: number; nps: number; promoters: number; passives: number; detractors: number; total: number }>>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { organization, appUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [participants, setParticipants] = useState<ProjectParticipant[]>([]);
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([]);
  const [modules, setModules] = useState<ProjectModule[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [activityLog, setActivityLog] = useState<ProjectActivityLog[]>([]);
  const [alumniProfile, setAlumniProfile] = useState<AlumniProfile | null>(null);
  const [novedades, setNovedades] = useState<ProjectNovedad[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [npsSurveys, setNpsSurveys] = useState<NPSSurvey[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [payments, setPayments] = useState<ProjectPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== ACTIVITY LOG (helper, defined first so other functions can reference it) =====

  const logActivity = useCallback(async (
    projectId: string,
    action: string,
    entityType: string,
    entityId?: string,
    details?: Record<string, any>,
  ) => {
    if (!appUser?.id) return;
    try {
      const { error: err } = await db
        .from('project_activity_log')
        .insert({
          project_id: projectId,
          user_id: appUser.id,
          action,
          entity_type: entityType,
          entity_id: entityId || null,
          details: details || null,
        });

      if (err) throw err;
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  }, [appUser?.id]);

  // ===== PAYMENT GENERATION HELPER (defined early so addProject/updateProject can use it) =====

  const generatePaymentsForProject = useCallback(async (
    projectId: string,
    startDate: string,
    estimatedEndDate: string,
    monthlyFee: number,
  ) => {
    const start = new Date(startDate.substring(0, 10) + 'T00:00:00');
    const end = new Date(estimatedEndDate.substring(0, 10) + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    if (start > end) return;

    // Calculate number of cuotas based on project duration in months
    // A project from Feb 15 to Jun 15 = 4 months = 4 cuotas
    const daysBetween = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    const count = Math.max(1, Math.round(daysBetween / 30));

    // Generate cuotas starting from the start month
    const months: string[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    for (let i = 0; i < count; i++) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      months.push(`${yyyy}-${mm}`);
      current.setMonth(current.getMonth() + 1);
    }

    if (months.length === 0) return;

    const { data: existing } = await db
      .from('project_payments')
      .select('month')
      .eq('project_id', projectId);

    const existingMonths = new Set((existing || []).map((p: any) => p.month));
    const newMonths = months.filter(m => !existingMonths.has(m));

    if (newMonths.length === 0) return;

    const rows = newMonths.map(month => ({
      project_id: projectId,
      month,
      amount: monthlyFee,
      status: 'pending',
    }));

    const { error: err } = await db
      .from('project_payments')
      .insert(rows);

    if (err) throw err;
  }, []);

  // ===== PROJECTS =====

  const fetchProjects = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const { data, error: err } = await db
        .from('projects')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (err) throw err;

      // Fetch client names
      const clientIds = [...new Set((data || []).map((p: any) => p.client_id).filter(Boolean))];
      let clientMap: Record<string, string> = {};
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientErr } = await db
          .from('clients')
          .select('id, name')
          .in('id', clientIds);

        if (clientErr) throw clientErr;
        clientMap = (clientsData || []).reduce((acc: Record<string, string>, c: any) => {
          acc[c.id] = c.name;
          return acc;
        }, {});
      }

      setProjects((data || []).map((p: any) => ({
        id: p.id,
        organizationId: p.organization_id,
        clientId: p.client_id,
        clientName: p.client_id ? clientMap[p.client_id] : undefined,
        name: p.name,
        description: p.description,
        status: p.status,
        ownerId: p.owner_id,
        product: p.product,
        monthlyFee: p.monthly_fee,
        budget: p.budget,
        estimatedCost: p.estimated_cost,
        startDate: p.start_date,
        estimatedEndDate: p.estimated_end_date,
        actualEndDate: p.actual_end_date,
        notes: p.notes,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const addProject = useCallback(async (data: Omit<Project, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): Promise<Project | null> => {
    if (!organization?.id) return null;
    try {
      const { data: row, error: err } = await db
        .from('projects')
        .insert({
          organization_id: organization.id,
          client_id: data.clientId || null,
          name: data.name,
          description: data.description || null,
          status: data.status,
          owner_id: data.ownerId || null,
          product: data.product || null,
          monthly_fee: data.monthlyFee || null,
          budget: data.budget || null,
          estimated_cost: data.estimatedCost || null,
          start_date: data.startDate || null,
          estimated_end_date: data.estimatedEndDate || null,
          actual_end_date: data.actualEndDate || null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo crear el proyecto');

      const newProject: Project = {
        id: row.id,
        organizationId: row.organization_id,
        clientId: row.client_id,
        clientName: data.clientName,
        name: row.name,
        description: row.description,
        status: row.status,
        ownerId: row.owner_id,
        product: row.product,
        monthlyFee: row.monthly_fee,
        budget: row.budget,
        estimatedCost: row.estimated_cost,
        startDate: row.start_date,
        estimatedEndDate: row.estimated_end_date,
        actualEndDate: row.actual_end_date,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setProjects(prev => [newProject, ...prev]);

      // Auto-generate payments for new projects (any non-cancelled status)
      const endForNewPayments = (() => {
        const est = newProject.estimatedEndDate || '';
        const act = newProject.actualEndDate || '';
        if (est && act) return est > act ? est : act;
        return est || act;
      })();
      if (newProject.status !== 'cancelled' && newProject.monthlyFee && newProject.startDate && endForNewPayments) {
        try {
          await generatePaymentsForProject(newProject.id, newProject.startDate, endForNewPayments, newProject.monthlyFee);
        } catch (err) {
          console.error('Error auto-generating payments:', err);
        }
      }

      return newProject;
    } catch (err) {
      console.error('Error adding project:', err);
      setError('Error al crear proyecto');
      return null;
    }
  }, [organization?.id, generatePaymentsForProject]);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId || null;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description || null;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.ownerId !== undefined) dbUpdates.owner_id = updates.ownerId || null;
      if (updates.product !== undefined) dbUpdates.product = updates.product || null;
      if (updates.monthlyFee !== undefined) dbUpdates.monthly_fee = updates.monthlyFee || null;
      if (updates.budget !== undefined) dbUpdates.budget = updates.budget || null;
      if (updates.estimatedCost !== undefined) dbUpdates.estimated_cost = updates.estimatedCost || null;
      if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate || null;
      if (updates.estimatedEndDate !== undefined) dbUpdates.estimated_end_date = updates.estimatedEndDate || null;
      if (updates.actualEndDate !== undefined) dbUpdates.actual_end_date = updates.actualEndDate || null;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;

      const { error: err } = await db
        .from('projects')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;

      const updatedProject = { ...(projects.find(p => p.id === id) || currentProject), ...updates } as Project;
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      if (currentProject?.id === id) {
        setCurrentProject(prev => prev ? { ...prev, ...updates } : prev);
      }

      // Auto-generate payments when fee and dates are available (any non-cancelled status)
      // Use the later of estimatedEndDate / actualEndDate so both fields work
      const endForPayments = (() => {
        const est = updatedProject.estimatedEndDate || '';
        const act = updatedProject.actualEndDate || '';
        if (est && act) return est > act ? est : act;
        return est || act;
      })();
      if (updatedProject.status !== 'cancelled' && updatedProject.monthlyFee && updatedProject.startDate && endForPayments) {
        try {
          await generatePaymentsForProject(id, updatedProject.startDate, endForPayments, updatedProject.monthlyFee);
          // Refresh payments state
          const { data: payData } = await db
            .from('project_payments')
            .select('*')
            .eq('project_id', id)
            .order('month');
          if (payData) {
            setPayments(payData.map((p: any) => ({
              id: p.id,
              projectId: p.project_id,
              month: p.month,
              amount: p.amount,
              status: p.status,
              paidDate: p.paid_date,
              invoiceId: p.invoice_id,
              notes: p.notes,
              createdAt: p.created_at,
            })));
          }
        } catch (err) {
          console.error('Error auto-generating payments:', err);
        }
      }
    } catch (err) {
      console.error('Error updating project:', err);
      setError('Error al actualizar proyecto');
    }
  }, [currentProject?.id, projects, generatePaymentsForProject]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('projects')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setProjects(prev => prev.filter(p => p.id !== id));
      if (currentProject?.id === id) {
        setCurrentProject(null);
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Error al eliminar proyecto');
    }
  }, [currentProject?.id]);

  const getProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      const { data, error: err } = await db
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (err) throw err;

      let clientName: string | undefined;
      if (data.client_id) {
        const { data: clientData } = await db
          .from('clients')
          .select('name')
          .eq('id', data.client_id)
          .single();
        clientName = clientData?.name;
      }

      const project: Project = {
        id: data.id,
        organizationId: data.organization_id,
        clientId: data.client_id,
        clientName,
        name: data.name,
        description: data.description,
        status: data.status,
        ownerId: data.owner_id,
        monthlyFee: data.monthly_fee,
        budget: data.budget,
        estimatedCost: data.estimated_cost,
        startDate: data.start_date,
        estimatedEndDate: data.estimated_end_date,
        actualEndDate: data.actual_end_date,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setCurrentProject(project);
      return project;
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Error al cargar proyecto');
      setCurrentProject(null);
      return null;
    }
  }, []);

  // ===== PARTICIPANTS =====

  const fetchParticipants = useCallback(async (projectId: string) => {
    try {
      const { data, error: err } = await db
        .from('project_participants')
        .select('*')
        .eq('project_id', projectId);

      if (err) throw err;

      // Fetch user names and emails
      const userIds = [...new Set((data || []).map((p: any) => p.user_id).filter(Boolean))];
      let userMap: Record<string, { name: string; email: string }> = {};
      if (userIds.length > 0) {
        const { data: usersData, error: userErr } = await db
          .from('users')
          .select('id, full_name, email, phone')
          .in('id', userIds);

        if (userErr) throw userErr;
        userMap = (usersData || []).reduce((acc: Record<string, { name: string; email: string; phone: string | null }>, u: any) => {
          acc[u.id] = { name: u.full_name, email: u.email, phone: u.phone };
          return acc;
        }, {});
      }

      setParticipants((data || []).map((p: any) => ({
        id: p.id,
        projectId: p.project_id,
        userId: p.user_id,
        userName: userMap[p.user_id]?.name,
        userEmail: userMap[p.user_id]?.email,
        userPhone: userMap[p.user_id]?.phone || undefined,
        role: p.role,
        hourlyRate: p.hourly_rate,
        allocatedHours: p.allocated_hours,
        createdAt: p.created_at,
      })));
    } catch (err) {
      console.error('Error fetching participants:', err);
      setError('Error al cargar participantes');
    }
  }, []);

  const addParticipant = useCallback(async (data: Omit<ProjectParticipant, 'id' | 'createdAt'>): Promise<ProjectParticipant | null> => {
    try {
      let userId = data.userId;
      let isNewUser = false;
      const email = data.userEmail?.trim().toLowerCase() || '';

      // If no userId but we have email, look up or create user
      if ((!userId || userId === '') && email) {
        const { data: existing } = await db
          .from('users')
          .select('id')
          .ilike('email', email)
          .maybeSingle();

        if (existing) {
          userId = existing.id;
        } else {
          isNewUser = true;
          const defaultPassword = 'WAU2026';

          // Try serverless function first, fallback to Supabase signUp
          const token = await getAccessTokenFresh();

          let created = false;
          try {
            const res = await fetchWithTimeout('/api/create-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                email,
                password: defaultPassword,
                fullName: data.userName || email.split('@')[0],
                organizationId: organization?.id,
              }),
            });

            const text = await res.text();
            if (text) {
              const result = JSON.parse(text);
              if (res.ok) {
                userId = result.userId;
                created = true;
              }
            }
          } catch {
            // API not available (local dev), fallback below
          }

          if (!created) {
            // Fallback: use isolated Supabase client so we don't change current session
            const tempClient = createClient(
              import.meta.env.VITE_SUPABASE_URL,
              import.meta.env.VITE_SUPABASE_ANON_KEY,
              { auth: { autoRefreshToken: false, persistSession: false } }
            );

            const { data: signUpData, error: signUpErr } = await tempClient.auth.signUp({
              email,
              password: defaultPassword,
              options: { data: { full_name: data.userName || email.split('@')[0] } },
            });
            if (signUpErr) throw new Error(signUpErr.message);
            if (!signUpData.user) throw new Error('No se pudo crear el usuario');
            userId = signUpData.user.id;

            // Wait for trigger, then upsert user row
            await new Promise(r => setTimeout(r, 500));
            await db.from('users').upsert({
              id: userId,
              email,
              full_name: data.userName || email.split('@')[0],
              organization_id: organization?.id,
              role: 'member',
              user_type: 'consultant',
            }, { onConflict: 'id' });
          }
        }
      }

      const { data: rows, error: insertErr } = await db
        .from('project_participants')
        .insert({
          project_id: data.projectId,
          user_id: userId,
          role: data.role,
          hourly_rate: data.hourlyRate,
          allocated_hours: data.allocatedHours,
        })
        .select();

      if (insertErr) throw insertErr;
      if (!rows || rows.length === 0) throw new Error('Insert returned no rows');

      const row = rows[0];
      const newParticipant: ProjectParticipant = {
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        userName: data.userName,
        userEmail: data.userEmail,
        role: row.role,
        hourlyRate: row.hourly_rate,
        allocatedHours: row.allocated_hours,
        createdAt: row.created_at,
      };

      setParticipants(prev => [...prev, newParticipant]);

      // Notify the added user
      if (newParticipant.userId && newParticipant.userId !== appUser?.id && organization?.id) {
        const project = projects.find(p => p.id === data.projectId);
        notify({
          organizationId: organization.id,
          userId: newParticipant.userId,
          type: 'project_update',
          title: `Te agregaron al proyecto: ${project?.name || 'Proyecto'}`,
          entityType: 'project',
          entityId: data.projectId,
          actionUrl: `/projects/${data.projectId}`,
        });
      }

      return { ...newParticipant, isNewUser } as any;
    } catch (err: any) {
      const msg = err?.message || err?.details || JSON.stringify(err);
      console.error('Error adding participant:', msg, err);
      setError('Error al agregar participante: ' + msg);
      throw err;
    }
  }, [organization?.id, appUser?.id, projects]);

  const removeParticipant = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('project_participants')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setParticipants(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error removing participant:', err);
      setError('Error al eliminar participante');
    }
  }, []);

  const updateParticipantRole = useCallback(async (id: string, role: string) => {
    try {
      const { error: err } = await db
        .from('project_participants')
        .update({ role })
        .eq('id', id);

      if (err) throw err;
      setParticipants(prev => prev.map(p => p.id === id ? { ...p, role: role as any } : p));
    } catch (err) {
      console.error('Error updating participant:', err);
      setError('Error al actualizar participante');
    }
  }, []);

  // ===== DELIVERABLES =====

  const fetchDeliverables = useCallback(async (projectId: string) => {
    try {
      const { data, error: err } = await db
        .from('project_deliverables')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');

      if (err) throw err;

      // Fetch responsible names
      const responsibleIds = [...new Set((data || []).map((d: any) => d.responsible_id).filter(Boolean))];
      let userMap: Record<string, string> = {};
      if (responsibleIds.length > 0) {
        const { data: usersData, error: userErr } = await db
          .from('users')
          .select('id, full_name')
          .in('id', responsibleIds);

        if (userErr) throw userErr;
        userMap = (usersData || []).reduce((acc: Record<string, string>, u: any) => {
          acc[u.id] = u.full_name;
          return acc;
        }, {});
      }

      setDeliverables((data || []).map((d: any) => ({
        id: d.id,
        projectId: d.project_id,
        name: d.name,
        description: d.description,
        dueDate: d.due_date,
        actualDeliveryDate: d.actual_delivery_date,
        status: d.status,
        responsibleId: d.responsible_id,
        responsibleName: d.responsible_id ? userMap[d.responsible_id] : undefined,
        attachments: d.attachments || [],
        invoiceAmount: d.invoice_amount,
        acceptanceCriteria: d.acceptance_criteria || [],
        clientFeedback: d.client_feedback,
        sortOrder: d.sort_order,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching deliverables:', err);
      setError('Error al cargar entregables');
    }
  }, []);

  const addDeliverable = useCallback(async (data: Omit<ProjectDeliverable, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectDeliverable | null> => {
    try {
      const { data: row, error: err } = await db
        .from('project_deliverables')
        .insert({
          project_id: data.projectId,
          name: data.name,
          description: data.description,
          due_date: data.dueDate,
          actual_delivery_date: data.actualDeliveryDate,
          status: data.status,
          responsible_id: data.responsibleId,
          attachments: data.attachments,
          invoice_amount: data.invoiceAmount,
          acceptance_criteria: data.acceptanceCriteria,
          client_feedback: data.clientFeedback,
          sort_order: data.sortOrder,
        })
        .select()
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo crear el entregable');

      const newDeliverable: ProjectDeliverable = {
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        description: row.description,
        dueDate: row.due_date,
        actualDeliveryDate: row.actual_delivery_date,
        status: row.status,
        responsibleId: row.responsible_id,
        responsibleName: data.responsibleName,
        attachments: row.attachments || [],
        invoiceAmount: row.invoice_amount,
        acceptanceCriteria: row.acceptance_criteria || [],
        clientFeedback: row.client_feedback,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setDeliverables(prev => [...prev, newDeliverable]);
      return newDeliverable;
    } catch (err) {
      console.error('Error adding deliverable:', err);
      setError('Error al crear entregable');
      return null;
    }
  }, []);

  const updateDeliverable = useCallback(async (id: string, updates: Partial<ProjectDeliverable>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.actualDeliveryDate !== undefined) dbUpdates.actual_delivery_date = updates.actualDeliveryDate;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.responsibleId !== undefined) dbUpdates.responsible_id = updates.responsibleId;
      if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;
      if (updates.invoiceAmount !== undefined) dbUpdates.invoice_amount = updates.invoiceAmount;
      if (updates.acceptanceCriteria !== undefined) dbUpdates.acceptance_criteria = updates.acceptanceCriteria;
      if (updates.clientFeedback !== undefined) dbUpdates.client_feedback = updates.clientFeedback;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

      const { error: err } = await db
        .from('project_deliverables')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;

      setDeliverables(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    } catch (err) {
      console.error('Error updating deliverable:', err);
      setError('Error al actualizar entregable');
    }
  }, []);

  const deleteDeliverable = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('project_deliverables')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setDeliverables(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Error deleting deliverable:', err);
      setError('Error al eliminar entregable');
    }
  }, []);

  // ===== MODULES =====

  const fetchModules = useCallback(async (projectId: string) => {
    try {
      const { data, error: err } = await db
        .from('project_modules')
        .select('*')
        .eq('project_id', projectId);

      if (err) throw err;

      // Fetch deliverable names
      const deliverableIds = [...new Set((data || []).map((m: any) => m.deliverable_id).filter(Boolean))];
      let deliverableMap: Record<string, string> = {};
      if (deliverableIds.length > 0) {
        const { data: delData, error: delErr } = await db
          .from('project_deliverables')
          .select('id, name')
          .in('id', deliverableIds);

        if (delErr) throw delErr;
        deliverableMap = (delData || []).reduce((acc: Record<string, string>, d: any) => {
          acc[d.id] = d.name;
          return acc;
        }, {});
      }

      // Compute total hours logged per module
      const moduleIds = (data || []).map((m: any) => m.id);
      let hoursMap: Record<string, number> = {};
      if (moduleIds.length > 0) {
        const { data: timeData, error: timeErr } = await db
          .from('module_time_entries')
          .select('module_id, hours')
          .in('module_id', moduleIds);

        if (timeErr) throw timeErr;
        hoursMap = (timeData || []).reduce((acc: Record<string, number>, e: any) => {
          acc[e.module_id] = (acc[e.module_id] || 0) + e.hours;
          return acc;
        }, {});
      }

      // Fetch sessions for all modules
      let sessionsMap: Record<string, ModuleSession[]> = {};
      if (moduleIds.length > 0) {
        const { data: sessData, error: sessErr } = await db
          .from('module_sessions')
          .select('*, nps_surveys(token)')
          .in('module_id', moduleIds)
          .order('sort_order', { ascending: true });

        if (!sessErr && sessData) {
          for (const s of sessData as any[]) {
            const session: ModuleSession = {
              id: s.id,
              moduleId: s.module_id,
              title: s.title,
              description: s.description,
              sessionDate: s.session_date,
              status: s.status,
              presentationUrl: s.presentation_url,
              videoUrl: s.video_url,
              supportMaterialUrl: s.support_material_url,
              npsSurveyId: s.nps_survey_id,
              npsToken: s.nps_surveys?.token || undefined,
              sortOrder: s.sort_order,
              completedAt: s.completed_at,
              createdAt: s.created_at,
              updatedAt: s.updated_at,
            };
            if (!sessionsMap[s.module_id]) sessionsMap[s.module_id] = [];
            sessionsMap[s.module_id].push(session);
          }
        }
      }

      setModules((data || []).map((m: any) => ({
        id: m.id,
        projectId: m.project_id,
        deliverableId: m.deliverable_id,
        deliverableName: m.deliverable_id ? deliverableMap[m.deliverable_id] : undefined,
        title: m.title,
        description: m.description,
        startDate: m.start_date,
        dueDate: m.due_date,
        status: m.status,
        completedAt: m.completed_at,
        completedBy: m.completed_by,
        subtasks: m.subtasks || [],
        sortOrder: m.sort_order,
        presentationUrl: m.presentation_url || null,
        taskUrl: m.task_url || null,
        videoUrl: m.video_url || null,
        supportMaterialUrl: m.support_material_url || null,
        sessions: sessionsMap[m.id] || [],
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        totalHoursLogged: hoursMap[m.id] || 0,
      })));
    } catch (err) {
      console.error('Error fetching modules:', err);
      setError('Error al cargar módulos');
    }
  }, []);

  const addModule = useCallback(async (data: Omit<ProjectModule, 'id' | 'createdAt' | 'updatedAt' | 'totalHoursLogged'>): Promise<ProjectModule | null> => {
    try {
      const { data: row, error: err } = await db
        .from('project_modules')
        .insert({
          project_id: data.projectId,
          deliverable_id: data.deliverableId,
          title: data.title,
          description: data.description,
          start_date: data.startDate,
          due_date: data.dueDate,
          status: data.status,
          completed_at: data.completedAt,
          completed_by: data.completedBy,
          subtasks: data.subtasks,
          sort_order: data.sortOrder,
          presentation_url: data.presentationUrl,
          task_url: data.taskUrl,
          video_url: data.videoUrl,
          support_material_url: data.supportMaterialUrl,
        })
        .select()
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo crear el módulo');

      const newModule: ProjectModule = {
        id: row.id,
        projectId: row.project_id,
        deliverableId: row.deliverable_id,
        deliverableName: data.deliverableName,
        title: row.title,
        description: row.description,
        startDate: row.start_date,
        dueDate: row.due_date,
        status: row.status,
        completedAt: row.completed_at,
        completedBy: row.completed_by,
        subtasks: row.subtasks || [],
        sortOrder: row.sort_order,
        presentationUrl: row.presentation_url || null,
        taskUrl: row.task_url || null,
        videoUrl: row.video_url || null,
        supportMaterialUrl: row.support_material_url || null,
        sessions: [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setModules(prev => [...prev, newModule]);

      await logActivity(data.projectId, 'created', 'module', row.id, { title: data.title });

      // Auto-create NPS survey for this module
      if (appUser?.id) {
        try {
          const { data: surveyRow } = await db
            .from('nps_surveys')
            .insert({
              project_id: data.projectId,
              session_title: data.title,
              created_by: appUser.id,
            })
            .select()
            .single();

          if (surveyRow) {
            setNpsSurveys(prev => [{
              id: surveyRow.id,
              projectId: surveyRow.project_id,
              sessionTitle: surveyRow.session_title,
              token: surveyRow.token,
              isActive: surveyRow.is_active,
              createdBy: surveyRow.created_by,
              createdAt: surveyRow.created_at,
            }, ...prev]);
          }
        } catch (npsErr) {
          console.error('Error auto-creating NPS survey:', npsErr);
        }
      }

      return newModule;
    } catch (err) {
      console.error('Error adding module:', err);
      setError('Error al crear módulo');
      return null;
    }
  }, [logActivity]);

  const updateModule = useCallback(async (id: string, updates: Partial<ProjectModule>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.deliverableId !== undefined) dbUpdates.deliverable_id = updates.deliverableId;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
      if (updates.completedBy !== undefined) dbUpdates.completed_by = updates.completedBy;
      if (updates.subtasks !== undefined) dbUpdates.subtasks = updates.subtasks;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      if (updates.presentationUrl !== undefined) dbUpdates.presentation_url = updates.presentationUrl;
      if (updates.taskUrl !== undefined) dbUpdates.task_url = updates.taskUrl;
      if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;
      if (updates.supportMaterialUrl !== undefined) dbUpdates.support_material_url = updates.supportMaterialUrl;

      const { error: err } = await db
        .from('project_modules')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;

      const mod = modules.find(m => m.id === id);
      setModules(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));

      if (mod) {
        await logActivity(mod.projectId, 'updated', 'module', id, { title: mod.title, updates: Object.keys(updates) });
      }
    } catch (err) {
      console.error('Error updating module:', err);
      setError('Error al actualizar módulo');
    }
  }, [modules, logActivity]);

  const completeModule = useCallback(async (moduleId: string) => {
    if (!appUser?.id) return;
    try {
      const now = new Date().toISOString();
      const { error: err } = await db
        .from('project_modules')
        .update({ status: 'completed' as ModuleStatus, completed_at: now, completed_by: appUser.id })
        .eq('id', moduleId);

      if (err) throw err;

      const mod = modules.find(m => m.id === moduleId);
      setModules(prev => prev.map(m => m.id === moduleId ? { ...m, status: 'completed' as ModuleStatus, completedAt: now, completedBy: appUser.id } : m));

      if (mod) {
        await logActivity(mod.projectId, 'status_changed', 'module', moduleId, { title: mod.title, from: mod.status, to: 'completed' });
      }
    } catch (err) {
      console.error('Error completing module:', err);
      setError('Error al completar módulo');
    }
  }, [modules, logActivity, appUser?.id]);

  const deleteModule = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('project_modules')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setModules(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Error deleting module:', err);
      setError('Error al eliminar módulo');
    }
  }, []);

  // ===== MODULE SESSIONS =====

  const addModuleSession = useCallback(async (data: Omit<ModuleSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModuleSession | null> => {
    try {
      const { data: row, error: err } = await db
        .from('module_sessions')
        .insert({
          module_id: data.moduleId,
          title: data.title,
          description: data.description,
          session_date: data.sessionDate,
          status: data.status || 'pending',
          presentation_url: data.presentationUrl,
          video_url: data.videoUrl,
          support_material_url: data.supportMaterialUrl,
          nps_survey_id: data.npsSurveyId,
          sort_order: data.sortOrder,
          completed_at: data.completedAt,
        })
        .select('*, nps_surveys(token)')
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo crear la sesión');

      const newSession: ModuleSession = {
        id: row.id,
        moduleId: row.module_id,
        title: row.title,
        description: row.description,
        sessionDate: row.session_date,
        status: row.status,
        presentationUrl: row.presentation_url,
        videoUrl: row.video_url,
        supportMaterialUrl: row.support_material_url,
        npsSurveyId: row.nps_survey_id,
        npsToken: row.nps_surveys?.token || undefined,
        sortOrder: row.sort_order,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setModules(prev => prev.map(m =>
        m.id === data.moduleId
          ? { ...m, sessions: [...(m.sessions || []), newSession] }
          : m
      ));

      return newSession;
    } catch (err) {
      console.error('Error adding module session:', err);
      setError('Error al crear sesión');
      return null;
    }
  }, []);

  const updateModuleSession = useCallback(async (id: string, updates: Partial<ModuleSession>) => {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.sessionDate !== undefined) dbUpdates.session_date = updates.sessionDate;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.presentationUrl !== undefined) dbUpdates.presentation_url = updates.presentationUrl;
      if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;
      if (updates.supportMaterialUrl !== undefined) dbUpdates.support_material_url = updates.supportMaterialUrl;
      if (updates.npsSurveyId !== undefined) dbUpdates.nps_survey_id = updates.npsSurveyId;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
      dbUpdates.updated_at = new Date().toISOString();

      const { error: err } = await db
        .from('module_sessions')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;

      setModules(prev => prev.map(m => ({
        ...m,
        sessions: (m.sessions || []).map(s =>
          s.id === id ? { ...s, ...updates, updatedAt: dbUpdates.updated_at } : s
        ),
      })));
    } catch (err) {
      console.error('Error updating module session:', err);
      setError('Error al actualizar sesión');
    }
  }, []);

  const completeModuleSession = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    try {
      const { error: err } = await db
        .from('module_sessions')
        .update({ status: 'completed', completed_at: now, updated_at: now })
        .eq('id', id);

      if (err) throw err;

      setModules(prev => prev.map(m => ({
        ...m,
        sessions: (m.sessions || []).map(s =>
          s.id === id ? { ...s, status: 'completed' as const, completedAt: now, updatedAt: now } : s
        ),
      })));
    } catch (err) {
      console.error('Error completing module session:', err);
      setError('Error al completar sesión');
    }
  }, []);

  const deleteModuleSession = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('module_sessions')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setModules(prev => prev.map(m => ({
        ...m,
        sessions: (m.sessions || []).filter(s => s.id !== id),
      })));
    } catch (err) {
      console.error('Error deleting module session:', err);
      setError('Error al eliminar sesión');
    }
  }, []);

  // ===== TIME ENTRIES =====

  const fetchTimeEntries = useCallback(async (moduleId: string): Promise<ModuleTimeEntry[]> => {
    try {
      const { data, error: err } = await db
        .from('module_time_entries')
        .select('*')
        .eq('module_id', moduleId);

      if (err) throw err;

      // Fetch user names
      const userIds = [...new Set((data || []).map((e: any) => e.user_id).filter(Boolean))];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: usersData, error: userErr } = await db
          .from('users')
          .select('id, full_name')
          .in('id', userIds);

        if (userErr) throw userErr;
        userMap = (usersData || []).reduce((acc: Record<string, string>, u: any) => {
          acc[u.id] = u.full_name;
          return acc;
        }, {});
      }

      return (data || []).map((e: any) => ({
        id: e.id,
        moduleId: e.module_id,
        userId: e.user_id,
        userName: userMap[e.user_id],
        hours: e.hours,
        description: e.description,
        date: e.date,
        createdAt: e.created_at,
      }));
    } catch (err) {
      console.error('Error fetching time entries:', err);
      setError('Error al cargar registros de tiempo');
      return [];
    }
  }, []);

  const addTimeEntry = useCallback(async (data: Omit<ModuleTimeEntry, 'id' | 'createdAt'>): Promise<ModuleTimeEntry | null> => {
    try {
      const { data: row, error: err } = await db
        .from('module_time_entries')
        .insert({
          module_id: data.moduleId,
          user_id: data.userId,
          hours: data.hours,
          description: data.description,
          date: data.date,
        })
        .select()
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo crear la entrada de tiempo');

      const newEntry: ModuleTimeEntry = {
        id: row.id,
        moduleId: row.module_id,
        userId: row.user_id,
        userName: data.userName,
        hours: row.hours,
        description: row.description,
        date: row.date,
        createdAt: row.created_at,
      };

      const mod = modules.find(m => m.id === data.moduleId);
      if (mod) {
        await logActivity(mod.projectId, 'time_logged', 'module', data.moduleId, { hours: data.hours, title: mod.title });
      }

      return newEntry;
    } catch (err) {
      console.error('Error adding time entry:', err);
      setError('Error al registrar tiempo');
      return null;
    }
  }, [modules, logActivity]);

  const deleteTimeEntry = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('module_time_entries')
        .delete()
        .eq('id', id);

      if (err) throw err;
    } catch (err) {
      console.error('Error deleting time entry:', err);
      setError('Error al eliminar registro de tiempo');
    }
  }, []);

  // ===== COMMENTS =====

  const fetchComments = useCallback(async (moduleId: string): Promise<ModuleComment[]> => {
    try {
      const { data, error: err } = await db
        .from('module_comments')
        .select('*')
        .eq('module_id', moduleId)
        .order('created_at');

      if (err) throw err;

      // Fetch user names
      const userIds = [...new Set((data || []).map((c: any) => c.user_id).filter(Boolean))];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: usersData, error: userErr } = await db
          .from('users')
          .select('id, full_name')
          .in('id', userIds);

        if (userErr) throw userErr;
        userMap = (usersData || []).reduce((acc: Record<string, string>, u: any) => {
          acc[u.id] = u.full_name;
          return acc;
        }, {});
      }

      return (data || []).map((c: any) => ({
        id: c.id,
        moduleId: c.module_id,
        userId: c.user_id,
        userName: userMap[c.user_id],
        content: c.content,
        createdAt: c.created_at,
      }));
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Error al cargar comentarios');
      return [];
    }
  }, []);

  const addComment = useCallback(async (data: Omit<ModuleComment, 'id' | 'createdAt'>): Promise<ModuleComment | null> => {
    try {
      const { data: row, error: err } = await db
        .from('module_comments')
        .insert({
          module_id: data.moduleId,
          user_id: data.userId,
          content: data.content,
        })
        .select()
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo crear el comentario');

      const newComment: ModuleComment = {
        id: row.id,
        moduleId: row.module_id,
        userId: row.user_id,
        userName: data.userName,
        content: row.content,
        createdAt: row.created_at,
      };

      const mod = modules.find(m => m.id === data.moduleId);
      if (mod) {
        await logActivity(mod.projectId, 'comment_added', 'module', data.moduleId, { title: mod.title });
      }

      return newComment;
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Error al agregar comentario');
      return null;
    }
  }, [modules, logActivity]);

  // ===== DOCUMENTS =====

  const fetchDocuments = useCallback(async (projectId: string) => {
    try {
      const { data, error: err } = await db
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (err) throw err;

      setDocuments((data || []).map((d: any) => ({
        id: d.id,
        projectId: d.project_id,
        title: d.title,
        type: d.type,
        date: d.date,
        url: d.url,
        notes: d.notes,
        actionItems: d.action_items || [],
        createdAt: d.created_at,
      })));
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Error al cargar documentos');
    }
  }, []);

  const addDocument = useCallback(async (data: Omit<ProjectDocument, 'id' | 'createdAt'>): Promise<ProjectDocument | null> => {
    try {
      const { data: row, error: err } = await db
        .from('project_documents')
        .insert({
          project_id: data.projectId,
          title: data.title,
          type: data.type,
          date: data.date,
          url: data.url,
          notes: data.notes,
          action_items: data.actionItems,
        })
        .select()
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo crear el documento');

      const newDocument: ProjectDocument = {
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        type: row.type,
        date: row.date,
        url: row.url,
        notes: row.notes,
        actionItems: row.action_items || [],
        createdAt: row.created_at,
      };

      setDocuments(prev => [newDocument, ...prev]);

      await logActivity(data.projectId, 'document_added', 'document', row.id, { title: data.title });

      return newDocument;
    } catch (err) {
      console.error('Error adding document:', err);
      setError('Error al crear documento');
      return null;
    }
  }, [logActivity]);

  const updateDocument = useCallback(async (id: string, updates: Partial<ProjectDocument>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.url !== undefined) dbUpdates.url = updates.url;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.actionItems !== undefined) dbUpdates.action_items = updates.actionItems;

      const { error: err } = await db
        .from('project_documents')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;

      setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    } catch (err) {
      console.error('Error updating document:', err);
      setError('Error al actualizar documento');
    }
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('project_documents')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Error al eliminar documento');
    }
  }, []);

  // ===== ACTIVITY LOG =====

  const fetchActivityLog = useCallback(async (projectId: string) => {
    try {
      const { data, error: err } = await db
        .from('project_activity_log')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (err) throw err;

      // Fetch user names
      const userIds = [...new Set((data || []).map((a: any) => a.user_id).filter(Boolean))];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: usersData, error: userErr } = await db
          .from('users')
          .select('id, full_name')
          .in('id', userIds);

        if (userErr) throw userErr;
        userMap = (usersData || []).reduce((acc: Record<string, string>, u: any) => {
          acc[u.id] = u.full_name;
          return acc;
        }, {});
      }

      setActivityLog((data || []).map((a: any) => ({
        id: a.id,
        projectId: a.project_id,
        userId: a.user_id,
        userName: userMap[a.user_id],
        action: a.action,
        entityType: a.entity_type,
        entityId: a.entity_id,
        details: a.details,
        createdAt: a.created_at,
      })));
    } catch (err) {
      console.error('Error fetching activity log:', err);
      setError('Error al cargar historial de actividad');
    }
  }, []);

  // ===== ALUMNI PROFILES =====

  const mapAlumniRow = (row: any): AlumniProfile => ({
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    fullName: row.full_name,
    company: row.company,
    position: row.position,
    phone: row.phone,
    city: row.city,
    expectations: row.expectations,
    previousExperience: row.previous_experience,
    targetKpi: row.target_kpi,
    targetKpiCurrentValue: row.target_kpi_current_value,
    targetKpiGoalValue: row.target_kpi_goal_value,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  });

  const fetchAlumniProfile = useCallback(async (projectId: string, userId: string): Promise<AlumniProfile | null> => {
    try {
      const { data, error: err } = await db
        .from('alumni_profiles')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .maybeSingle();

      if (err) throw err;
      if (!data) {
        setAlumniProfile(null);
        return null;
      }

      const profile = mapAlumniRow(data);
      setAlumniProfile(profile);
      return profile;
    } catch (err) {
      console.error('Error fetching alumni profile:', err);
      return null;
    }
  }, []);

  const saveAlumniProfile = useCallback(async (data: Omit<AlumniProfile, 'id' | 'completedAt' | 'updatedAt'>): Promise<AlumniProfile | null> => {
    try {
      const { data: row, error: err } = await db
        .from('alumni_profiles')
        .upsert({
          project_id: data.projectId,
          user_id: data.userId,
          full_name: data.fullName,
          company: data.company,
          position: data.position,
          phone: data.phone,
          city: data.city,
          expectations: data.expectations,
          previous_experience: data.previousExperience,
          target_kpi: data.targetKpi,
          target_kpi_current_value: data.targetKpiCurrentValue,
          target_kpi_goal_value: data.targetKpiGoalValue,
        }, { onConflict: 'project_id,user_id' })
        .select()
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo guardar el perfil');

      const profile = mapAlumniRow(row);
      setAlumniProfile(profile);
      return profile;
    } catch (err) {
      console.error('Error saving alumni profile:', err);
      setError('Error al guardar perfil de alumno');
      return null;
    }
  }, []);

  const fetchAllAlumniProfiles = useCallback(async (projectId: string): Promise<AlumniProfile[]> => {
    try {
      const { data, error: err } = await db
        .from('alumni_profiles')
        .select('*')
        .eq('project_id', projectId)
        .order('completed_at', { ascending: false });

      if (err) throw err;
      return (data || []).map(mapAlumniRow);
    } catch (err) {
      console.error('Error fetching all alumni profiles:', err);
      return [];
    }
  }, []);

  // ===== NOVEDADES =====

  const fetchNovedades = useCallback(async (projectId: string) => {
    try {
      const { data, error: err } = await db
        .from('project_novedades')
        .select('*')
        .eq('project_id', projectId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (err) throw err;

      const rows = data || [];

      // Fetch user names
      const userIds = [...new Set(rows.map((n: any) => n.user_id))];
      const { data: users } = userIds.length > 0
        ? await db.from('users').select('id, full_name').in('id', userIds)
        : { data: [] };
      const userMap: Record<string, string> = {};
      for (const u of (users || [])) {
        userMap[u.id] = u.full_name;
      }

      setNovedades(rows.map((n: any) => ({
        id: n.id,
        projectId: n.project_id,
        userId: n.user_id,
        userName: userMap[n.user_id] || null,
        content: n.content,
        pinned: n.pinned || false,
        createdAt: n.created_at,
      })));
    } catch (err) {
      console.error('Error fetching novedades:', err);
    }
  }, []);

  const addNovedad = useCallback(async (projectId: string, content: string): Promise<ProjectNovedad> => {
    if (!appUser?.id) throw new Error('No user');

    const { data, error: err } = await db
      .from('project_novedades')
      .insert({
        project_id: projectId,
        user_id: appUser.id,
        content,
        pinned: false,
      })
      .select('*')
      .single();

    if (err) throw err;

    const novedad: ProjectNovedad = {
      id: data.id,
      projectId: data.project_id,
      userId: data.user_id,
      userName: appUser.fullName || null,
      content: data.content,
      pinned: data.pinned || false,
      createdAt: data.created_at,
    };

    setNovedades(prev => [novedad, ...prev]);
    await logActivity(projectId, 'created', 'novedad', novedad.id);
    return novedad;
  }, [appUser?.id, appUser?.fullName, logActivity]);

  const updateNovedad = useCallback(async (id: string, content: string) => {
    const { error: err } = await db
      .from('project_novedades')
      .update({ content })
      .eq('id', id);

    if (err) throw err;

    setNovedades(prev => prev.map(n => n.id === id ? { ...n, content } : n));
  }, []);

  const deleteNovedad = useCallback(async (id: string) => {
    const { error: err } = await db
      .from('project_novedades')
      .delete()
      .eq('id', id);

    if (err) throw err;

    setNovedades(prev => prev.filter(n => n.id !== id));
  }, []);

  const togglePinNovedad = useCallback(async (id: string, pinned: boolean) => {
    const { error: err } = await db
      .from('project_novedades')
      .update({ pinned })
      .eq('id', id);

    if (err) throw err;

    setNovedades(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, pinned } : n);
      // Re-sort: pinned first, then by date
      return updated.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });
  }, []);

  // ===== ATTENDANCE =====

  const fetchAttendanceSessions = useCallback(async (projectId: string) => {
    try {
      const { data, error: err } = await db
        .from('project_attendance_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('session_date', { ascending: false });

      if (err) throw err;

      setAttendanceSessions((data || []).map((s: any) => ({
        id: s.id,
        projectId: s.project_id,
        moduleId: s.module_id || null,
        sessionDate: s.session_date,
        sessionTitle: s.session_title,
        sessionDescription: s.session_description,
        createdBy: s.created_by,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching attendance sessions:', err);
    }
  }, []);

  const fetchAttendanceRecords = useCallback(async (sessionId: string): Promise<AttendanceRecord[]> => {
    try {
      const { data, error: err } = await db
        .from('attendance_records')
        .select('*')
        .eq('session_id', sessionId);

      if (err) throw err;

      return (data || []).map((r: any) => ({
        id: r.id,
        sessionId: r.session_id,
        participantId: r.participant_id,
        present: r.present,
        notes: r.notes,
        markedBy: r.marked_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch (err) {
      console.error('Error fetching attendance records:', err);
      return [];
    }
  }, []);

  const createAttendanceSession = useCallback(async (data: Omit<AttendanceSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<AttendanceSession | null> => {
    try {
      const { data: rows, error: err } = await db
        .from('project_attendance_sessions')
        .insert({
          project_id: data.projectId,
          module_id: data.moduleId || null,
          session_date: data.sessionDate,
          session_title: data.sessionTitle,
          session_description: data.sessionDescription,
          created_by: data.createdBy,
        })
        .select();

      if (err) throw err;
      if (!rows || rows.length === 0) throw new Error('No rows returned');

      const row = rows[0];
      const session: AttendanceSession = {
        id: row.id,
        projectId: row.project_id,
        moduleId: row.module_id || null,
        sessionDate: row.session_date,
        sessionTitle: row.session_title,
        sessionDescription: row.session_description,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setAttendanceSessions(prev => [session, ...prev]);
      return session;
    } catch (err) {
      console.error('Error creating attendance session:', err);
      throw err;
    }
  }, []);

  const deleteAttendanceSession = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('project_attendance_sessions')
        .delete()
        .eq('id', id);
      if (err) throw err;
      setAttendanceSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting attendance session:', err);
    }
  }, []);

  const markAttendance = useCallback(async (
    sessionId: string,
    records: { participantId: string; present: boolean; notes?: string }[]
  ) => {
    try {
      const { error: err } = await db
        .from('attendance_records')
        .upsert(
          records.map(r => ({
            session_id: sessionId,
            participant_id: r.participantId,
            present: r.present,
            notes: r.notes || null,
            marked_by: appUser?.id,
          })),
          { onConflict: 'session_id,participant_id' }
        );
      if (err) throw err;
    } catch (err) {
      console.error('Error marking attendance:', err);
      throw err;
    }
  }, [appUser?.id]);

  // ===== PAYMENTS =====

  const fetchPayments = useCallback(async (projectId: string) => {
    try {
      const { data, error: err } = await db
        .from('project_payments')
        .select('*')
        .eq('project_id', projectId)
        .order('month');

      if (err) throw err;

      setPayments((data || []).map((p: any) => ({
        id: p.id,
        projectId: p.project_id,
        month: p.month,
        amount: p.amount,
        status: p.status,
        paidDate: p.paid_date,
        invoiceId: p.invoice_id,
        notes: p.notes,
        createdAt: p.created_at,
      })));
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Error al cargar cuotas');
    }
  }, []);

  const generatePayments = useCallback(async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId) || currentProject;
      const endDate = (() => {
        const est = project?.estimatedEndDate || '';
        const act = project?.actualEndDate || '';
        if (est && act) return est > act ? est : act;
        return est || act;
      })();
      if (!project || !project.startDate || !endDate || !project.monthlyFee) {
        setError('El proyecto necesita fecha inicio, fecha fin y fee mensual para generar cuotas');
        return;
      }

      await generatePaymentsForProject(projectId, project.startDate, endDate, project.monthlyFee);
      await fetchPayments(projectId);
    } catch (err) {
      console.error('Error generating payments:', err);
      setError('Error al generar cuotas');
    }
  }, [projects, currentProject, fetchPayments, generatePaymentsForProject]);

  const markPaymentPaid = useCallback(async (id: string, paidDate?: string) => {
    try {
      const date = paidDate || todayLocalISO();
      const { error: err } = await db
        .from('project_payments')
        .update({ status: 'paid', paid_date: date })
        .eq('id', id);

      if (err) throw err;

      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'paid' as const, paidDate: date } : p));
    } catch (err) {
      console.error('Error marking payment paid:', err);
      setError('Error al marcar cuota como cobrada');
    }
  }, []);

  const updatePaymentPaidDate = useCallback(async (id: string, paidDate: string) => {
    try {
      const { error: err } = await db
        .from('project_payments')
        .update({ paid_date: paidDate })
        .eq('id', id);

      if (err) throw err;

      setPayments(prev => prev.map(p => p.id === id ? { ...p, paidDate } : p));
    } catch (err) {
      console.error('Error updating paid date:', err);
      setError('Error al actualizar fecha de cobro');
    }
  }, []);

  const markPaymentPending = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('project_payments')
        .update({ status: 'pending', paid_date: null })
        .eq('id', id);

      if (err) throw err;

      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'pending' as const, paidDate: null } : p));
    } catch (err) {
      console.error('Error marking payment pending:', err);
      setError('Error al marcar cuota como pendiente');
    }
  }, []);

  const updatePaymentAmount = useCallback(async (id: string, amount: number) => {
    try {
      const { error: err } = await db
        .from('project_payments')
        .update({ amount })
        .eq('id', id);
      if (err) throw err;
      setPayments(prev => prev.map(p => p.id === id ? { ...p, amount } : p));
    } catch (err) {
      console.error('Error updating payment amount:', err);
      setError('Error al actualizar monto');
    }
  }, []);

  const deletePayment = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('project_payments')
        .delete()
        .eq('id', id);
      if (err) throw err;
      setPayments(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting payment:', err);
      setError('Error al eliminar cuota');
    }
  }, []);

  // ===== NPS =====

  const fetchNPSSurveys = useCallback(async (projectId: string) => {
    try {
      const { data, error: err } = await db
        .from('nps_surveys')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (err) throw err;

      setNpsSurveys((data || []).map((s: any) => ({
        id: s.id,
        projectId: s.project_id,
        sessionTitle: s.session_title,
        token: s.token,
        isActive: s.is_active,
        createdBy: s.created_by,
        createdAt: s.created_at,
      })));
    } catch (err) {
      console.error('Error fetching NPS surveys:', err);
    }
  }, []);

  const createNPSSurvey = useCallback(async (projectId: string, sessionTitle: string): Promise<NPSSurvey | null> => {
    if (!appUser?.id) return null;
    try {
      const { data, error: err } = await db
        .from('nps_surveys')
        .insert({
          project_id: projectId,
          session_title: sessionTitle,
          created_by: appUser.id,
        })
        .select()
        .single();

      if (err) throw err;
      if (!data) throw new Error('No se pudo crear la encuesta NPS');

      const survey: NPSSurvey = {
        id: data.id,
        projectId: data.project_id,
        sessionTitle: data.session_title,
        token: data.token,
        isActive: data.is_active,
        createdBy: data.created_by,
        createdAt: data.created_at,
      };

      setNpsSurveys(prev => [survey, ...prev]);
      return survey;
    } catch (err) {
      console.error('Error creating NPS survey:', err);
      setError('Error al crear encuesta NPS');
      return null;
    }
  }, [appUser?.id]);

  const deleteNPSSurvey = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('nps_surveys')
        .delete()
        .eq('id', id);

      if (err) throw err;
      setNpsSurveys(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting NPS survey:', err);
      setError('Error al eliminar encuesta NPS');
    }
  }, []);

  const toggleNPSSurveyActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      const { error: err } = await db
        .from('nps_surveys')
        .update({ is_active: isActive })
        .eq('id', id);

      if (err) throw err;
      setNpsSurveys(prev => prev.map(s => s.id === id ? { ...s, isActive } : s));
    } catch (err) {
      console.error('Error toggling NPS survey:', err);
    }
  }, []);

  const fetchNPSResponses = useCallback(async (surveyId: string): Promise<NPSResponse[]> => {
    try {
      const { data, error: err } = await db
        .from('nps_responses')
        .select('*')
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false });

      if (err) throw err;

      return (data || []).map((r: any) => ({
        id: r.id,
        surveyId: r.survey_id,
        respondentName: r.respondent_name,
        score: r.score,
        liked: r.liked,
        improvement: r.improvement,
        createdAt: r.created_at,
      }));
    } catch (err) {
      console.error('Error fetching NPS responses:', err);
      return [];
    }
  }, []);

  const fetchAllPayments = useCallback(async (): Promise<(ProjectPayment & { projectName: string; clientId?: string })[]> => {
    try {
      const { data, error: err } = await db
        .from('project_payments')
        .select('*, projects(name, product, client_id, clients(name))')
        .order('month');

      if (err) throw err;

      return (data || []).map((p: any) => {
        const clientName = p.projects?.clients?.name || '';
        const product = p.projects?.product || '';
        const parts = [clientName, product].filter(Boolean);
        const displayName = parts.length > 0 ? parts.join(' | ') : (p.projects?.name || '');
        return {
        id: p.id,
        projectId: p.project_id,
        projectName: displayName,
        clientId: p.projects?.client_id || undefined,
        month: p.month,
        amount: p.amount,
        status: p.status,
        paidDate: p.paid_date,
        invoiceId: p.invoice_id,
        notes: p.notes,
        createdAt: p.created_at,
      };});
    } catch (err) {
      console.error('Error fetching all payments:', err);
      return [];
    }
  }, []);

  const linkPaymentInvoice = useCallback(async (paymentId: string, invoiceId: string) => {
    try {
      const { error: err } = await db
        .from('project_payments')
        .update({ invoice_id: invoiceId })
        .eq('id', paymentId);

      if (err) throw err;

      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, invoiceId } : p));
    } catch (err) {
      console.error('Error linking payment to invoice:', err);
      setError('Error al vincular cuota con factura');
    }
  }, []);

  // ===== PRODUCTS =====

  const fetchProducts = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const { data, error: err } = await db
        .from('products')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (err) throw err;

      // Seed default products if none exist
      if (!data || data.length === 0) {
        const defaults = [
          'WAU 360',
          'Funnel comercial',
          'Capacitación On demand',
          'Programación',
          'OKR (Estrategia)',
          'WAU digital',
        ];
        const rows = defaults.map(name => ({ organization_id: organization.id, name }));
        const { data: seeded, error: seedErr } = await db
          .from('products')
          .insert(rows)
          .select();

        if (!seedErr && seeded) {
          setProducts(seeded.map((p: any) => ({
            id: p.id,
            organizationId: p.organization_id,
            name: p.name,
            description: p.description,
            basePrice: p.base_price ?? null,
            estimatedDurationDays: p.estimated_duration_days ?? null,
            status: p.status || 'active',
            tools: p.tools || [],
            sortOrder: p.sort_order ?? 0,
            includesDiagnostic: p.includes_diagnostic ?? false,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          })));
          return;
        }
      }

      setProducts((data || []).map((p: any) => ({
        id: p.id,
        organizationId: p.organization_id,
        name: p.name,
        description: p.description,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }, [organization?.id]);

  const addProduct = useCallback(async (name: string, description: string | null): Promise<Product | null> => {
    if (!organization?.id) return null;
    try {
      const { data: row, error: err } = await db
        .from('products')
        .insert({ organization_id: organization.id, name, description })
        .select()
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo crear el producto');

      const product: Product = {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        description: row.description,
        basePrice: row.base_price ?? null,
        estimatedDurationDays: row.estimated_duration_days ?? null,
        status: row.status || 'active',
        tools: row.tools || [],
        sortOrder: row.sort_order ?? 0,
        includesDiagnostic: row.includes_diagnostic ?? false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setProducts(prev => [...prev, product].sort((a, b) => a.name.localeCompare(b.name)));
      return product;
    } catch (err) {
      console.error('Error adding product:', err);
      setError('Error al crear servicio');
      return null;
    }
  }, [organization?.id]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Pick<Product, 'name' | 'description' | 'basePrice' | 'estimatedDurationDays' | 'status' | 'tools' | 'sortOrder' | 'includesDiagnostic'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.basePrice !== undefined) dbUpdates.base_price = updates.basePrice;
      if (updates.estimatedDurationDays !== undefined) dbUpdates.estimated_duration_days = updates.estimatedDurationDays;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.tools !== undefined) dbUpdates.tools = updates.tools;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      if (updates.includesDiagnostic !== undefined) dbUpdates.includes_diagnostic = updates.includesDiagnostic;

      const { error: err } = await db
        .from('products')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (err) {
      console.error('Error updating product:', err);
      setError('Error al actualizar servicio');
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('products')
        .delete()
        .eq('id', id);

      if (err) throw err;
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Error al eliminar servicio');
    }
  }, []);

  const fetchProductTemplateModules = useCallback(async (productId: string): Promise<ProductTemplateModule[]> => {
    try {
      const { data, error: err } = await db
        .from('product_template_modules')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');

      if (err) throw err;

      return (data || []).map((m: any) => ({
        id: m.id,
        productId: m.product_id,
        title: m.title,
        description: m.description,
        presentationUrl: m.presentation_url || null,
        sortOrder: m.sort_order,
        createdAt: m.created_at,
      }));
    } catch (err) {
      console.error('Error fetching template modules:', err);
      return [];
    }
  }, []);

  const addProductTemplateModule = useCallback(async (
    productId: string, title: string, description: string | null, sortOrder: number
  ): Promise<ProductTemplateModule | null> => {
    try {
      const { data: row, error: err } = await db
        .from('product_template_modules')
        .insert({ product_id: productId, title, description, sort_order: sortOrder })
        .select()
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo crear el template');

      return {
        id: row.id,
        productId: row.product_id,
        title: row.title,
        description: row.description,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
      };
    } catch (err) {
      console.error('Error adding template module:', err);
      setError('Error al agregar módulo plantilla');
      return null;
    }
  }, []);

  const updateProductTemplateModule = useCallback(async (id: string, updates: Partial<Pick<ProductTemplateModule, 'title' | 'description' | 'sortOrder' | 'presentationUrl'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      if (updates.presentationUrl !== undefined) dbUpdates.presentation_url = updates.presentationUrl;

      const { error: err } = await db
        .from('product_template_modules')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;
    } catch (err) {
      console.error('Error updating template module:', err);
      setError('Error al actualizar módulo plantilla');
    }
  }, []);

  const deleteProductTemplateModule = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('product_template_modules')
        .delete()
        .eq('id', id);

      if (err) throw err;
    } catch (err) {
      console.error('Error deleting template module:', err);
      setError('Error al eliminar módulo plantilla');
    }
  }, []);

  const applyProductToProject = useCallback(async (productId: string, projectId: string) => {
    try {
      const templates = await fetchProductTemplateModules(productId);
      if (templates.length === 0) return;

      // Get project start date for scheduling modules weekly
      const { data: projRow } = await db
        .from('projects')
        .select('start_date')
        .eq('id', projectId)
        .single();
      const projectStartDate = projRow?.start_date || new Date().toISOString().slice(0, 10);

      // Fetch existing module titles for the project to avoid duplicates
      const { data: existingModules } = await db
        .from('project_modules')
        .select('title')
        .eq('project_id', projectId);

      const existingTitles = new Set((existingModules || []).map((m: any) => m.title));

      let weekOffset = 0;
      for (const tmpl of templates) {
        if (existingTitles.has(tmpl.title)) continue;

        // Calculate start and due dates: each module starts 1 week after the previous
        const startMs = new Date(projectStartDate).getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000;
        const dueMs = startMs + 6 * 24 * 60 * 60 * 1000; // due = 6 days after start (end of week)
        const startDate = new Date(startMs).toISOString().slice(0, 10);
        const dueDate = new Date(dueMs).toISOString().slice(0, 10);
        weekOffset++;

        const { data: row } = await db
          .from('project_modules')
          .insert({
            project_id: projectId,
            title: tmpl.title,
            description: tmpl.description,
            sort_order: tmpl.sortOrder,
            status: 'pending',
            start_date: startDate,
            due_date: dueDate,
          })
          .select()
          .single();

        if (row) {
          const newModule: ProjectModule = {
            id: row.id,
            projectId: row.project_id,
            deliverableId: null,
            title: row.title,
            description: row.description,
            startDate: row.start_date,
            dueDate: row.due_date,
            status: row.status,
            completedAt: null,
            completedBy: null,
            subtasks: [],
            sortOrder: row.sort_order,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
          setModules(prev => [...prev, newModule]);

          // Auto-create NPS survey for this module
          if (appUser?.id) {
            try {
              const { data: surveyRow } = await db
                .from('nps_surveys')
                .insert({
                  project_id: projectId,
                  session_title: tmpl.title,
                  created_by: appUser.id,
                })
                .select()
                .single();

              if (surveyRow) {
                setNpsSurveys(prev => [{
                  id: surveyRow.id,
                  projectId: surveyRow.project_id,
                  sessionTitle: surveyRow.session_title,
                  token: surveyRow.token,
                  isActive: surveyRow.is_active,
                  createdBy: surveyRow.created_by,
                  createdAt: surveyRow.created_at,
                }, ...prev]);
              }
            } catch (npsErr) {
              console.error('Error auto-creating NPS survey:', npsErr);
            }
          }
        }
      }
      // If product includes diagnostic, create 4 BMC diagnostic modules
      const product = products.find(p => p.id === productId);
      if (product?.includesDiagnostic) {
        const diagnosticSessions = [
          { title: 'Diagnóstico 1 — Clientes, Valor y Canales', description: 'Segmentos de clientes, propuesta de valor y canales de distribución.', sortOrder: -4 },
          { title: 'Diagnóstico 2 — Relación e Ingresos', description: 'Relación con clientes y fuentes de ingresos.', sortOrder: -3 },
          { title: 'Diagnóstico 3 — Recursos, Actividades y Socios', description: 'Recursos clave, actividades clave y socios estratégicos.', sortOrder: -2 },
          { title: 'Diagnóstico 4 — Costos y Consolidación', description: 'Estructura de costos y consolidación final del canvas.', sortOrder: -1 },
        ];

        for (const session of diagnosticSessions) {
          if (existingTitles.has(session.title)) continue;

          const dStartMs = new Date(projectStartDate).getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000;
          const dDueMs = dStartMs + 6 * 24 * 60 * 60 * 1000;
          const dStartDate = new Date(dStartMs).toISOString().slice(0, 10);
          const dDueDate = new Date(dDueMs).toISOString().slice(0, 10);
          weekOffset++;

          const { data: row } = await db
            .from('project_modules')
            .insert({
              project_id: projectId,
              title: session.title,
              description: session.description,
              sort_order: session.sortOrder,
              status: 'pending',
              start_date: dStartDate,
              due_date: dDueDate,
            })
            .select()
            .single();

          if (row) {
            setModules(prev => [...prev, {
              id: row.id,
              projectId: row.project_id,
              deliverableId: null,
              title: row.title,
              description: row.description,
              startDate: row.start_date,
              dueDate: row.due_date,
              status: row.status,
              completedAt: null,
              completedBy: null,
              subtasks: [],
              sortOrder: row.sort_order,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            }]);
          }
        }
      }

    } catch (err) {
      console.error('Error applying product to project:', err);
      setError('Error al aplicar servicio al proyecto');
    }
  }, [fetchProductTemplateModules, appUser?.id, products]);

  const rescheduleModulesWeekly = useCallback(async (projectId: string) => {
    try {
      // Get project start date
      const { data: projRow, error: projErr } = await db
        .from('projects')
        .select('start_date')
        .eq('id', projectId)
        .single();
      if (projErr) throw projErr;
      const baseDate = projRow?.start_date || new Date().toISOString().slice(0, 10);

      // Get all modules for the project, ordered by sort_order
      const { data: allModules, error: modErr } = await db
        .from('project_modules')
        .select('id, sort_order, title')
        .eq('project_id', projectId)
        .order('sort_order');
      if (modErr) throw modErr;

      if (!allModules || allModules.length === 0) return;

      // Update each module's dates with weekly intervals
      for (let i = 0; i < allModules.length; i++) {
        const startMs = new Date(baseDate).getTime() + i * 7 * 24 * 60 * 60 * 1000;
        const dueMs = startMs + 6 * 24 * 60 * 60 * 1000;
        const startDate = new Date(startMs).toISOString().slice(0, 10);
        const dueDate = new Date(dueMs).toISOString().slice(0, 10);

        const { error: upErr } = await db
          .from('project_modules')
          .update({ start_date: startDate, due_date: dueDate })
          .eq('id', allModules[i].id);
        if (upErr) throw upErr;
      }

      // Refresh modules in state
      await fetchModules(projectId);
    } catch (err) {
      console.error('Error rescheduling modules:', err);
      setError('Error al reprogramar módulos');
    }
  }, [fetchModules]);

  // ===== TEMPLATE DELIVERABLES =====

  const fetchTemplateDeliverables = useCallback(async (templateModuleId: string): Promise<ProductTemplateDeliverable[]> => {
    try {
      const { data, error: err } = await db
        .from('product_template_deliverables')
        .select('*')
        .eq('template_module_id', templateModuleId)
        .order('sort_order');

      if (err) throw err;
      return (data || []).map((d: any) => ({
        id: d.id,
        templateModuleId: d.template_module_id,
        name: d.name,
        description: d.description,
        sortOrder: d.sort_order,
        createdAt: d.created_at,
      }));
    } catch (err) {
      console.error('Error fetching template deliverables:', err);
      return [];
    }
  }, []);

  const addTemplateDeliverable = useCallback(async (
    templateModuleId: string, name: string, description: string | null, sortOrder: number
  ): Promise<ProductTemplateDeliverable | null> => {
    try {
      const { data: row, error: err } = await db
        .from('product_template_deliverables')
        .insert({ template_module_id: templateModuleId, name, description, sort_order: sortOrder })
        .select()
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo crear el entregable del template');
      return {
        id: row.id,
        templateModuleId: row.template_module_id,
        name: row.name,
        description: row.description,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
      };
    } catch (err) {
      console.error('Error adding template deliverable:', err);
      return null;
    }
  }, []);

  const updateTemplateDeliverable = useCallback(async (id: string, updates: Partial<Pick<ProductTemplateDeliverable, 'name' | 'description' | 'sortOrder'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

      const { error: err } = await db
        .from('product_template_deliverables')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;
    } catch (err) {
      console.error('Error updating template deliverable:', err);
    }
  }, []);

  const deleteTemplateDeliverable = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('product_template_deliverables')
        .delete()
        .eq('id', id);

      if (err) throw err;
    } catch (err) {
      console.error('Error deleting template deliverable:', err);
    }
  }, []);

  // ===== TEMPLATE OBJECTIVES =====

  const fetchTemplateObjectives = useCallback(async (templateModuleId: string): Promise<ProductTemplateObjective[]> => {
    try {
      const { data, error: err } = await db
        .from('product_template_objectives')
        .select('*')
        .eq('template_module_id', templateModuleId)
        .order('sort_order');

      if (err) throw err;
      return (data || []).map((o: any) => ({
        id: o.id,
        templateModuleId: o.template_module_id,
        text: o.text,
        sortOrder: o.sort_order,
        createdAt: o.created_at,
      }));
    } catch (err) {
      console.error('Error fetching template objectives:', err);
      return [];
    }
  }, []);

  const addTemplateObjective = useCallback(async (
    templateModuleId: string, text: string, sortOrder: number
  ): Promise<ProductTemplateObjective | null> => {
    try {
      const { data: row, error: err } = await db
        .from('product_template_objectives')
        .insert({ template_module_id: templateModuleId, text, sort_order: sortOrder })
        .select()
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo crear el objetivo del template');
      return {
        id: row.id,
        templateModuleId: row.template_module_id,
        text: row.text,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
      };
    } catch (err) {
      console.error('Error adding template objective:', err);
      return null;
    }
  }, []);

  const updateTemplateObjective = useCallback(async (id: string, updates: Partial<Pick<ProductTemplateObjective, 'text' | 'sortOrder'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.text !== undefined) dbUpdates.text = updates.text;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

      const { error: err } = await db
        .from('product_template_objectives')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;
    } catch (err) {
      console.error('Error updating template objective:', err);
    }
  }, []);

  const deleteTemplateObjective = useCallback(async (id: string) => {
    try {
      const { error: err } = await db
        .from('product_template_objectives')
        .delete()
        .eq('id', id);

      if (err) throw err;
    } catch (err) {
      console.error('Error deleting template objective:', err);
    }
  }, []);

  // ===== AGGREGATED NPS =====

  const fetchAggregatedNPS = useCallback(async (productName: string): Promise<Record<string, { avg: number; nps: number; promoters: number; passives: number; detractors: number; total: number }>> => {
    try {
      // Find all projects using this product
      const { data: projectRows, error: projErr } = await db
        .from('projects')
        .select('id')
        .eq('product', productName);

      if (projErr) throw projErr;
      const projectIds = (projectRows || []).map((p: any) => p.id);
      if (projectIds.length === 0) return {};

      // Get all NPS surveys for these projects
      const { data: surveyRows, error: survErr } = await db
        .from('nps_surveys')
        .select('id, session_title')
        .in('project_id', projectIds);

      if (survErr) throw survErr;
      if (!surveyRows || surveyRows.length === 0) return {};

      const surveyIds = surveyRows.map((s: any) => s.id);

      // Get all responses
      const { data: responseRows, error: respErr } = await db
        .from('nps_responses')
        .select('survey_id, score')
        .in('survey_id', surveyIds);

      if (respErr) throw respErr;

      // Map survey_id to session_title
      const surveyTitleMap: Record<string, string> = {};
      for (const s of surveyRows) {
        surveyTitleMap[s.id] = s.session_title;
      }

      // Group responses by session_title
      const grouped: Record<string, number[]> = {};
      for (const r of (responseRows || [])) {
        const title = surveyTitleMap[r.survey_id];
        if (!title) continue;
        if (!grouped[title]) grouped[title] = [];
        grouped[title].push(r.score);
      }

      // Calculate stats
      const result: Record<string, { avg: number; nps: number; promoters: number; passives: number; detractors: number; total: number }> = {};
      for (const [title, scores] of Object.entries(grouped)) {
        const total = scores.length;
        const avg = scores.reduce((s, v) => s + v, 0) / total;
        const promoters = scores.filter(s => s >= 9).length;
        const passives = scores.filter(s => s >= 7 && s <= 8).length;
        const detractors = scores.filter(s => s <= 6).length;
        const nps = Math.round(((promoters - detractors) / total) * 100);
        result[title] = { avg, nps, promoters, passives, detractors, total };
      }

      return result;
    } catch (err) {
      console.error('Error fetching aggregated NPS:', err);
      return {};
    }
  }, []);

  // ===== EFFECTS =====

  useEffect(() => {
    if (organization?.id) {
      fetchProjects();
      fetchProducts();
    }
  }, [organization?.id, fetchProjects, fetchProducts]);

  // ===== CONTEXT VALUE =====

  const value = useMemo<ProjectContextType>(() => ({
    projects,
    currentProject,
    participants,
    deliverables,
    modules,
    documents,
    activityLog,
    loading,
    error,
    fetchProjects,
    addProject,
    updateProject,
    deleteProject,
    getProject,
    fetchParticipants,
    addParticipant,
    updateParticipantRole,
    removeParticipant,
    fetchDeliverables,
    addDeliverable,
    updateDeliverable,
    deleteDeliverable,
    fetchModules,
    addModule,
    updateModule,
    completeModule,
    deleteModule,
    addModuleSession,
    updateModuleSession,
    completeModuleSession,
    deleteModuleSession,
    fetchTimeEntries,
    addTimeEntry,
    deleteTimeEntry,
    fetchComments,
    addComment,
    fetchDocuments,
    addDocument,
    updateDocument,
    deleteDocument,
    fetchActivityLog,
    logActivity,
    alumniProfile,
    fetchAlumniProfile,
    saveAlumniProfile,
    fetchAllAlumniProfiles,
    novedades,
    fetchNovedades,
    addNovedad,
    updateNovedad,
    deleteNovedad,
    togglePinNovedad,
    attendanceSessions,
    fetchAttendanceSessions,
    fetchAttendanceRecords,
    createAttendanceSession,
    deleteAttendanceSession,
    markAttendance,
    payments,
    fetchPayments,
    generatePayments,
    markPaymentPaid,
    markPaymentPending,
    updatePaymentPaidDate,
    updatePaymentAmount,
    deletePayment,
    linkPaymentInvoice,
    fetchAllPayments,
    npsSurveys,
    fetchNPSSurveys,
    createNPSSurvey,
    deleteNPSSurvey,
    toggleNPSSurveyActive,
    fetchNPSResponses,
    products,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    fetchProductTemplateModules,
    addProductTemplateModule,
    updateProductTemplateModule,
    deleteProductTemplateModule,
    applyProductToProject,
    rescheduleModulesWeekly,
    fetchTemplateDeliverables,
    addTemplateDeliverable,
    updateTemplateDeliverable,
    deleteTemplateDeliverable,
    fetchTemplateObjectives,
    addTemplateObjective,
    updateTemplateObjective,
    deleteTemplateObjective,
    fetchAggregatedNPS,
  }), [
    projects,
    currentProject,
    participants,
    deliverables,
    modules,
    documents,
    activityLog,
    loading,
    error,
    fetchProjects,
    addProject,
    updateProject,
    deleteProject,
    getProject,
    fetchParticipants,
    addParticipant,
    updateParticipantRole,
    removeParticipant,
    fetchDeliverables,
    addDeliverable,
    updateDeliverable,
    deleteDeliverable,
    fetchModules,
    addModule,
    updateModule,
    completeModule,
    deleteModule,
    addModuleSession,
    updateModuleSession,
    completeModuleSession,
    deleteModuleSession,
    fetchTimeEntries,
    addTimeEntry,
    deleteTimeEntry,
    fetchComments,
    addComment,
    fetchDocuments,
    addDocument,
    updateDocument,
    deleteDocument,
    fetchActivityLog,
    logActivity,
    alumniProfile,
    fetchAlumniProfile,
    saveAlumniProfile,
    fetchAllAlumniProfiles,
    novedades,
    fetchNovedades,
    addNovedad,
    updateNovedad,
    deleteNovedad,
    togglePinNovedad,
    attendanceSessions,
    fetchAttendanceSessions,
    fetchAttendanceRecords,
    createAttendanceSession,
    deleteAttendanceSession,
    markAttendance,
    payments,
    fetchPayments,
    generatePayments,
    markPaymentPaid,
    markPaymentPending,
    updatePaymentPaidDate,
    updatePaymentAmount,
    deletePayment,
    linkPaymentInvoice,
    fetchAllPayments,
    npsSurveys,
    fetchNPSSurveys,
    createNPSSurvey,
    deleteNPSSurvey,
    toggleNPSSurveyActive,
    fetchNPSResponses,
    products,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    fetchProductTemplateModules,
    addProductTemplateModule,
    updateProductTemplateModule,
    deleteProductTemplateModule,
    applyProductToProject,
    rescheduleModulesWeekly,
    fetchTemplateDeliverables,
    addTemplateDeliverable,
    updateTemplateDeliverable,
    deleteTemplateDeliverable,
    fetchTemplateObjectives,
    addTemplateObjective,
    updateTemplateObjective,
    deleteTemplateObjective,
    fetchAggregatedNPS,
  ]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
