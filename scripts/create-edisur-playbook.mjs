// Script to create EDISUR playbook with all stages, steps, scripts, questions, and objections
const SB_URL = 'https://avgfqdtfmoqkjfgtvrtg.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2Z2ZxZHRmbW9xa2pmZ3R2cnRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYwMDY1NywiZXhwIjoyMDg1MTc2NjU3fQ.cBuGvG3uiRJ5UL3c0h-UTL056brKIczBYCG4I404e-0';
const ORG_ID = '11111111-1111-1111-1111-111111111111';

async function api(path, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`${path}: ${r.status} ${t}`);
  }
  return r.json();
}

// Get first user as creator
const users = await (await fetch(`${SB_URL}/rest/v1/users?organization_id=eq.${ORG_ID}&limit=1&select=id`, {
  headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
})).json();
const createdBy = users[0]?.id;
if (!createdBy) throw new Error('No user found');

console.log('Creating EDISUR playbook...');

// 1. Create playbook
const [playbook] = await api('playbooks', {
  organization_id: ORG_ID,
  name: 'Playbook Comercial EDISUR',
  description: 'Proceso comercial completo para asesores de EDISUR. Desde la entrada del lead hasta el cierre de la venta con firma de boleto. Incluye scripts, checklists, manejo de objeciones y zona gris.',
  type: 'por_cliente',
  industry: 'Inmobiliario',
  product_service: 'Lotes y Desarrollos Inmobiliarios',
  status: 'activo',
  version: 1,
  is_template: false,
  created_by: createdBy,
});
const PB = playbook.id;
console.log(`Playbook created: ${PB}`);

// Helper to create stage + its content
async function createStage(data) {
  const [stage] = await api('playbook_stages', {
    playbook_id: PB,
    name: data.name,
    description: data.description || '',
    objective: data.objective || '',
    estimated_duration: data.duration || '',
    sort_order: data.order,
    color: data.color,
    icon: data.icon || 'Circle',
  });
  const SID = stage.id;
  console.log(`  Stage: ${data.name}`);

  // Steps
  if (data.steps) {
    for (let i = 0; i < data.steps.length; i++) {
      const s = data.steps[i];
      await api('playbook_steps', {
        stage_id: SID,
        title: s.title,
        description: s.description || null,
        type: s.type || 'accion',
        content: s.content || null,
        sort_order: i,
        is_required: s.required !== false,
      });
    }
  }

  // Scripts
  if (data.scripts) {
    for (let i = 0; i < data.scripts.length; i++) {
      const s = data.scripts[i];
      await api('playbook_scripts', {
        playbook_id: PB,
        stage_id: SID,
        name: s.name,
        situation: s.situation || '',
        script_text: s.text,
        notes: s.notes || null,
        sort_order: i,
      });
    }
  }

  // Questions
  if (data.questions) {
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      await api('playbook_questions', {
        playbook_id: PB,
        stage_id: SID,
        question: q.question,
        category: q.category || 'necesidad',
        purpose: q.purpose || '',
        what_to_listen: q.listen || null,
        followup_question: q.followup || null,
        sort_order: i,
      });
    }
  }

  return SID;
}

// ============================================================
// STAGE A: ENTRADA DEL LEAD
// ============================================================
await createStage({
  name: 'A. Entrada del Lead',
  order: 0,
  color: '#3B82F6',
  icon: 'Inbox',
  objective: 'Tomar el lead inmediatamente y asignar responsable',
  duration: '< 15 min (ideal) / < 1 hora (aceptable)',
  description: 'Un lead inbound ingresa a Gestar desde formulario web, campañas, portales o contacto directo. El lead debe ser tomado inmediatamente por un asesor disponible. No existe selección ni preferencia: orden de llegada obligatorio.',
  steps: [
    { title: 'Abrir Gestar', type: 'accion' },
    { title: 'Tomar lead (asignarse como responsable)', type: 'accion', description: 'No se puede rechazar ni esperar. Esta etapa NO es opinable.' },
    { title: 'Ver fecha y hora de ingreso', type: 'accion' },
    { title: 'Leer producto consultado', type: 'accion' },
    { title: 'Chequear si es cliente previo de EDISUR', type: 'verificacion' },
    { title: 'Prepararse para llamar', type: 'accion' },
    { title: 'Checklist de pase: Lead tomado, responsable asignado, producto identificado, contacto disponible', type: 'verificacion', description: 'Si falta 1 solo ítem → NO se puede avanzar a etapa B.' },
  ],
});

