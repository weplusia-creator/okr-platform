// ===== BMC Block Types =====

export const BMC_BLOCK_TYPES = [
  'customer_segments',
  'value_propositions',
  'channels',
  'customer_relationships',
  'revenue_streams',
  'key_resources',
  'key_activities',
  'key_partnerships',
  'cost_structure',
] as const;

export type BmcBlockType = typeof BMC_BLOCK_TYPES[number];

export interface BmcBlockConfig {
  type: BmcBlockType;
  name: string;
  description: string;
  icon: string;
  color: string;
  gridArea: string;
}

export const BMC_BLOCK_CONFIG: Record<BmcBlockType, BmcBlockConfig> = {
  key_partnerships: {
    type: 'key_partnerships',
    name: 'Socios Clave',
    description: '¿Quiénes son tus socios y proveedores clave?',
    icon: 'Handshake',
    color: '#8B5CF6',
    gridArea: '1 / 1 / 3 / 2',
  },
  key_activities: {
    type: 'key_activities',
    name: 'Actividades Clave',
    description: '¿Qué actividades clave requiere tu propuesta de valor?',
    icon: 'Zap',
    color: '#EC4899',
    gridArea: '1 / 2 / 2 / 3',
  },
  key_resources: {
    type: 'key_resources',
    name: 'Recursos Clave',
    description: '¿Qué recursos clave necesitás?',
    icon: 'Box',
    color: '#F59E0B',
    gridArea: '2 / 2 / 3 / 3',
  },
  value_propositions: {
    type: 'value_propositions',
    name: 'Propuesta de Valor',
    description: '¿Qué valor entregás al cliente?',
    icon: 'Gift',
    color: '#10B981',
    gridArea: '1 / 3 / 3 / 4',
  },
  customer_relationships: {
    type: 'customer_relationships',
    name: 'Relación con Clientes',
    description: '¿Qué tipo de relación esperan tus clientes?',
    icon: 'Heart',
    color: '#EF4444',
    gridArea: '1 / 4 / 2 / 5',
  },
  channels: {
    type: 'channels',
    name: 'Canales',
    description: '¿A través de qué canales llegás a tus clientes?',
    icon: 'Truck',
    color: '#3B82F6',
    gridArea: '2 / 4 / 3 / 5',
  },
  customer_segments: {
    type: 'customer_segments',
    name: 'Segmentos de Clientes',
    description: '¿Para quién estás creando valor?',
    icon: 'Users',
    color: '#6366F1',
    gridArea: '1 / 5 / 3 / 6',
  },
  cost_structure: {
    type: 'cost_structure',
    name: 'Estructura de Costos',
    description: '¿Cuáles son los costos más importantes del modelo?',
    icon: 'TrendingDown',
    color: '#F97316',
    gridArea: '3 / 1 / 4 / 3',
  },
  revenue_streams: {
    type: 'revenue_streams',
    name: 'Fuentes de Ingresos',
    description: '¿Por qué valor están dispuestos a pagar tus clientes?',
    icon: 'DollarSign',
    color: '#22C55E',
    gridArea: '3 / 3 / 4 / 6',
  },
};

// 4 sesiones de diagnóstico agrupando los 9 bloques
export const BMC_DIAGNOSTIC_SESSIONS = [
  {
    title: 'Diagnóstico 1 — Clientes, Valor y Canales',
    description: 'Segmentos de clientes, propuesta de valor y canales de distribución.',
    blocks: ['customer_segments', 'value_propositions', 'channels'] as BmcBlockType[],
  },
  {
    title: 'Diagnóstico 2 — Relación e Ingresos',
    description: 'Relación con clientes y fuentes de ingresos.',
    blocks: ['customer_relationships', 'revenue_streams'] as BmcBlockType[],
  },
  {
    title: 'Diagnóstico 3 — Recursos, Actividades y Socios',
    description: 'Recursos clave, actividades clave y socios estratégicos.',
    blocks: ['key_resources', 'key_activities', 'key_partnerships'] as BmcBlockType[],
  },
  {
    title: 'Diagnóstico 4 — Costos y Consolidación',
    description: 'Estructura de costos y consolidación final del canvas.',
    blocks: ['cost_structure'] as BmcBlockType[],
  },
];

// ===== Interfaces =====

export type BmcTemplateType = 'real_estate' | 'custom';
export type BmcCanvasType = 'initial' | 'revision' | 'final';
export type BmcCanvasStatus = 'draft' | 'in_progress' | 'consolidating' | 'finalized';
export type BmcParticipantRole = 'facilitator' | 'participant' | 'observer';
export type BmcParticipantStatus = 'invited' | 'active' | 'completed';
export type BmcResponseType = 'text' | 'multiple_choice' | 'scale';
export type BmcShowResponses = 'yes' | 'no' | 'after';

