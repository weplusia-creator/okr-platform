// ===== Playbook Types =====

export type PlaybookType = 'generico' | 'por_industria' | 'por_cliente' | 'por_producto';
export type PlaybookStatus = 'borrador' | 'activo' | 'archivado';
export type StepType = 'accion' | 'pregunta' | 'verificacion' | 'tip';
export type QuestionCategory = 'dolor' | 'necesidad' | 'presupuesto' | 'decision' | 'timeline' | 'competencia' | 'impacto' | 'vision';
export type ObjectionCategory = 'precio' | 'tiempo' | 'competencia' | 'necesidad' | 'autoridad' | 'confianza' | 'producto';
export type ObjectionSeverity = 'bajo' | 'medio' | 'alto';
export type ItemType = 'buying_signal' | 'red_flag' | 'competitor' | 'success_case' | 'material' | 'checklist';

// ===== Interfaces =====

export interface Playbook {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  description: string;
  type: PlaybookType;
  industry: string | null;
  productService: string | null;
  status: PlaybookStatus;
  version: number;
  isTemplate: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaybookStage {
  id: string;
  playbookId: string;
  name: string;
  description: string;
  objective: string;
  estimatedDuration: string;
  sortOrder: number;
  color: string;
  icon: string;
  createdAt: string;
}

export interface PlaybookStep {
  id: string;
  stageId: string;
  title: string;
  description: string | null;
  type: StepType;
  content: string | null;
  sortOrder: number;
  isRequired: boolean;
  createdAt: string;
}

export interface PlaybookScript {
  id: string;
  playbookId: string;
  stageId: string;
  name: string;
  situation: string;
  scriptText: string;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface PlaybookQuestion {
  id: string;
  playbookId: string;
  stageId: string;
  category: QuestionCategory;
  question: string;
  purpose: string;
  whatToListen: string | null;
  followupQuestion: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface PlaybookObjection {
  id: string;
  playbookId: string;
  objection: string;
  category: ObjectionCategory;
  severity: ObjectionSeverity;
  responses: { text: string; type: string; example: string }[];
  signalsWorking: string;
  ifNotWorking: string;
  sortOrder: number;
  createdAt: string;
}

export interface PlaybookItem {
  id: string;
  playbookId: string;
  stageId: string;
  itemType: ItemType;
  title: string;
  content: Record<string, any>;
  sortOrder: number;
  createdAt: string;
}

// ===== Constants =====

export const PLAYBOOK_TYPE_LABELS: Record<PlaybookType, string> = {
  generico: 'Genérico',
  por_industria: 'Por Industria',
  por_cliente: 'Por Cliente',
  por_producto: 'Por Producto',
};

export const PLAYBOOK_STATUS_LABELS: Record<PlaybookStatus, { label: string; color: string }> = {
  borrador: { label: 'Borrador', color: 'bg-yellow-100 text-yellow-800' },
  activo: { label: 'Activo', color: 'bg-green-100 text-green-800' },
  archivado: { label: 'Archivado', color: 'bg-gray-100 text-gray-800' },
};

export const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  dolor: 'Dolor',
  necesidad: 'Necesidad',
  presupuesto: 'Presupuesto',
  decision: 'Decisión',
  timeline: 'Timeline',
  competencia: 'Competencia',
  impacto: 'Impacto',
  vision: 'Visión',
};

export const OBJECTION_CATEGORY_LABELS: Record<ObjectionCategory, string> = {
  precio: 'Precio',
  tiempo: 'Tiempo',
  competencia: 'Competencia',
  necesidad: 'Necesidad',
  autoridad: 'Autoridad',
  confianza: 'Confianza',
  producto: 'Producto',
};

export const OBJECTION_SEVERITY_LABELS: Record<ObjectionSeverity, { label: string; color: string }> = {
  bajo: { label: 'Bajo', color: 'bg-green-100 text-green-800' },
  medio: { label: 'Medio', color: 'bg-yellow-100 text-yellow-800' },
  alto: { label: 'Alto', color: 'bg-red-100 text-red-800' },
};

export const ITEM_TYPE_CONFIG: Record<ItemType, { name: string; icon: string; color: string }> = {
  buying_signal: { name: 'Señal de Compra', icon: 'TrendingUp', color: '#22C55E' },
  red_flag: { name: 'Red Flag', icon: 'AlertTriangle', color: '#EF4444' },
  competitor: { name: 'Competidor', icon: 'Swords', color: '#F59E0B' },
  success_case: { name: 'Caso de Éxito', icon: 'Trophy', color: '#3B82F6' },
  material: { name: 'Material de Apoyo', icon: 'FileText', color: '#8B5CF6' },
  checklist: { name: 'Checklist', icon: 'CheckSquare', color: '#EC4899' },
};

export const STEP_TYPE_CONFIG: Record<StepType, { label: string; icon: string; color: string }> = {
  accion: { label: 'Acción', icon: 'Play', color: '#3B82F6' },
  pregunta: { label: 'Pregunta', icon: 'HelpCircle', color: '#8B5CF6' },
  verificacion: { label: 'Verificación', icon: 'CheckCircle', color: '#10B981' },
  tip: { label: 'Tip', icon: 'Lightbulb', color: '#F59E0B' },
};

// ===== Default Consultive Playbook =====

export const DEFAULT_CONSULTIVE_PLAYBOOK = {
  stages: [
    {
      name: 'Prospección',
      description: 'Identificación y primer contacto con prospectos potenciales',
      objective: 'Identificar y contactar prospectos calificados',
      estimatedDuration: '1-2 semanas',
      color: '#3B82F6',
      icon: 'Search',
      steps: [
        { title: 'Investigar la empresa', description: 'LinkedIn, web, noticias', type: 'accion' as StepType, content: 'Revisar sitio web, LinkedIn de la empresa y decisores, noticias recientes, reportes financieros si están disponibles. Buscar eventos gatillo: rondas de inversión, cambios de liderazgo, expansiones, etc.', isRequired: true },
        { title: 'Identificar el decisor y su contexto', description: null, type: 'accion' as StepType, content: 'Encontrar al decisor clave en LinkedIn. Revisar su perfil, publicaciones recientes, intereses. Identificar conexiones en común que puedan servir de referencia.', isRequired: true },
        { title: 'Preparar mensaje personalizado', description: null, type: 'accion' as StepType, content: 'Crear un mensaje que demuestre investigación previa. Mencionar algo específico de la empresa o persona. No vender en el primer contacto, generar curiosidad.', isRequired: true },
        { title: 'Realizar primer contacto', description: 'Email, llamada o LinkedIn', type: 'accion' as StepType, content: 'Ejecutar el contacto por el canal más apropiado según el perfil del prospecto. Registrar el intento y resultado en el CRM.', isRequired: true },
      ],
      scripts: [
        {
          name: 'Llamada inicial',
          situation: 'Primer contacto telefónico con prospecto',
          scriptText: 'Hola [NOMBRE], soy [TU_NOMBRE] de [EMPRESA]. Estuve viendo que [DATO_PERSONALIZADO] y me gustaría compartirte cómo ayudamos a empresas como [EMPRESA_SIMILAR] a [BENEFICIO_CONCRETO]. ¿Tenés 2 minutos para contarte brevemente?',
          notes: 'Si dice que está ocupado: "Entiendo perfectamente. ¿Cuándo sería un mejor momento para una llamada de 10 minutos? Te prometo ser breve y si no te aporta valor, no te vuelvo a molestar."',
        },
      ],
      questions: [],
    },
    {
      name: 'Calificación',
      description: 'Validación del prospecto usando criterios BANT y fit del producto',
      objective: 'Determinar si el prospecto es una oportunidad real',
      estimatedDuration: '1 reunión',
      color: '#8B5CF6',
      icon: 'ClipboardCheck',
      steps: [
        { title: 'Validar Budget', description: null, type: 'verificacion' as StepType, content: '¿Tienen presupuesto asignado?', isRequired: true },
        { title: 'Validar Authority', description: null, type: 'verificacion' as StepType, content: '¿Estoy hablando con quien decide?', isRequired: true },
        { title: 'Validar Need', description: null, type: 'verificacion' as StepType, content: '¿Tienen una necesidad real que podemos resolver?', isRequired: true },
        { title: 'Validar Timeline', description: null, type: 'verificacion' as StepType, content: '¿Cuándo necesitan solucionarlo?', isRequired: true },
      ],
      scripts: [],
      questions: [
        { category: 'necesidad' as QuestionCategory, question: '¿Cómo están manejando [PROBLEMA] actualmente?', purpose: 'Entender situación actual' },
        { category: 'impacto' as QuestionCategory, question: '¿Qué impacto tiene esto en el negocio?', purpose: 'Dimensionar el problema' },
        { category: 'decision' as QuestionCategory, question: '¿Quiénes más están involucrados en esta decisión?', purpose: 'Mapear decisores' },
        { category: 'presupuesto' as QuestionCategory, question: '¿Tienen un presupuesto definido para esto?', purpose: 'Calificar budget' },
        { category: 'timeline' as QuestionCategory, question: '¿Para cuándo necesitan tener esto resuelto?', purpose: 'Entender urgencia' },
      ],
    },
    {
      name: 'Descubrimiento',
      description: 'Inmersión profunda en la situación actual, dolores e impacto del problema',
      objective: 'Entender profundamente la situación, problemas y necesidades',
      estimatedDuration: '1-2 reuniones',
      color: '#10B981',
      icon: 'Compass',
      steps: [
        { title: 'Explorar dolores principales', description: null, type: 'accion' as StepType, content: 'Usar preguntas abiertas para entender los dolores del cliente. No asumir, dejar que el cliente describa su situación.', isRequired: true },
        { title: 'Medir impacto del problema', description: null, type: 'accion' as StepType, content: 'Cuantificar en tiempo, dinero y oportunidades perdidas. Preguntar por métricas concretas.', isRequired: true },
        { title: 'Construir visión de futuro', description: null, type: 'accion' as StepType, content: 'Ayudar al cliente a visualizar cómo sería su situación ideal. Conectar esa visión con lo que podemos ofrecer.', isRequired: true },
      ],
      scripts: [],
      questions: [
        { category: 'dolor' as QuestionCategory, question: '¿Cuál es el mayor desafío que enfrentan hoy en [ÁREA]?', purpose: 'Identificar dolor principal' },
        { category: 'dolor' as QuestionCategory, question: '¿Hace cuánto tiempo tienen este problema?', purpose: 'Dimensionar antigüedad' },
        { category: 'dolor' as QuestionCategory, question: '¿Qué han intentado antes para resolverlo?', purpose: 'Entender intentos previos' },
        { category: 'dolor' as QuestionCategory, question: '¿Por qué crees que no funcionó?', purpose: 'Identificar barreras' },
        { category: 'impacto' as QuestionCategory, question: '¿Cuánto les está costando este problema? (tiempo, dinero, oportunidades)', purpose: 'Cuantificar impacto' },
        { category: 'impacto' as QuestionCategory, question: '¿Qué pasa si no lo resuelven en los próximos 6 meses?', purpose: 'Crear urgencia' },
        { category: 'impacto' as QuestionCategory, question: '¿Cómo afecta esto a otros equipos/áreas?', purpose: 'Ampliar alcance' },
        { category: 'vision' as QuestionCategory, question: 'Si pudieras resolver esto, ¿cómo sería el escenario ideal?', purpose: 'Construir visión' },
        { category: 'vision' as QuestionCategory, question: '¿Qué métricas te gustaría ver mejoradas?', purpose: 'Definir KPIs de éxito' },
        { category: 'vision' as QuestionCategory, question: '¿Cómo mediría tu jefe el éxito de esta iniciativa?', purpose: 'Entender criterios internos' },
      ],
    },
    {
      name: 'Presentación de Solución',
      description: 'Demostración de la solución alineada a los problemas descubiertos',
      objective: 'Mostrar cómo nuestra solución resuelve sus problemas específicos',
      estimatedDuration: '1 reunión',
      color: '#F59E0B',
      icon: 'Presentation',
      steps: [
        { title: 'Recapitular lo que entendimos', description: null, type: 'accion' as StepType, content: 'Validar con el cliente que entendimos bien', isRequired: true },
        { title: 'Mostrar solución alineada a SUS problemas', description: null, type: 'accion' as StepType, content: 'Conectar cada feature con un dolor específico que mencionaron. No mostrar todo, solo lo relevante.', isRequired: true },
        { title: 'Demostrar con caso de éxito similar', description: null, type: 'accion' as StepType, content: 'Presentar un caso de una empresa similar que logró resultados concretos.', isRequired: false },
        { title: 'Presentar propuesta de valor única', description: null, type: 'accion' as StepType, content: 'Explicar qué nos hace diferentes y por qué somos la mejor opción para ellos específicamente.', isRequired: true },
      ],
      scripts: [
        {
          name: 'Transición a presentación',
          situation: 'Después del descubrimiento, al iniciar la presentación',
          scriptText: 'Basándome en lo que me contaste, entiendo que [PROBLEMA_1] y [PROBLEMA_2] están impactando en [CONSECUENCIA]. ¿Es correcto? ... Perfecto, déjame mostrarte cómo ayudamos a [CLIENTE_SIMILAR] a resolver exactamente esto.',
          notes: 'Siempre validar antes de presentar. Si el cliente corrige algo, ajustar.',
        },
      ],
      questions: [],
    },
    {
      name: 'Manejo de Objeciones',
      description: 'Técnicas y frameworks para responder objeciones con empatía',
      objective: 'Responder objeciones con empatía y técnica',
      estimatedDuration: 'Durante todo el proceso',
      color: '#EF4444',
      icon: 'Shield',
      steps: [
        { title: 'Escuchar la objeción completa sin interrumpir', description: null, type: 'accion' as StepType, content: 'Dejar que el cliente termine de expresar su preocupación. Tomar nota de las palabras exactas que usa.', isRequired: true },
        { title: 'Validar con empatía', description: null, type: 'tip' as StepType, content: 'Nunca descartés la objeción. Validá primero: "Entiendo tu preocupación..."', isRequired: true },
        { title: 'Hacer pregunta para profundizar', description: null, type: 'pregunta' as StepType, content: '¿Qué es lo que más te preocupa específicamente?', isRequired: true },
        { title: 'Responder con la técnica adecuada', description: null, type: 'accion' as StepType, content: 'Usar reencuadre, evidencia, concesión o pregunta según la objeción.', isRequired: true },
        { title: 'Verificar si la objeción fue resuelta', description: null, type: 'verificacion' as StepType, content: '¿Eso responde tu inquietud?', isRequired: true },
      ],
      scripts: [],
      questions: [],
    },
    {
      name: 'Negociación',
      description: 'Estrategias para llegar a un acuerdo win-win protegiendo márgenes',
      objective: 'Llegar a un acuerdo beneficioso para ambas partes',
      estimatedDuration: '1-2 reuniones',
      color: '#EC4899',
      icon: 'Handshake',
      steps: [
        { title: 'Tener claros los límites antes de negociar', description: null, type: 'verificacion' as StepType, content: 'Definir precio mínimo, condiciones no negociables y concesiones posibles ANTES de la reunión.', isRequired: true },
        { title: 'Crear valor antes de discutir precio', description: null, type: 'tip' as StepType, content: 'Nunca negociar precio antes de que el valor esté claro', isRequired: true },
        { title: 'Usar anclaje: empezar por el paquete más completo', description: null, type: 'accion' as StepType, content: 'Presentar primero la opción más completa para anclar la percepción de valor.', isRequired: false },
        { title: 'Nunca reducir precio sin quitar algo', description: null, type: 'tip' as StepType, content: 'Si bajan el precio, se reduce alcance. Siempre intercambiar.', isRequired: true },
        { title: 'Usar el silencio estratégicamente', description: null, type: 'tip' as StepType, content: 'Después de decir el precio, callarse. El primero que habla pierde.', isRequired: false },
      ],
      scripts: [],
      questions: [],
    },
    {
      name: 'Cierre y Post-venta',
      description: 'Técnicas de cierre y aseguramiento de satisfacción del cliente',
      objective: 'Cerrar el acuerdo y asegurar satisfacción del cliente',
      estimatedDuration: '1 reunión + seguimiento',
      color: '#22C55E',
      icon: 'Trophy',
      steps: [
        { title: 'Detectar señales de compra', description: null, type: 'verificacion' as StepType, content: 'Preguntas sobre implementación, plazos, o detalles técnicos son señales positivas.', isRequired: true },
        { title: 'Proponer el cierre', description: null, type: 'accion' as StepType, content: '¿Avanzamos con la propuesta entonces?', isRequired: true },
        { title: 'Definir próximos pasos concretos', description: null, type: 'accion' as StepType, content: 'Quién hace qué, para cuándo. Enviar resumen por email.', isRequired: true },
        { title: 'Enviar propuesta/contrato', description: null, type: 'accion' as StepType, content: 'Enviar propuesta formal dentro de las 24hs de la reunión.', isRequired: true },
        { title: 'Seguimiento post-cierre', description: null, type: 'accion' as StepType, content: 'Contactar a los 7 días, 30 días y 90 días', isRequired: true },
        { title: 'Pedir referidos', description: null, type: 'tip' as StepType, content: 'El mejor momento es cuando el cliente está satisfecho con los primeros resultados', isRequired: false },
      ],
      scripts: [],
      questions: [],
    },
  ],
  objections: [
    {
      objection: '"Es muy caro" / "No tenemos presupuesto"',
      category: 'precio' as ObjectionCategory,
      severity: 'alto' as ObjectionSeverity,
      responses: [
        { text: 'Entiendo que el precio es un factor importante. Ayudame a entender, ¿comparado con qué te parece caro?', type: 'pregunta', example: 'Empatía + Pregunta para entender referencia' },
        { text: 'Más que el precio, pensemos en el costo de NO resolver esto. Me dijiste que están perdiendo [X] por mes. En 6 meses eso son [Y]. Nuestra solución cuesta [Z] y se paga sola en [TIEMPO].', type: 'reencuadre', example: 'Reencuadre al valor y ROI' },
        { text: 'Si lo pensamos mensualmente, estamos hablando de [X]/mes. ¿Es un monto que se puede manejar considerando el retorno?', type: 'reencuadre', example: 'Fragmentar el costo' },
        { text: 'Si el precio es el único obstáculo, podemos ver opciones de pago o un alcance reducido para empezar. ¿Qué te funcionaría mejor?', type: 'concesion', example: 'Concesión condicionada' },
      ],
      signalsWorking: 'El cliente empieza a preguntar por plazos de pago o paquetes menores',
      ifNotWorking: 'Volver al descubrimiento - quizás no dimensionó bien el problema',
    },
    {
      objection: '"Tengo que pensarlo"',
      category: 'tiempo' as ObjectionCategory,
      severity: 'medio' as ObjectionSeverity,
      responses: [
        { text: 'Por supuesto, es una decisión importante. ¿Qué aspectos específicos necesitas pensar? Así te puedo dar más información.', type: 'pregunta', example: 'Entender qué lo frena' },
        { text: 'Entiendo. Solo para que lo tengas en cuenta, [RAZÓN_URGENCIA]. ¿Cuándo podríamos retomar la conversación?', type: 'reencuadre', example: 'Crear urgencia suave' },
        { text: '¿Qué te parece si mientras lo pensas, te mando un caso de estudio de una empresa similar?', type: 'evidencia', example: 'Ofrecer siguiente paso pequeño' },
      ],
      signalsWorking: 'El cliente da una fecha concreta para retomar',
      ifNotWorking: 'Preguntar directamente: ¿Hay algo que no te haya convencido?',
    },
    {
      objection: '"Ya tenemos un proveedor"',
      category: 'competencia' as ObjectionCategory,
      severity: 'medio' as ObjectionSeverity,
      responses: [
        { text: 'Qué bueno que ya están trabajando esto. ¿Cómo les está funcionando? ¿Hay algo que les gustaría que fuera diferente?', type: 'pregunta', example: 'Curiosidad genuina' },
        { text: 'Muchos de nuestros clientes actuales venían de [COMPETIDOR]. Lo que más valoran de nosotros es [DIFERENCIADOR]. ¿Te interesaría ver cómo se compara?', type: 'evidencia', example: 'Diferenciación con prueba social' },
        { text: 'Perfecto, no te quiero hacer perder tiempo entonces. ¿Te parece si te contacto en [TIEMPO] por si la situación cambia?', type: 'empatia', example: 'Plantar semilla para el futuro' },
      ],
      signalsWorking: 'El cliente menciona insatisfacción con su proveedor actual',
      ifNotWorking: 'Agendar seguimiento en 3-6 meses',
    },
    {
      objection: '"No es el momento"',
      category: 'tiempo' as ObjectionCategory,
      severity: 'medio' as ObjectionSeverity,
      responses: [
        { text: '¿Qué tendría que pasar para que sea el momento correcto?', type: 'pregunta', example: 'Entender criterios de timing' },
        { text: 'Entiendo que hay prioridades. Solo para dimensionar: cada mes que pasa sin resolver esto, ¿cuánto están perdiendo en [MÉTRICA]?', type: 'reencuadre', example: 'Costo de la inacción' },
        { text: '¿Cuándo sería un mejor momento? Te agendo un seguimiento para [FECHA].', type: 'empatia', example: 'Agendar futuro concreto' },
      ],
      signalsWorking: 'El cliente reconoce el costo de esperar',
      ifNotWorking: 'Respetar timing y mantener nurturing',
    },
    {
      objection: '"Tengo que consultarlo con..."',
      category: 'autoridad' as ObjectionCategory,
      severity: 'bajo' as ObjectionSeverity,
      responses: [
        { text: 'Por supuesto. ¿Te parece si agendamos una llamada donde pueda participar [DECISOR]?', type: 'pregunta', example: 'Incluir al decisor' },
        { text: '¿Qué información necesitás para presentarle la propuesta? Te puedo preparar un resumen ejecutivo.', type: 'evidencia', example: 'Armar el caso para el decisor' },
        { text: '¿Qué crees que va a preguntar [DECISOR]? ¿Qué le preocupa más normalmente?', type: 'pregunta', example: 'Anticipar objeciones del decisor' },
      ],
      signalsWorking: 'El cliente agenda reunión con el decisor',
      ifNotWorking: 'Pedir participar en la reunión interna',
    },
    {
      objection: '"No estoy seguro de que funcione para nosotros"',
      category: 'confianza' as ObjectionCategory,
      severity: 'alto' as ObjectionSeverity,
      responses: [
        { text: 'Entiendo la duda. [CLIENTE_SIMILAR] tenía exactamente la misma preocupación. Hoy están logrando [RESULTADO]. ¿Te gustaría hablar con ellos?', type: 'evidencia', example: 'Caso similar + contacto directo' },
        { text: '¿Qué te daría la confianza de que va a funcionar? Podemos hacer [PILOTO/PRUEBA/GARANTÍA].', type: 'pregunta', example: 'Reducir riesgo percibido' },
        { text: '¿Qué parte específica te genera dudas? Así lo vemos en detalle.', type: 'pregunta', example: 'Profundizar en la duda específica' },
      ],
      signalsWorking: 'El cliente pide más detalles o acepta un piloto',
      ifNotWorking: 'Ofrecer garantía de satisfacción o prueba gratuita',
    },
  ],
};