// ============================================================
// STAGE B: PRIMER CONTACTO
// ============================================================
await createStage({
  name: 'B. Primer Contacto – Llamado',
  order: 1,
  color: '#8B5CF6',
  icon: 'Phone',
  objective: 'Contactar + calificar + vender la reunión presencial',
  duration: '1 llamado',
  description: 'En 1 llamado el asesor debe: generar contacto humano, confirmar motivo, identificar arquetipo (familia/inversor), validar si califica y vender la reunión presencial. NO es cerrar, pasar precios ni explicar productos.',
  steps: [
    { title: 'Llamar al lead', type: 'accion' },
    { title: 'Generar contacto humano', type: 'accion' },
    { title: 'Confirmar motivo de consulta', type: 'accion' },
    { title: 'Identificar arquetipo (familia / inversor)', type: 'accion' },
    { title: 'Validar si califica', type: 'verificacion' },
    { title: 'Vender la reunión presencial como mejor próximo paso', type: 'accion', description: 'Esto no se sugiere. Se VENDE.' },
    { title: 'Checklist: lead atendió, arquetipo identificado, califica, se intentó reunión, próximo paso claro', type: 'verificacion', description: 'Si falla uno → el llamado no cumplió su objetivo.' },
  ],
  scripts: [
    {
      name: 'Apertura del llamado',
      situation: 'Al iniciar el primer contacto telefónico',
      text: '"Hola ___, ¿cómo estás?\nTe llamo de EDISUR por la consulta que hiciste sobre ___, ¿hablo bien?"',
      notes: 'Control + contexto. Si dice que sí → continuar.',
    },
    {
      name: 'Validación de interés',
      situation: 'Después de la apertura',
      text: '"Perfecto. Antes de avanzar, contame:\n¿esto lo estás pensando más como inversión o para vivir?"',
      notes: 'Pregunta simple, no invasiva, abre todo el funnel.',
    },
    {
      name: 'Micro-calificación',
      situation: 'Después de identificar arquetipo',
      text: '"¿Estás ya viendo opciones concretas o recién empezando a evaluar?"',
    },
    {
      name: 'Venta de la reunión',
      situation: 'Core del llamado – después de calificar',
      text: '"Bien. Justamente para no marearte con información por teléfono,\nlo que hacemos es una reunión corta en la oficina donde filtramos opciones y te vas con claridad.\n¿Te parece que lo veamos así?"',
      notes: 'Esto no se sugiere. Se VENDE.',
    },
  ],
  questions: [
    { question: '¿Esto lo estás pensando más como inversión o para vivir?', category: 'necesidad', purpose: 'Identificar arquetipo (inversor/familia)', listen: 'Define todo el enfoque posterior' },
    { question: '¿Estás ya viendo opciones concretas o recién empezando a evaluar?', category: 'timeline', purpose: 'Validar estado de búsqueda', listen: 'Urgencia y nivel de comparación' },
  ],
});

// ============================================================
// STAGE B1: SECUENCIA NO CONTACTO
// ============================================================
await createStage({
  name: 'B1. Secuencia No Contacto',
  order: 2,
  color: '#F97316',
  icon: 'PhoneMissed',
  objective: 'Ejecutar protocolo cerrado cuando el lead no atiende',
  duration: '2-3 días',
  description: 'Cuando un lead NO atiende, se activa automáticamente una secuencia cerrada. No se improvisa, no se decide caso por caso. Se ejecuta un protocolo.',
  steps: [
    { title: 'Intento #1 – Llamado telefónico', type: 'accion', description: 'No atiende → NO insistir en el momento' },
    { title: 'WhatsApp de bienvenida (5-10 min después)', type: 'accion', description: 'Plantilla CRM obligatoria' },
    { title: 'Intento #2 – Llamado al día siguiente', type: 'accion', description: 'Misma franja horaria o mejor. Si atiende → Etapa C' },
    { title: 'WhatsApp de cierre (dentro de 60 min del intento #2)', type: 'accion', description: 'SIEMPRE enviar último WhatsApp. NUNCA descartar sin aviso.' },
    { title: 'Descarte formal si no responde', type: 'accion', description: 'Mover a Oportunidades Cerradas. Motivo: "No contacto". Queda disponible para Campañas.' },
  ],
  scripts: [
    {
      name: 'WhatsApp #1 – Bienvenida',
      situation: '5-10 minutos después de que no atiende el primer llamado',
      text: 'Hola ___, soy ___ de EDISUR.\nTe llamé recién por la consulta que hiciste sobre ___.\nCuando puedas, coordinamos un llamado corto y vemos cómo avanzar.\nQuedo atento/a.',
      notes: 'Objetivo: generar reconocimiento, humanizar el contacto, habilitar respuesta.',
    },
    {
      name: 'WhatsApp #2 – Cierre de secuencia',
      situation: 'Dentro de 60 minutos del segundo intento de llamado fallido',
      text: 'Hola ___, vuelvo a escribirte por la consulta que hiciste en EDISUR.\nTe dejo el mensaje por acá y quedo atento/a si en algún momento querés retomar y verlo con más calma.\nAbrazo.',
      notes: 'Último intento. Si no responde → descarte formal.',
    },
  ],
});

