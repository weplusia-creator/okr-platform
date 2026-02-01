import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  Plus,
  DollarSign,
  Hash,
  Globe,
  Users,
  UserCircle,
  FolderKanban,
  CalendarDays,
  CheckCircle2,
  Clock,
  SmilePlus,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useProjects } from '../../context/ProjectContext';
import { PROJECT_STATUS_CONFIG, getProjectDisplayName } from '../../types/projects';
import type { ProjectPayment, NPSResponse } from '../../types/projects';

function getFaviconUrl(website: string | null): string | null {
  if (!website) return null;
  try {
    const domain = new URL(website).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  draft: { label: 'Borrador', class: 'badge-gray' },
  issued: { label: 'Emitida', class: 'badge-primary' },
  paid: { label: 'Pagada', class: 'badge-success' },
  overdue: { label: 'Vencida', class: 'badge-warning' },
  cancelled: { label: 'Cancelada', class: 'badge-danger' },
};

export function ClientDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { clients, getClientInvoices } = useFinance();
  const { projects, fetchAllPayments, fetchNPSSurveys, fetchNPSResponses, npsSurveys } = useProjects();

  const [allPayments, setAllPayments] = useState<(ProjectPayment & { projectName: string })[]>([]);
  const [npsResponses, setNpsResponses] = useState<Map<string, NPSResponse[]>>(new Map());

  useEffect(() => {
    fetchAllPayments().then(setAllPayments);
  }, [fetchAllPayments]);

  const client = clients.find(c => c.id === id);
  const invoices = getClientInvoices(id || '');
  const clientProjects = projects.filter(p => p.clientId === id);

  // Fetch NPS surveys for each client project
  useEffect(() => {
    clientProjects.forEach(p => fetchNPSSurveys(p.id));
  }, [clientProjects.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch NPS responses when surveys load
  const clientSurveyIds = useMemo(() => {
    const projectIds = new Set(clientProjects.map(p => p.id));
    return npsSurveys.filter(s => projectIds.has(s.projectId)).map(s => s.id);
  }, [npsSurveys, clientProjects]);

  useEffect(() => {
    clientSurveyIds.forEach(surveyId => {
      if (!npsResponses.has(surveyId)) {
        fetchNPSResponses(surveyId).then(responses => {
          setNpsResponses(prev => new Map(prev).set(surveyId, responses));
        });
      }
    });
  }, [clientSurveyIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aggregate NPS across all client projects
  const clientNPS = useMemo(() => {
    const allResponses: NPSResponse[] = [];
    const projectIds = new Set(clientProjects.map(p => p.id));
    const projectSurveys = npsSurveys.filter(s => projectIds.has(s.projectId));

    for (const survey of projectSurveys) {
      const responses = npsResponses.get(survey.id);
      if (responses) allResponses.push(...responses);
    }

    if (allResponses.length === 0) return null;

    const promoters = allResponses.filter(r => r.score >= 9).length;
    const detractors = allResponses.filter(r => r.score <= 6).length;
    const nps = Math.round(((promoters - detractors) / allResponses.length) * 100);
    const avg = allResponses.reduce((s, r) => s + r.score, 0) / allResponses.length;

    return { nps, avg, total: allResponses.length, promoters, detractors, passives: allResponses.length - promoters - detractors };
  }, [npsSurveys, npsResponses, clientProjects]);

  // Per-project NPS
  const projectNPSMap = useMemo(() => {
    const map = new Map<string, { nps: number; avg: number; total: number }>();
    const projectIds = new Set(clientProjects.map(p => p.id));
    const projectSurveys = npsSurveys.filter(s => projectIds.has(s.projectId));

    for (const projectId of projectIds) {
      const surveys = projectSurveys.filter(s => s.projectId === projectId);
      const allR: NPSResponse[] = [];
      for (const s of surveys) {
        const r = npsResponses.get(s.id);
        if (r) allR.push(...r);
      }
      if (allR.length > 0) {
        const promoters = allR.filter(r => r.score >= 9).length;
        const detractors = allR.filter(r => r.score <= 6).length;
        map.set(projectId, {
          nps: Math.round(((promoters - detractors) / allR.length) * 100),
          avg: allR.reduce((s, r) => s + r.score, 0) / allR.length,
          total: allR.length,
        });
      }
    }
    return map;
  }, [npsSurveys, npsResponses, clientProjects]);

  // Payments grouped by project for this client
  const clientPayments = useMemo(() => {
    const projectIds = new Set(clientProjects.map(p => p.id));
    return allPayments.filter(p => projectIds.has(p.projectId));
  }, [allPayments, clientProjects]);

  const paymentsSummary = useMemo(() => {
    const paid = clientPayments.filter(p => p.status === 'paid');
    const pending = clientPayments.filter(p => p.status === 'pending');
    return {
      paidTotal: paid.reduce((s, p) => s + p.amount, 0),
      paidCount: paid.length,
      pendingTotal: pending.reduce((s, p) => s + p.amount, 0),
      pendingCount: pending.length,
    };
  }, [clientPayments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Cliente no encontrado</p>
        <button
          onClick={() => navigate('/projects/clients')}
          className="btn-primary mt-4"
        >
          Volver a clientes
        </button>
      </div>
    );
  }

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0);
  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.total, 0);
  const pendingBalance = invoices
    .filter(i => i.status === 'issued' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/projects/clients')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          {getFaviconUrl(client.website) ? (
            <img
              src={getFaviconUrl(client.website)!}
              alt=""
              className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-200 dark:border-gray-700 p-1"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-primary-600 font-semibold text-lg">{client.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {client.name}
            </h1>
            {client.company && (
              <p className="text-gray-600 dark:text-gray-400">Responsable: {client.company}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate(`/projects/clients/${id}/edit`)}
          className="btn-secondary"
        >
          <Edit2 className="w-5 h-5" />
          Editar
        </button>
        <Link
          to={`/finance/invoices/new?clientId=${id}`}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          Nueva factura
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Información del cliente
          </h3>

          <div className="space-y-3">
            {client.company && (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <UserCircle className="w-5 h-5 text-gray-400 shrink-0" />
                <span>Responsable: {client.company}</span>
              </div>
            )}
            {client.cuit && (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Hash className="w-5 h-5 text-gray-400 shrink-0" />
                <span>CUIT: {client.cuit}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Mail className="w-5 h-5 text-gray-400 shrink-0" />
                <a href={`mailto:${client.email}`} className="hover:text-primary-600">
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                <a href={`tel:${client.phone}`} className="hover:text-primary-600">
                  {client.phone}
                </a>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <span>{client.address}</span>
              </div>
            )}
            {client.industry && (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Briefcase className="w-5 h-5 text-gray-400 shrink-0" />
                <span>{client.industry}</span>
              </div>
            )}
            {client.employeeCount && (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Users className="w-5 h-5 text-gray-400 shrink-0" />
                <span>{client.employeeCount} empleados</span>
              </div>
            )}
            {client.website && (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Globe className="w-5 h-5 text-gray-400 shrink-0" />
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary-600">
                  {client.website}
                </a>
              </div>
            )}
            {(client.contactName || client.contactRole) && (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <UserCircle className="w-5 h-5 text-gray-400 shrink-0" />
                <span>
                  {client.contactName}{client.contactRole ? ` — ${client.contactRole}` : ''}
                </span>
              </div>
            )}
          </div>

          {client.notes && (
            <>
              <hr className="border-gray-200 dark:border-gray-700" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Notas</p>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {client.notes}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Balance Summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
                  <DollarSign className="w-5 h-5 text-success-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos totales</p>
                  <p className="text-xl font-bold text-success-600">
                    {formatCurrency(paymentsSummary.paidTotal)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
                  <CheckCircle2 className="w-5 h-5 text-success-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cuotas cobradas</p>
                  <p className="text-xl font-bold text-success-600">
                    {paymentsSummary.paidCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30">
                  <Clock className="w-5 h-5 text-warning-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cuotas pendientes</p>
                  <p className="text-xl font-bold text-warning-600">
                    {paymentsSummary.pendingCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${clientNPS && clientNPS.nps >= 0 ? 'bg-success-100 dark:bg-success-900/30' : clientNPS ? 'bg-danger-100 dark:bg-danger-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <SmilePlus className={`w-5 h-5 ${clientNPS && clientNPS.nps >= 0 ? 'text-success-600' : clientNPS ? 'text-danger-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">NPS</p>
                  {clientNPS ? (
                    <div className="flex items-baseline gap-2">
                      <p className={`text-xl font-bold ${clientNPS.nps >= 50 ? 'text-success-600' : clientNPS.nps >= 0 ? 'text-warning-600' : 'text-danger-600'}`}>
                        {clientNPS.nps > 0 ? '+' : ''}{clientNPS.nps}
                      </p>
                      <span className="text-xs text-gray-400">
                        ({clientNPS.total} resp.)
                      </span>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-gray-300 dark:text-gray-600">—</p>
                  )}
                </div>
              </div>
              {clientNPS && (
                <div className="mt-2 flex gap-1 text-xs">
                  <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{clientNPS.promoters}P</span>
                  <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{clientNPS.passives}N</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{clientNPS.detractors}D</span>
                </div>
              )}
            </div>
          </div>

          {/* Projects with payments */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Proyectos ({clientProjects.length})
            </h3>

            {clientProjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FolderKanban className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay proyectos para este cliente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clientProjects.map(project => {
                  const statusConfig = PROJECT_STATUS_CONFIG[project.status];
                  const projectPayments = clientPayments
                    .filter(p => p.projectId === project.id)
                    .sort((a, b) => a.month.localeCompare(b.month));

                  return (
                    <div key={project.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <Link
                        to={`/projects/${project.id}`}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                            <FolderKanban className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {getProjectDisplayName(project)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {project.startDate ? formatDate(project.startDate) : ''}{project.estimatedEndDate ? ` — ${formatDate(project.estimatedEndDate)}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {(() => {
                            const pNps = projectNPSMap.get(project.id);
                            if (!pNps) return null;
                            return (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pNps.nps >= 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : pNps.nps >= 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                NPS {pNps.nps > 0 ? '+' : ''}{pNps.nps}
                              </span>
                            );
                          })()}
                          <span className={`badge ${statusConfig.bgClass}`}>
                            {statusConfig.label}
                          </span>
                          {project.monthlyFee ? (
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {formatCurrency(project.monthlyFee)}/mes
                            </span>
                          ) : null}
                        </div>
                      </Link>

                      {projectPayments.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 px-4 py-2">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {projectPayments.map(payment => {
                              const [yyyy, mm] = payment.month.split('-');
                              const monthLabel = new Date(Number(yyyy), Number(mm) - 1, 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
                              const isPaid = payment.status === 'paid';
                              return (
                                <div
                                  key={payment.id}
                                  className={`text-center px-2 py-1.5 rounded-md text-xs font-medium ${
                                    isPaid
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  }`}
                                  title={`${monthLabel}: ${formatCurrency(payment.amount)} — ${isPaid ? 'Cobrada' : 'Pendiente'}`}
                                >
                                  <div className="capitalize">{monthLabel}</div>
                                  <div>{formatCurrency(payment.amount)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Invoices List */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Historial de facturas ({invoices.length})
            </h3>

            {invoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay facturas para este cliente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map(invoice => (
                  <Link
                    key={invoice.id}
                    to={`/finance/invoices/${invoice.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <FileText className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(invoice.issueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`badge ${STATUS_LABELS[invoice.status]?.class}`}>
                        {STATUS_LABELS[invoice.status]?.label}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(invoice.total)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