export const BMC_TEMPLATE_TYPE_LABELS: Record<BmcTemplateType, string> = {
  real_estate: 'Desarrollista',
  custom: 'Personalizada',
};

export const BMC_CANVAS_TYPE_LABELS: Record<BmcCanvasType, string> = {
  initial: 'Inicial',
  revision: 'Revisión',
  final: 'Final',
};

export const BMC_CANVAS_STATUS_LABELS: Record<BmcCanvasStatus, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  in_progress: { label: 'En progreso', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  consolidating: { label: 'Consolidando', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  finalized: { label: 'Finalizado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

export const BMC_PARTICIPANT_ROLE_LABELS: Record<BmcParticipantRole, string> = {
  facilitator: 'Facilitador',
  participant: 'Participante',
  observer: 'Observador',
};

export interface BmcTemplate {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  type: BmcTemplateType;
  isPublic: boolean;
  createdBy: string | null;
  questions: Record<BmcBlockType, { question: string; helpText?: string; responseType?: BmcResponseType; required?: boolean }[]>;
  createdAt: string;
  updatedAt: string;
}

export interface BmcCanvas {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  description: string | null;
  version: number;
  type: BmcCanvasType;
  status: BmcCanvasStatus;
  templateId: string | null;
  dueDate: string | null;
  anonymousResponses: boolean;
  allowVoting: boolean;
  showOthersResponses: BmcShowResponses;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BmcBlock {
  id: string;
  canvasId: string;
  type: BmcBlockType;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  consolidatedResponse: string | null;
  consolidatedBy: string | null;
  consolidatedAt: string | null;
  createdAt: string;
}

export interface BmcQuestion {
  id: string;
  blockId: string;
  question: string;
  helpText: string | null;
  sortOrder: number;
  responseType: BmcResponseType;
  required: boolean;
  options: string[] | null;
  createdAt: string;
}

export interface BmcParticipant {
  id: string;
  canvasId: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  role: BmcParticipantRole;
  status: BmcParticipantStatus;
  accessToken: string;
  invitedAt: string;
  completedAt: string | null;
}

export interface BmcResponse {
  id: string;
  canvasId: string;
  blockId: string;
  questionId: string;
  participantId: string;
  response: string;
  isAnonymous: boolean;
  participantName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BmcVote {
  id: string;
  responseId: string;
  participantId: string;
  value: number;
  createdAt: string;
}

// Default questions for predefined templates
export const DEFAULT_TEMPLATE_QUESTIONS: Record<BmcTemplateType, Record<BmcBlockType, { question: string; helpText?: string }[]>> = {
  real_estate: {
    customer_segments: [
      { question: '¿Quién es el inversor típico de la empresa? ¿Qué perfil tiene (edad, profesión, nivel socioeconómico, ubicación)?', helpText: 'Describí el perfil demográfico y socioeconómico del inversor.' },
      { question: '¿Qué busca el inversor al poner su dinero en un desarrollo inmobiliario (rentabilidad, resguardo de valor, uso propio)?', helpText: 'Identificá la motivación principal.' },
      { question: '¿Cuántos inversores activos tiene la empresa hoy? ¿Cuántos son recurrentes?', helpText: 'Estimá volumen y recurrencia.' },
      { question: '¿Quién es el consumidor final de las unidades (comprador para vivienda, alquiler, reventa)?', helpText: 'Diferenciá inversor de consumidor final.' },
      { question: '¿Hay distintos perfiles de clientes según el tipo de proyecto (ej. departamentos vs lotes)?', helpText: 'Segmentá por producto.' },
      { question: '¿Qué porcentaje de los inversores llega por recomendación vs otros canales?', helpText: 'Entendé la fuente de captación.' },
      { question: '¿Se ha trabajado con inversores institucionales o solo individuales?', helpText: 'Explorá diversificación de inversores.' },
      { question: '¿Existen segmentos de clientes que la empresa aún no atiende pero podría?', helpText: 'Identificá oportunidades de expansión.' },
    ],
    value_propositions: [
      { question: '¿Qué hace diferente a la empresa frente a otras desarrolladoras inmobiliarias de la zona?', helpText: 'Identificá el diferencial competitivo.' },
      { question: '¿Cuál es la promesa de valor para el inversor? ¿Rentabilidad, confianza, transparencia?', helpText: 'Definí qué valor percibe el inversor.' },
      { question: '¿Cuál es la promesa de valor para el consumidor final (ubicación, diseño, precio, calidad)?', helpText: 'Definí qué valor percibe el comprador.' },
      { question: '¿Cómo se transmite hoy esa propuesta de valor? ¿Es clara para los clientes?', helpText: 'Evaluá la comunicación de valor.' },
      { question: '¿La empresa tiene marca reconocida en el mercado? ¿Qué la identifica?', helpText: 'Evaluá el posicionamiento de marca.' },
      { question: '¿Qué tan importante es la trayectoria del fundador/líder como parte de la propuesta de valor?', helpText: 'Separar marca personal de marca empresa.' },
      { question: '¿Los proyectos nuevos refuerzan o diluyen la propuesta de valor de la empresa?', helpText: 'Evaluá coherencia del portafolio.' },
      { question: '¿Qué aspecto de la propuesta de valor debería fortalecerse para escalar?', helpText: 'Identificá áreas de mejora.' },
    ],
    channels: [
      { question: '¿Cómo llegan hoy los inversores a la empresa? ¿Cuáles son los canales principales?', helpText: 'Mapeá canales de captación actuales.' },
      { question: '¿La empresa tiene presencia digital activa (web, redes, pauta)?', helpText: 'Evaluá presencia online.' },
      { question: '¿Qué rol juegan los referidos y el boca a boca?', helpText: 'Medí importancia del canal orgánico.' },
      { question: '¿Se trabaja con inmobiliarias o brokers para la comercialización?', helpText: 'Identificá canales de distribución terceros.' },
      { question: '¿Cuál es el proceso de venta desde el primer contacto hasta el cierre?', helpText: 'Describí el funnel comercial.' },
      { question: '¿Se usan showrooms, renders, recorridos virtuales para vender?', helpText: 'Identificá herramientas de conversión.' },
      { question: '¿Los canales actuales son suficientes para los nuevos proyectos o necesitan escalar?', helpText: 'Evaluá capacidad de los canales.' },
    ],
    customer_relationships: [
      { question: '¿Cómo es la relación actual con los inversores durante un proyecto (frecuencia de comunicación, reportes)?', helpText: 'Evaluá la gestión de la relación.' },
      { question: '¿Qué nivel de confianza personal tiene el fundador/líder con los inversores?', helpText: 'Medí dependencia del vínculo personal.' },
      { question: '¿Qué pasa con la relación una vez que termina un proyecto? ¿Se mantiene?', helpText: 'Evaluá retención post-proyecto.' },
      { question: '¿Los inversores reciben información periódica sobre avance de obra, finanzas, etc.?', helpText: 'Medí transparencia operativa.' },
      { question: '¿Cómo se manejan los problemas o reclamos de inversores o compradores?', helpText: 'Evaluá gestión de conflictos.' },
      { question: '¿Se hace algún tipo de encuesta de satisfacción o NPS?', helpText: 'Medí feedback formal.' },
      { question: '¿Qué porcentaje de inversores repite en un nuevo proyecto?', helpText: 'Medí tasa de recompra.' },
    ],
    key_partnerships: [
      { question: '¿Quiénes son los socios financieros clave de la empresa (bancos, inversores ancla, fondos)?', helpText: 'Identificá socios de capital.' },
      { question: '¿Qué contratistas o proveedores son estratégicos (constructora, arquitectos, etc.)?', helpText: 'Mapeá proveedores críticos.' },
      { question: '¿Se trabaja con estudios jurídicos o contables externos?', helpText: 'Identificá socios de soporte.' },
      { question: '¿Hay alianzas con inmobiliarias o corredores para la comercialización?', helpText: 'Evaluá red de distribución.' },
      { question: '¿Qué dependencia tiene la empresa del municipio o entes reguladores?', helpText: 'Evaluá riesgo regulatorio.' },
      { question: '¿Hay alianzas con otras desarrolladoras para co-desarrollar proyectos?', helpText: 'Explorá alianzas sectoriales.' },
      { question: '¿Cuáles son las relaciones que, si se perdieran, afectarían más al negocio?', helpText: 'Identificá dependencias críticas.' },
    ],
    revenue_streams: [
      { question: '¿Cuáles son las fuentes de ingreso actuales (venta de unidades, administración de obra, comisiones)?', helpText: 'Mapeá todos los ingresos.' },
      { question: '¿Cómo se estructura el retorno para los inversores (% de ganancia, plazo, modalidad)?', helpText: 'Describí el modelo de inversión.' },
      { question: '¿Cuál es el margen bruto promedio de los proyectos?', helpText: 'Medí rentabilidad.' },
      { question: '¿Los ingresos dependen principalmente de la venta en pozo, durante obra o post-entrega?', helpText: 'Evaluá timing de monetización.' },
      { question: '¿Hay ingresos recurrentes (ej. administración, alquileres, servicios post-venta)?', helpText: 'Identificá ingresos sostenibles.' },
      { question: '¿Qué supuestos financieros se usan para proyectar cada proyecto (costo del m², precio de venta, inflación)?', helpText: 'Evaluá bases de proyección.' },
      { question: '¿Cuál es la velocidad promedio de venta de unidades?', helpText: 'Medí liquidez del producto.' },
    ],
    key_resources: [
      { question: '¿Cuáles son los recursos más críticos de la empresa hoy (terrenos, capital, equipo humano, know-how)?', helpText: 'Priorizá recursos clave.' },
      { question: '¿Cuántas personas trabajan en la empresa y qué roles cubren?', helpText: 'Mapeá estructura organizacional.' },
      { question: '¿El conocimiento técnico y comercial está centralizado en pocas personas?', helpText: 'Evaluá riesgo de concentración.' },
      { question: '¿Qué herramientas tecnológicas se usan para gestionar proyectos, ventas y finanzas?', helpText: 'Evaluá madurez tecnológica.' },
      { question: '¿La empresa tiene acceso propio a terrenos o depende de terceros?', helpText: 'Evaluá control del recurso suelo.' },
      { question: '¿Qué capacidad financiera tiene la empresa para iniciar un proyecto sin inversores externos?', helpText: 'Medí autonomía financiera.' },
      { question: '¿Qué recurso falta o es el cuello de botella actual para crecer?', helpText: 'Identificá limitante principal.' },
    ],
    key_activities: [
      { question: '¿Cuáles son las actividades que más valor generan en la empresa (desarrollo, comercialización, gestión de obra)?', helpText: 'Priorizá por impacto.' },
      { question: '¿Cómo es el proceso de selección y adquisición de terrenos?', helpText: 'Describí el proceso de sourcing.' },
      { question: '¿Cómo se gestiona la obra (dirección propia, tercerizada, mixta)?', helpText: 'Evaluá modelo de ejecución.' },
      { question: '¿Cómo se estructura el proceso comercial (preventa, lanzamiento, cierre)?', helpText: 'Describí el ciclo comercial.' },
      { question: '¿Qué actividades administrativas y legales son más demandantes?', helpText: 'Identificá carga operativa.' },
      { question: '¿Hay actividades que hoy hace el fundador/líder y que deberían delegarse?', helpText: 'Evaluá escalabilidad de roles.' },
      { question: '¿Qué procesos están documentados y cuáles dependen del conocimiento de una persona?', helpText: 'Medí madurez de procesos.' },
    ],
    cost_structure: [
      { question: '¿Cuáles son los costos más grandes de un proyecto típico (terreno, construcción, comercialización, financieros)?', helpText: 'Mapeá estructura de costos.' },
      { question: '¿Cómo se miden y controlan los costos durante la obra?', helpText: 'Evaluá control de gestión.' },
      { question: '¿Qué porcentaje representan los costos fijos de la empresa vs los costos por proyecto?', helpText: 'Evaluá apalancamiento operativo.' },
      { question: '¿Hay costos ocultos o que suelen subestimarse en los proyectos?', helpText: 'Identificá riesgos de costo.' },
      { question: '¿Cómo impacta la inflación y la variación del dólar en la estructura de costos?', helpText: 'Evaluá exposición macroeconómica.' },
      { question: '¿Qué costos escalarían si se duplicara la cantidad de proyectos en simultáneo?', helpText: 'Anticipá costos de escala.' },
      { question: '¿Se usa algún sistema para proyectar y comparar costos reales vs presupuestados?', helpText: 'Medí madurez del control financiero.' },
    ],
  },
  custom: {
    customer_segments: [{ question: '¿Quiénes son tus clientes?' }],
    value_propositions: [{ question: '¿Qué valor entregás?' }],
    channels: [{ question: '¿A través de qué canales operás?' }],
    customer_relationships: [{ question: '¿Cómo te relacionás con tus clientes?' }],
    revenue_streams: [{ question: '¿Cuáles son tus fuentes de ingresos?' }],
    key_resources: [{ question: '¿Qué recursos clave necesitás?' }],
    key_activities: [{ question: '¿Cuáles son tus actividades clave?' }],
    key_partnerships: [{ question: '¿Quiénes son tus socios clave?' }],
    cost_structure: [{ question: '¿Cuál es tu estructura de costos?' }],
  },
};