// ============================================================
// STAGE C: CALIFICACIÓN + COORDINACIÓN
// ============================================================
await createStage({
  name: 'C. Calificación + Coordinación',
  order: 3,
  color: '#10B981',
  icon: 'UserCheck',
  objective: 'Determinar si califica y cerrar reunión como próximo paso',
  duration: '1 llamada',
  description: 'En una sola llamada: confirmar motivo de interés, identificar arquetipo, ver si califica, vender reunión. El próximo paso SIEMPRE es reunión.',
  steps: [
    { title: 'Confirmar motivo de consulta', type: 'accion' },
    { title: 'Identificar arquetipo (inversor / familia)', type: 'accion' },
    { title: 'Validar estado de búsqueda', type: 'accion' },
    { title: 'Determinar si califica', type: 'verificacion', description: 'Si no califica (ej: alquiler) → cierre elegante + descartar con motivo' },
    { title: 'Vender la reunión presencial', type: 'accion', description: 'No sugerir, VENDER' },
    { title: 'Checklist pase: califica + acepta reunión + fecha tentativa', type: 'verificacion' },
  ],
  scripts: [
    {
      name: 'Confirmación de consulta',
      situation: 'Apertura de la calificación',
      text: '"Buenísimo, te llamo por la consulta que hiciste sobre ___.\nContame un poco qué te motivó a escribirnos."',
    },
    {
      name: 'Identificación de arquetipo',
      situation: 'Después de la confirmación',
      text: '"¿Esto lo estás pensando más como inversión o para vivir?"',
      notes: 'Pregunta clave. No se negocia.',
    },
    {
      name: 'Validación de estado',
      situation: 'Después de identificar arquetipo',
      text: '"¿Ya estás viendo opciones concretas o recién empezando a evaluar?"',
    },
    {
      name: 'Salida elegante (NO califica)',
      situation: 'Si el lead no califica (ej: busca alquiler)',
      text: '"Perfecto, te agradezco la claridad.\nEn este caso nosotros trabajamos con venta, así que no te quiero hacer perder tiempo.\nSi más adelante volvés a evaluar compra, encantados de ayudarte."',
      notes: 'Descartar + motivo. Elegible para campañas si aplica.',
    },
    {
      name: 'Venta de la reunión',
      situation: 'Si califica → vender reunión',
      text: '"Para no marearte con información por teléfono,\nlo que hacemos es una reunión corta en la oficina donde filtramos opciones y te vas con claridad real.\nEs la mejor forma de avanzar bien.\n¿Te parece que lo veamos así?"',
    },
  ],
  questions: [
    { question: '¿Esto lo estás pensando más como inversión o para vivir?', category: 'necesidad', purpose: 'Identificar arquetipo', listen: 'Inversor vs familia cambia todo el approach' },
    { question: '¿Ya estás viendo opciones concretas o recién empezando a evaluar?', category: 'timeline', purpose: 'Estado de búsqueda', listen: 'Urgencia y nivel de madurez' },
    { question: '¿Qué te motivó a escribirnos?', category: 'necesidad', purpose: 'Entender trigger de búsqueda' },
  ],
});

// ============================================================
// STAGE E: ZONA GRIS TELEFÓNICA
// ============================================================
await createStage({
  name: 'E. Zona Gris Telefónica',
  order: 4,
  color: '#EF4444',
  icon: 'AlertTriangle',
  objective: 'Llevar a reunión en un ciclo de 7 días. Etapa más peligrosa del funnel.',
  duration: 'Máx 7 días por ciclo (máx 2 ciclos)',
  description: 'Lead atiende, califica, pero no avanza a reunión. Mini-etapa con reglas claras: un solo objetivo (reunión), un solo ciclo (7 días), un solo criterio (interés activo o descarte).',
  steps: [
    { title: 'Clasificar tipo de "pero"', type: 'accion', description: 'Tiempo ("ahora no puedo"), Etapa ("recién arranco"), Comparación ("estoy viendo"), Precio ("pasame valores")' },
    { title: 'Aplicar script de encuadre', type: 'accion' },
    { title: 'Enviar brochure si corresponde (máx 1 desarrollo)', type: 'accion', description: '❌ Precio prohibido sin reunión. ❌ Planimetría solo ubicación general, NO disponibilidad exacta (por competidores/mystery shoppers).' },
    { title: 'Agendar próximo contacto (SIEMPRE)', type: 'accion' },
    { title: 'Evaluar interés activo', type: 'verificacion', description: 'Activo: responde, pregunta, acepta hablar. Inactivo: no responde, evita, posterga sin fecha.' },
    { title: 'Si interés activo → loop E (máx 2 ciclos). Sin interés → descartar + motivo.', type: 'verificacion' },
  ],
  scripts: [
    {
      name: 'Encuadre base (obligatorio)',
      situation: 'Cuando el lead pone un "pero" para no ir a reunión',
      text: '"Perfecto, lo entiendo.\nJustamente para eso está la reunión, para ordenar todo y que no pierdas tiempo comparando sin contexto.\nSi te parece, lo retomamos en unos días y lo vemos bien."',
      notes: 'Siempre se agenda un próximo contacto.',
    },
  ],
});

// ============================================================
// STAGE D: PRE-REUNIÓN
// ============================================================
await createStage({
  name: 'D. Pre-Reunión (Preparación)',
  order: 5,
  color: '#6366F1',
  icon: 'ClipboardList',
  objective: 'Llegar a la reunión con control, no a improvisar',
  duration: '15-30 min antes de la reunión',
  description: 'No es investigar para vender: es investigar para hacer mejores preguntas. El asesor SIEMPRE debe revisar notas del llamado, identificar arquetipo y producto, y llegar con una hipótesis.',
  steps: [
    { title: 'Revisar notas del llamado', type: 'accion' },
    { title: 'Confirmar nombre completo', type: 'verificacion' },
    { title: 'Confirmar producto consultado', type: 'verificacion' },
    { title: 'Confirmar arquetipo preliminar (inversor / familia)', type: 'verificacion' },
    { title: 'Confirmar estado de búsqueda (recién arranca / comparando)', type: 'verificacion' },
    { title: 'Definir qué espera resolver en la reunión', type: 'accion' },
    { title: 'Definir qué NO se va a mostrar (disciplina)', type: 'accion' },
    { title: 'Tener listas las preguntas de calificación según arquetipo', type: 'verificacion' },
    { title: 'Si no puede responder el checklist → NO empieza la reunión', type: 'verificacion', description: 'Regla estricta.' },
  ],
});

// ============================================================
// STAGE F: REUNIÓN PRESENCIAL – BASE
// ============================================================
await createStage({
  name: 'F. Reunión Presencial – Base',
  order: 6,
  color: '#0EA5E9',
  icon: 'Users',
  objective: 'Entender qué necesita de verdad, filtrar opciones, salir con próximo paso concreto',
  duration: '30-60 min',
  description: 'Columna vertebral del playbook. NO es cerrar ni mostrar todo. Es ordenar y avanzar. Regla de oro: mientras más clara la indagación, menos material se muestra.',
  steps: [
    { title: 'Apertura con encuadre', type: 'accion' },
    { title: 'Confirmar arquetipo (inversor / familia)', type: 'accion', description: 'Registrar en CRM' },
    { title: 'Confirmar producto (lote / ladrillo)', type: 'accion', description: 'Registrar en CRM' },
    { title: 'Indagación base (SPIN suave)', type: 'accion' },
    { title: 'Determinar: ¿Busca LOTE o LADRILLO?', type: 'verificacion', description: 'Lote → Etapa G. Ladrillo → Etapa H.' },
  ],
  scripts: [
    {
      name: 'Apertura de reunión',
      situation: 'Al iniciar la reunión presencial',
      text: '"Gracias por venir.\nLa idea de esta reunión es entender bien qué estás buscando y ver si tiene sentido avanzar con alguna opción concreta.\nSi vemos que no, también te lo voy a decir con total honestidad."',
      notes: 'Autoridad + tranquilidad + encuadre.',
    },
    {
      name: 'Confirmación de arquetipo',
      situation: 'Después de la apertura',
      text: '"Para ordenar bien la charla, ¿esto lo estás pensando más como inversión o para vivir?"',
    },
    {
      name: 'Confirmación de producto',
      situation: 'Después de confirmar arquetipo',
      text: '"Y dentro de eso, ¿te estás inclinando más por lote o por un departamento/casa ya construida?"',
    },
  ],
  questions: [
    { question: '¿Qué te llevó a empezar a buscar ahora?', category: 'necesidad', purpose: 'Entender trigger y urgencia' },
    { question: '¿Qué cosas son las que hoy más te importan que se cumplan?', category: 'necesidad', purpose: 'Criterios de decisión' },
    { question: '¿Qué ya viste o comparaste hasta ahora?', category: 'competencia', purpose: 'Conocer alternativas y nivel de información' },
  ],
});

// ============================================================
// STAGE G: REUNIÓN LOTE
// ============================================================
await createStage({
  name: 'G. Reunión Lote',
  order: 7,
  color: '#22C55E',
  icon: 'Map',
  objective: 'Filtrar zonas y opciones. Definir próximo paso concreto.',
  duration: '30-45 min',
  description: 'Herramientas: Gestar (mapa + disponibilidad general) y Google Maps. Prohibido: brochures, listados masivos, precios sin contexto.',
  steps: [
    { title: 'Trabajar con mapa (Gestar + Maps)', type: 'accion' },
    { title: 'Indagación específica lote', type: 'accion' },
    { title: 'Registrar en CRM: zona, uso, horizonte, condiciones', type: 'accion' },
    { title: 'Cierre de reunión con próximo paso agendado', type: 'accion', description: 'Nunca termina en "lo veo y te aviso".' },
    { title: 'Checklist: arquetipo confirmado, zona y criterios definidos, próximo paso con fecha', type: 'verificacion' },
  ],
  scripts: [
    {
      name: 'Trabajo con mapa',
      situation: 'Al iniciar exploración de opciones',
      text: '"Primero veamos ubicación y contexto,\ndespués afinamos opciones."',
    },
    {
      name: 'Cierre de reunión lote',
      situation: 'Al finalizar la reunión – OBLIGATORIO',
      text: '"Perfecto. Para no dejar esto en el aire,\nel próximo paso lógico es que te prepare 1 o 2 opciones que realmente encajen con lo que hablamos.\n¿Te parece si lo vemos juntos el ___ a las ___?"',
      notes: 'Si queda próximo paso → Etapa I. Si no → Etapa K (Zona gris post-reunión).',
    },
  ],
  questions: [
    { question: '¿Esto lo pensás más como resguardo de valor o con idea de construir?', category: 'necesidad', purpose: 'Uso previsto del lote' },
    { question: '¿Qué horizonte de tiempo tenés?', category: 'timeline', purpose: 'Urgencia y planificación' },
    { question: '¿Hay algo que sí o sí tenga que cumplir el lote?', category: 'necesidad', purpose: 'Condiciones no negociables' },
  ],
});

// ============================================================
// STAGE H: REUNIÓN LADRILLO
// ============================================================
await createStage({
  name: 'H. Reunión Ladrillo + Visita',
  order: 8,
  color: '#F59E0B',
  icon: 'Building',
  objective: 'Ordenar necesidad real, evitar dispersión, definir visita o siguiente paso claro',
  duration: '30-60 min + visita opcional',
  description: 'Regla EDISUR: máximo 2 opciones. Si no entran en 2, falta indagación. Riesgo: mostrar demasiados proyectos/precios confunde y frena decisión. Visita: confirmar sensaciones, no generar más dudas.',
  steps: [
    { title: 'Indagación profunda ladrillo', type: 'accion' },
    { title: 'Filtrar a máximo 2 opciones', type: 'accion', description: 'Regla EDISUR: si no entran en 2, falta indagación.' },
    { title: 'Mostrar brochure puntual + planos solo si suman', type: 'accion', description: '❌ No mostrar "todo lo disponible". ❌ No comparar precios sin encuadre.' },
    { title: 'Registrar: tipología, uso, presupuesto, urgencia, criterios de descarte', type: 'accion' },
    { title: 'Decidir: ¿Se agenda/realiza visita?', type: 'verificacion', description: 'Sí → Visita. No → Post-reunión.' },
    { title: 'VISITA: Encuadre previo + Post-visita obligatoria', type: 'accion', description: 'Preguntar: "¿Esto se acerca a lo que buscabas o lo descartamos?" Registrar reacción, objeciones, interés.' },
    { title: 'Checklist: opciones filtradas, reacción clara, próximo paso definido', type: 'verificacion' },
  ],
  scripts: [
    {
      name: 'Indagación ladrillo',
      situation: 'Antes de mostrar opciones',
      text: '"Antes de mostrarte opciones, quiero entender bien esto."\n"¿Es para vivir o invertir?"\n"¿Qué te haría decir \'este sí\'?"\n"¿Qué descartás de plano?"',
    },
    {
      name: 'Encuadre pre-visita',
      situation: 'Antes de ir a ver la propiedad',
      text: '"La visita es para confirmar sensaciones, no para sumar confusión.\nDespués de verla, definimos cómo seguimos."',
    },
    {
      name: 'Post-visita',
      situation: 'Inmediatamente después de visitar la propiedad',
      text: '"¿Esto se acerca a lo que estabas buscando o lo descartamos?"',
      notes: 'Registrar: reacción, objeciones reales, interés.',
    },
  ],
  questions: [
    { question: '¿Es para vivir o invertir?', category: 'necesidad', purpose: 'Uso del inmueble' },
    { question: '¿Qué te haría decir "este sí"?', category: 'necesidad', purpose: 'Criterios de aceptación' },
    { question: '¿Qué descartás de plano?', category: 'necesidad', purpose: 'Criterios de descarte' },
  ],
});

// ============================================================
// STAGE I: POST-REUNIÓN
// ============================================================
await createStage({
  name: 'I. Post-Reunión',
  order: 9,
  color: '#14B8A6',
  icon: 'MessageCircle',
  objective: 'Cerrar la reunión con dirección. Evitar que se enfríe.',
  duration: 'Dentro de las 2 horas post-reunión',
  description: 'Regla madre: toda reunión termina con mensaje post-reunión enviado el mismo día. Acción obligatoria: WhatsApp estructurado + definición del próximo paso + registro en CRM.',
  steps: [
    { title: 'Enviar WhatsApp post-reunión (dentro de 2 horas)', type: 'accion', description: 'Regla madre: SIEMPRE el mismo día.' },
    { title: 'Definir próximo paso explícito', type: 'accion' },
    { title: 'Registrar en CRM', type: 'accion' },
    { title: 'Checklist: WhatsApp enviado + próximo paso + fecha tentativa', type: 'verificacion', description: 'Si "después vemos" o sin agenda → Etapa K.' },
  ],
  scripts: [
    {
      name: 'WhatsApp post-reunión (BASE)',
      situation: 'Dentro de las 2 horas posteriores a la reunión',
      text: '"Gracias por venir hoy, [Nombre].\nMe quedó claro que estás buscando [resumen breve y personalizado].\nPara avanzar con orden, el próximo paso es [llamado / reunión / visita].\n¿Te parece si lo vemos el [día] a las [hora]?"',
      notes: 'Personalizado, corto, con dirección. ❌ No enviar listados masivos, disponibilidad con precios ni info nueva no hablada.',
    },
  ],
});

// ============================================================
// STAGE K: ZONA GRIS POST-REUNIÓN
// ============================================================
await createStage({
  name: 'K. Zona Gris Post-Reunión',
  order: 10,
  color: '#DC2626',
  icon: 'AlertOctagon',
  objective: 'Reactivar sin presionar. Forzar definición.',
  duration: 'Ciclo de 7 días',
  description: 'El lead ya conoce EDISUR, tuvo reunión/visita, pero no avanzó. Acá se pierden más operaciones que en cualquier otra etapa. No esperar pasivamente, no bombardear info. Seguimiento con criterio y timing.',
  steps: [
    { title: 'Día 0 – WhatsApp post-reunión (etapa I)', type: 'accion' },
    { title: 'Día 3 – WhatsApp de reactivación', type: 'accion' },
    { title: 'Día 7 – Llamado de definición', type: 'accion' },
    { title: 'Evaluar: ¿Se logra reactivar y agendar?', type: 'verificacion', description: 'Sí → Seguimiento. No → evaluar descarte.' },
    { title: 'Criterio de descarte: no responde 2 intentos + 1 llamado, sin intención concreta, evita definir', type: 'verificacion', description: 'Registrar motivo → Campañas.' },
  ],
  scripts: [
    {
      name: 'Día 3 – Reactivación',
      situation: '3 días después de la reunión',
      text: '"Hola [Nombre], te escribo para retomar lo que vimos el otro día.\n¿Pudiste revisar las opciones que charlamos o preferís que lo veamos juntos 10 minutos?"',
    },
    {
      name: 'Día 7 – Definición',
      situation: '7 días después de la reunión (llamado telefónico)',
      text: '"Te llamo para ver si seguimos avanzando o si preferís dejarlo en pausa por ahora.\nPrefiero ser prolijo y respetar tu tiempo."',
    },
  ],
});

// ============================================================
// STAGE J: SEGUIMIENTO + CAMPAÑAS
// ============================================================
await createStage({
  name: 'J. Seguimiento y Campañas',
  order: 11,
  color: '#A855F7',
  icon: 'RefreshCw',
  objective: 'Acompañar leads vivos, no perseguirlos',
  duration: 'Continuo',
  description: 'Dos universos: Seguimiento activo (leads con interés, timing claro, agenda definida) y Campañas (leads cerrados/reactivables, llamados proactivos, sin expectativa inmediata).',
  steps: [
    { title: 'Seguimiento activo: leads con interés → timing claro + agenda', type: 'accion' },
    { title: 'Campañas: leads cerrados/reactivables → llamados proactivos', type: 'accion', description: 'Si reaccionan → vuelven a etapa C' },
  ],
  scripts: [
    {
      name: 'Script base Campañas',
      situation: 'Llamando a leads que fueron cerrados pero son reactivables',
      text: '"Hola [Nombre], te llamo porque en su momento habías consultado por [producto] y quería saber si seguía teniendo sentido retomarlo o si quedó en pausa."',
    },
  ],
});

// ============================================================
// STAGE L+M: SEGUIMIENTO CON INTERÉS + LLAMADO DUDAS
// ============================================================
await createStage({
  name: 'L/M. Dudas + Proceso + Intento Seña',
  order: 12,
  color: '#EC4899',
  icon: 'PhoneCall',
  objective: 'Aclarar cómo se opera, reducir incertidumbre, avanzar a seña',
  duration: '1 llamado o reunión',
  description: 'El lead mostró interés, respondió seguimiento, necesita resolver dudas. Se explica el proceso y se busca seña. Puede ser por llamado (M) o reunión presencial (N).',
  steps: [
    { title: 'Decidir instancia: llamado o reunión presencial', type: 'accion' },
    { title: 'Explicar proceso: seña, boleto, legales, tiempos, firma', type: 'accion', description: 'Sin tecnicismos. Sin apuro.' },
    { title: 'Intento explícito de seña', type: 'accion', description: 'Seña monetaria o de palabra.' },
    { title: 'Checklist: dudas despejadas + compromiso verbal/monetario + fecha firma', type: 'verificacion', description: 'Si no hay avance → vuelve a Zona Gris (K).' },
  ],
  scripts: [
    {
      name: 'Apertura llamado dudas',
      situation: 'Al iniciar llamado de dudas y proceso',
      text: '"Te llamo para ordenar dudas y contarte bien cómo sigue el proceso si avanzamos.\nLa idea es que tengas todo claro antes de tomar una decisión."',
    },
    {
      name: 'Intento de seña (elegante)',
      situation: 'Después de explicar proceso',
      text: '"Con lo que ya vimos, el próximo paso lógico sería avanzar con una seña para reservar la unidad.\nPuede ser monetaria o, si te resulta más cómodo, dejarla de palabra y coordinamos la firma."',
    },
    {
      name: 'Apertura reunión presencial dudas',
      situation: 'Si se optó por reunión presencial en vez de llamado',
      text: '"La idea de esta reunión es ordenar todas las dudas que tengas y contarte, paso a paso, cómo sigue el proceso si avanzamos.\nPrefiero que tengas todo claro antes de tomar cualquier decisión."',
    },
  ],
});

// ============================================================
// STAGE O: SEÑA + COMPROMISO
// ============================================================
await createStage({
  name: 'O. Seña + Compromiso de Firma',
  order: 13,
  color: '#059669',
  icon: 'BadgeCheck',
  objective: 'Formalizar compromiso comercial y activar proceso interno',
  duration: 'Inmediato',
  description: 'Registrar seña, acordar fecha de firma, pasar operación en el sistema, confirmar al cliente.',
  steps: [
    { title: 'Registrar seña en Gestar', type: 'accion' },
    { title: 'Acordar fecha de firma', type: 'accion' },
    { title: 'Pasar la operación en el sistema', type: 'accion' },
    { title: 'Confirmar al cliente el siguiente paso', type: 'accion' },
    { title: 'Checklist: seña registrada + fecha firma + operación cargada', type: 'verificacion' },
  ],
  scripts: [
    {
      name: 'Confirmación de seña',
      situation: 'Al formalizar la seña',
      text: '"Perfecto. Entonces dejamos asentada la seña y avanzamos con la preparación del boleto.\nTe voy a pedir unos datos y coordinamos la firma para el [día]."',
    },
  ],
});

// ============================================================
// STAGE P+Q: DATOS + BOLETO
// ============================================================
await createStage({
  name: 'P/Q. Datos + Confección Boleto',
  order: 14,
  color: '#7C3AED',
  icon: 'FileText',
  objective: 'Recolectar datos y confeccionar boleto sin demoras',
  duration: '1-3 días',
  description: 'Solicitar todos los datos necesarios para confección legal. Confeccionar boleto. Si faltan datos → loop interno.',
  steps: [
    { title: 'Solicitar datos: nombre, DNI, estado civil, CUIT/CUIL, domicilio, email, modalidad de pago', type: 'accion' },
    { title: 'Confeccionar boleto con datos recibidos', type: 'accion' },
    { title: 'Si falta info → volver a solicitar (loop interno)', type: 'verificacion' },
  ],
  scripts: [
    {
      name: 'Solicitud de datos',
      situation: 'Después de confirmar seña',
      text: '"Para avanzar con el boleto necesito algunos datos básicos.\nTe los voy a pedir ahora así evitamos idas y vueltas."',
    },
  ],
});

// ============================================================
// STAGE R: LEGALES
// ============================================================
await createStage({
  name: 'R. Derivación a Legales',
  order: 15,
  color: '#475569',
  icon: 'Scale',
  objective: 'Validación jurídica antes de firma',
  duration: 'Variable (interno)',
  description: 'Se envía boleto a Legales para revisión formal y legal. Loop interno si hay observaciones (no comercial, el cliente no vuelve a zona gris).',
  steps: [
    { title: 'Enviar boleto a Legales', type: 'accion' },
    { title: 'Revisión formal y legal', type: 'verificacion' },
    { title: 'Si Legales aprueba → activar firma. Si no → corregir (loop interno P/Q).', type: 'verificacion' },
  ],
});

// ============================================================
// STAGE S: PRE-FIRMA
// ============================================================
await createStage({
  name: 'S. Activar Reunión de Firma',
  order: 16,
  color: '#0891B2',
  icon: 'CalendarCheck',
  objective: 'Preparar experiencia cuidada y profesional de firma',
  duration: '1-2 días antes',
  description: 'Coordinar fecha y hora, asignar cochera, preparar cartel de bienvenida, sala y agenda interna.',
  steps: [
    { title: 'Coordinar fecha y hora de firma', type: 'accion' },
    { title: 'Asignar cochera y avisar por WhatsApp', type: 'accion' },
    { title: 'Preparar cartel de bienvenida', type: 'accion' },
    { title: 'Preparar sala', type: 'accion' },
    { title: 'Preparar agenda interna', type: 'accion' },
  ],
  scripts: [
    {
      name: 'WhatsApp pre-firma',
      situation: 'Confirmación de la reunión de firma',
      text: '"Te confirmo la reunión de firma para el [día] a las [hora].\nTe asignamos la cochera [número].\nTe esperamos."',
    },
  ],
});

// ============================================================
// STAGE T: FIRMA
// ============================================================
await createStage({
  name: 'T. Reunión de Firma de Boleto',
  order: 17,
  color: '#16A34A',
  icon: 'PenTool',
  objective: 'Cerrar la operación con experiencia premium y ordenada',
  duration: '1 hora',
  description: 'Secuencia fija: recepción con cartel, café/agua, ingreso de abogados, revisión final, firma del boleto.',
  steps: [
    { title: 'Recepción con cartel de bienvenida', type: 'accion' },
    { title: 'Café / agua', type: 'accion' },
    { title: 'Ingreso de abogados', type: 'accion' },
    { title: 'Revisión final del boleto', type: 'verificacion' },
    { title: 'Firma del boleto', type: 'accion' },
  ],
});

// ============================================================
// STAGE U: FINANZAS Y CIERRE
// ============================================================
await createStage({
  name: 'U. Finanzas: Pago y Cierre',
  order: 18,
  color: '#CA8A04',
  icon: 'DollarSign',
  objective: 'Finalizar operación administrativa y financiera',
  duration: 'Según modalidad',
  description: 'Derivación a Finanzas, pago según modalidad acordada, confirmación final. Lead cerrado como Venta. Fin del proceso comercial.',
  steps: [
    { title: 'Derivar a Finanzas', type: 'accion' },
    { title: 'Pago según modalidad acordada', type: 'accion' },
    { title: 'Confirmación final', type: 'verificacion' },
    { title: 'Cerrar lead como VENTA', type: 'accion' },
  ],
});

// ============================================================
// OBJECTIONS (Global)
// ============================================================
console.log('Creating objections...');

const objections = [
  {
    objection: 'Pasame precios por WhatsApp',
    category: 'precio',
    severity: 'alto',
    responses: [
      { text: 'Te entiendo, pero por teléfono los precios pierden contexto. En la reunión los vemos con todas las variables.', type: 'reencuadre', example: 'Redirigir siempre a reunión' },
      { text: 'Los precios cambian según financiación, ubicación y momento. Mejor lo vemos en persona.', type: 'reencuadre', example: 'Generar necesidad de la reunión' },
    ],
    signals_working: 'El lead acepta que tiene sentido verlo en persona',
    if_not_working: 'Enviar brochure de 1 desarrollo pero NO precios. Reintento en 3 días.',
  },
  {
    objection: 'Ahora no puedo / no es el momento',
    category: 'tiempo',
    severity: 'medio',
    responses: [
      { text: '"Justamente, la reunión es corta y sirve para ordenar. Así cuando sea el momento, ya tenés todo claro."', type: 'reencuadre', example: 'Minimizar el compromiso de tiempo' },
      { text: '"Perfecto, ¿cuándo te viene mejor? Así lo agendamos y no se pierde."', type: 'pregunta', example: 'Forzar fecha concreta' },
    ],
    signals_working: 'Propone fecha alternativa',
    if_not_working: 'Mantener en Zona Gris (E), ciclo de 7 días.',
  },
  {
    objection: 'Estoy viendo opciones / tengo que comparar',
    category: 'competencia',
    severity: 'medio',
    responses: [
      { text: '"Justamente, la reunión te ayuda a comparar con criterio en vez de solo por precio."', type: 'reencuadre', example: 'Posicionar la reunión como herramienta de comparación' },
      { text: '"¿Qué es lo más importante para vos a la hora de comparar?"', type: 'pregunta', example: 'Entender criterios de decisión' },
    ],
    signals_working: 'Comparte sus criterios de comparación',
    if_not_working: 'Enviar 1 brochure, recontactar en 5 días.',
  },
  {
    objection: 'Lo pienso y te aviso',
    category: 'tiempo',
    severity: 'alto',
    responses: [
      { text: '"¿Qué es lo que necesitás pensar? Así te ayudo a resolver eso ahora."', type: 'pregunta', example: 'Descubrir la objeción real detrás' },
      { text: '"Te entiendo. Para no dejarlo en el aire, ¿te parece si lo retomamos el viernes?"', type: 'reencuadre', example: 'Agendar recontacto concreto' },
    ],
    signals_working: 'Revela la duda real o acepta fecha de recontacto',
    if_not_working: 'Mover a Zona Gris post-reunión (K), ciclo 7 días.',
  },
  {
    objection: 'Tengo que consultarlo con mi pareja / familia',
    category: 'autoridad',
    severity: 'medio',
    responses: [
      { text: '"Por supuesto. ¿Querés que coordinemos una reunión donde vengan los dos? Así resolvemos todo junto."', type: 'pregunta', example: 'Incluir al decisor' },
      { text: '"¿Hay algo que pueda prepararte para que sea más fácil charlarlo en casa?"', type: 'empatia', example: 'Dar herramientas para la conversación interna' },
    ],
    signals_working: 'Acepta traer al co-decisor',
    if_not_working: 'Agendar seguimiento a 3 días.',
  },
  {
    objection: 'No estoy seguro de que sea buena inversión',
    category: 'confianza',
    severity: 'alto',
    responses: [
      { text: '"¿Qué te genera duda puntualmente? ¿La zona, el producto, los tiempos?"', type: 'pregunta', example: 'Identificar la duda específica' },
      { text: '"Entiendo. Justamente en la reunión vemos números reales y casos concretos de cómo evolucionó la zona."', type: 'evidencia', example: 'Ofrecer datos concretos' },
    ],
    signals_working: 'Expresa la duda específica y acepta verla en detalle',
    if_not_working: 'Enviar caso de éxito puntual, recontactar en 5 días.',
  },
];

for (let i = 0; i < objections.length; i++) {
  const o = objections[i];
  await api('playbook_objections', {
    playbook_id: PB,
    objection: o.objection,
    category: o.category,
    severity: o.severity,
    responses: o.responses,
    signals_working: o.signals_working,
    if_not_working: o.if_not_working,
    sort_order: i,
  });
}

console.log('\n✅ Playbook EDISUR creado exitosamente!');
console.log(`   ID: ${PB}`);
console.log(`   Stages: 19`);
console.log(`   URL: /playbook/${PB}`);
