// Script to create Agro playbook with all stages, steps, scripts, questions, objections, and items
const SB_URL = 'https://avgfqdtfmoqkjfgtvrtg.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2Z2ZxZHRmbW9xa2pmZ3R2cnRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYwMDY1NywiZXhwIjoyMDg1MTc2NjU3fQ.cBuGvG3uiRJ5UL3c0h-UTL056brKIczBYCG4I404e-0';
const ORG_ID = 'e70fc632-81c6-49d4-afee-25b79fe8b331';

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
if (!createdBy) throw new Error('No user found for org ' + ORG_ID);

console.log('Creating Playbook Agro...');

// 1. Create playbook
const [playbook] = await api('playbooks', {
  organization_id: ORG_ID,
  name: 'Playbook Comercial Agro',
  description: 'Playbook comercial para venta de insumos agropecuarios. Desde la entrada del lead hasta el post-venta. Incluye scripts, checklists, manejo de objeciones y zona gris.',
  type: 'por_industria',
  industry: 'Agro / Insumos agropecuarios',
  product_service: 'Insumos agropecuarios',
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

  // Items (checklists, resources)
  if (data.items) {
    for (let i = 0; i < data.items.length; i++) {
      const it = data.items[i];
      await api('playbook_items', {
        playbook_id: PB,
        stage_id: SID,
        item_type: it.type || 'checklist',
        title: it.title,
        content: it.content,
        sort_order: i,
      });
    }
  }

  return SID;
}

// ============================================================
// STAGE A: ENTRADA DEL LEAD + ASIGNACION
// ============================================================
await createStage({
  name: 'A. Entrada del Lead + Asignacion',
  order: 0,
  color: '#3B82F6',
  icon: 'Inbox',
  objective: 'Registrar, asignar y contactar al lead en menos de 1 hora',
  duration: '< 1 hora',
  description: 'El lead ingresa por consulta web, WhatsApp, llamado directo, referido o feria/exposicion. Se asigna a un asesor por orden de llegada. Contacto obligatorio en menos de 1 hora.',
  steps: [
    { title: 'Registrar lead en CRM', type: 'accion', content: 'Registrar nombre, telefono, producto consultado, zona y canal de origen.' },
    { title: 'Asignarse como responsable', type: 'accion', content: 'Orden de llegada obligatorio. No hay excusas.' },
    { title: 'Ver producto consultado', type: 'accion', content: 'Identificar que producto o categoria consulto (herbicida, fungicida, fertilizante, semilla, coadyuvante, etc.).' },
    { title: 'Ver zona productiva', type: 'accion', content: 'Identificar zona productiva para evaluar logistica y potencial.' },
    { title: 'Identificar si ya es cliente', type: 'verificacion', content: 'Buscar en el CRM si ya tiene historial de compras.' },
    { title: 'Revisar historial de compras', type: 'accion', content: 'Si existe, revisar compras anteriores, volumen, productos y frecuencia.', required: false },
    { title: 'Contactar dentro del tiempo maximo', type: 'verificacion', content: 'Ideal: < 15 min. Aceptable: < 1 hora. Inaceptable: > 1 hora.' },
  ],
  items: [
    {
      type: 'checklist',
      title: 'Checklist operativo inmediato',
      content: {
        items: ['Registrar en CRM', 'Asignarse como responsable', 'Ver producto consultado', 'Ver zona productiva', 'Identificar si ya es cliente', 'Revisar historial de compras'],
        note: 'Tiempo max: Ideal < 15 min, Aceptable < 1 hora.',
      },
    },
  ],
});

// ============================================================
// STAGE B: PRIMER CONTACTO - LLAMADO
// ============================================================
await createStage({
  name: 'B. Primer Contacto - Llamado',
  order: 1,
  color: '#8B5CF6',
  icon: 'Phone',
  objective: 'Confirmar datos tecnicos y definir proximo paso en 5-10 min',
  duration: '5-10 min',
  description: 'Contactar, entender necesidad, calificar y definir proximo paso. NO es cerrar ni pasar precios. SI es tomar control, ordenar y llevar a cotizacion o visita.',
  steps: [
    { title: 'Apertura - Control + Contexto', type: 'accion', content: '"Hola ___, como estas? Te habla ___ de [Empresa]. Te llamo por la consulta que hiciste sobre ___, es correcto?"' },
    { title: 'Micro-encuadre tecnico', type: 'accion', content: '"Antes de pasarte numeros, quiero entender bien el lote y el momento del cultivo asi te asesoro correctamente." Esto instala autoridad tecnica y evita guerra de precios.' },
    { title: 'Confirmar cultivo', type: 'verificacion', content: 'Que cultivo esta trabajando? (soja, maiz, trigo, girasol, sorgo, etc.)' },
    { title: 'Confirmar superficie', type: 'verificacion', content: 'Cuantas hectareas?' },
    { title: 'Confirmar zona', type: 'verificacion', content: 'En que zona productiva? (nucleo, marginal, etc.)' },
    { title: 'Confirmar momento del ciclo', type: 'verificacion', content: 'En que estado esta hoy el lote? (siembra, emergencia, macollaje, floracion, llenado, etc.)' },
    { title: 'Confirmar si ya tiene proveedor', type: 'verificacion', content: 'Ya viene trabajando con otro proveedor o esta evaluando alternativas? Clasificar: Fiel / Comparando / Sin proveedor estable.' },
    { title: 'Confirmar nivel de decision', type: 'verificacion', content: 'Si la propuesta cierra tecnica y economicamente, esta en condiciones de definir ahora o lo esta evaluando con mas tiempo?' },
    { title: 'Definir proximo paso', type: 'accion', content: 'Cotizacion, visita a campo o reunion tecnica. Siempre con dia y hora. Nunca: "Te la mando y vemos".' },
  ],
  scripts: [
    {
      name: 'Apertura de llamada',
      situation: 'Lead nuevo consulta por producto',
      text: 'Hola ___, como estas?\nTe habla ___ de [Empresa].\nTe llamo por la consulta que hiciste sobre ___, es correcto?',
      notes: 'Tono amable, directo. No explicar productos ni pasar precios.',
    },
    {
      name: 'Micro-encuadre tecnico',
      situation: 'Instalar autoridad tecnica antes de hablar de precios',
      text: 'Antes de pasarte numeros, quiero entender bien el lote y el momento del cultivo asi te asesoro correctamente.',
      notes: 'Eleva el estandar y evita guerra de precios. Posiciona como asesor, no como vendedor.',
    },
    {
      name: 'Diagnostico tecnico',
      situation: 'Obtener datos del lote para poder cotizar',
      text: 'Que cultivo estas trabajando?\nCuantas hectareas?\nEn que zona?\nEn que estado esta hoy el lote?',
      notes: 'Registrar todo. Sin estos datos no se puede cotizar con responsabilidad.',
    },
    {
      name: 'Situacion actual - Proveedor',
      situation: 'Clasificar situacion competitiva',
      text: 'Ya venis trabajando con algun proveedor o estas evaluando alternativas?',
      notes: 'Clasificar: Fiel / Comparando / Sin proveedor estable. No hablar mal de la competencia.',
    },
    {
      name: 'Nivel de decision',
      situation: 'Detectar intencion real de compra',
      text: 'Si la propuesta cierra tecnica y economicamente, estas en condiciones de definir ahora o lo estas evaluando con mas tiempo?',
      notes: 'No presionar. Solo clasificar: Urgente / Evaluando / Sin apuro.',
    },
    {
      name: 'Venta del proximo paso',
      situation: 'Cerrar la llamada con dia y hora',
      text: 'Con lo que me contas, prefiero prepararte una propuesta bien ajustada y no tirarte un precio al aire.\nTe parece si la vemos hoy a la tarde por llamada o manana en el campo?',
      notes: 'Nunca: "Te la mando y vemos." Siempre alternativa cerrada con dia y hora.',
    },
  ],
  questions: [
    { question: 'Que cultivo estas trabajando?', category: 'necesidad', purpose: 'Dato basico para cotizar', listen: 'Soja, maiz, trigo, girasol, sorgo' },
    { question: 'Cuantas hectareas?', category: 'necesidad', purpose: 'Determinar volumen y potencial', listen: 'Numero concreto. Ojo con respuestas vagas.' },
    { question: 'En que zona productiva?', category: 'necesidad', purpose: 'Evaluar logistica y tipo de suelo', listen: 'Zona nucleo, marginal, distancia' },
    { question: 'Ya tenes proveedor o estas evaluando?', category: 'competencia', purpose: 'Situacion competitiva', listen: 'Fiel, comparando, sin proveedor estable' },
  ],
  items: [
    {
      type: 'checklist',
      title: 'Checklist de calificacion telefonica',
      content: {
        items: ['Cultivo', 'Hectareas', 'Zona', 'Estado del cultivo', 'Si ya tiene proveedor', 'Nivel de decision', 'Volumen estimado'],
        note: 'Si no puede responder esto, no puede cotizar.',
      },
    },
  ],
});

// ============================================================
// STAGE B1: SECUENCIA NO CONTACTO
// ============================================================
await createStage({
  name: 'B1. Secuencia No Contacto',
  order: 2,
  color: '#F59E0B',
  icon: 'PhoneMissed',
  objective: 'Agotar todas las vias de contacto antes de descartar',
  duration: '48 horas',
  description: 'Secuencia obligatoria cuando el lead no atiende. No se improvisa, no se decide caso por caso. Se ejecuta un protocolo cerrado.',
  steps: [
    { title: 'Llamado inicial', type: 'accion', content: 'Primer intento de contacto telefonico. Si no atiende, NO insistir en el momento.' },
    { title: 'WhatsApp inmediato (5-10 min)', type: 'accion', content: 'Mensaje de WhatsApp inmediato tras llamado fallido. Personalizado con producto consultado.' },
    { title: 'Segundo intento de llamado (dia siguiente)', type: 'accion', content: 'Segundo intento telefonico, misma franja horaria o mejor. Si atiende -> Etapa B.' },
    { title: 'Ultimo mensaje de cierre', type: 'accion', content: 'Mensaje final antes de descartar. Dejar puerta abierta.' },
    { title: 'Descarte formal', type: 'accion', content: 'Registrar motivo: No contacto. Queda disponible para reactivacion futura.' },
  ],
  scripts: [
    {
      name: 'WhatsApp #1 - Post llamado',
      situation: 'Lead no atendio el primer llamado (enviar en 5-10 min)',
      text: 'Hola ___, soy ___ de [Empresa].\nTe llame por la consulta sobre ___.\nPara cotizar bien necesito un par de datos del lote.\nTe queda mejor que lo veamos hoy o manana?',
      notes: 'Objetivo: generar reconocimiento y habilitar respuesta. No enviar precios.',
    },
    {
      name: 'WhatsApp #2 - Cierre de secuencia',
      situation: 'Ultimo intento antes de descartar',
      text: 'Intente comunicarme para asesorarte correctamente.\nSi no es el momento lo dejamos en pausa, y cuando lo retomes lo vemos sin problema.',
      notes: 'Registrar motivo: No contacto. NUNCA descartar sin este mensaje.',
    },
  ],
});

// ============================================================
// STAGE C: CALIFICACION PROFUNDA
// ============================================================
await createStage({
  name: 'C. Calificacion Profunda',
  order: 3,
  color: '#10B981',
  icon: 'ClipboardCheck',
  objective: 'Clasificar al cliente y decidir si califica para visita o cotizacion',
  duration: '15 min',
  description: 'Determinar si el lead tiene volumen suficiente, esta en momento de decision, y justifica invertir tiempo en visita a campo o cotizacion detallada.',
  steps: [
    { title: 'Determinar volumen', type: 'verificacion', content: 'Tiene volumen atractivo? Evaluar hectareas y potencial de compra.' },
    { title: 'Evaluar momento de decision', type: 'verificacion', content: 'Esta en momento de decision? Ventana de aplicacion proxima?' },
    { title: 'Evaluar si vale visita', type: 'verificacion', content: 'Justifica visita a campo? Considerar distancia, volumen y probabilidad.' },
    { title: 'Descartar precio-shopping', type: 'verificacion', content: 'Solo pide precio sin datos? Si no puede dar datos del lote, no califica.' },
    { title: 'Clasificar perfil de cliente', type: 'accion', content: 'Productor chico/medio/grande, Contratista, Ingeniero asesor, Acopiador.' },
    { title: 'Registrar perfil y decision', type: 'accion', content: 'Registrar clasificacion en CRM. Si califica -> cotizacion o visita. Si no -> mantener en base para proxima campana.' },
  ],
  questions: [
    { question: 'Cuantas hectareas trabajas en total?', category: 'necesidad', purpose: 'Dimensionar potencial real del cliente', listen: 'Numero concreto. Ojo con "algunas" o "varias".', followup: 'Y de esas, cuantas necesitan tratamiento ahora?' },
    { question: 'Para cuando necesitas el producto?', category: 'timeline', purpose: 'Evaluar urgencia y ventana de aplicacion', listen: 'Fecha concreta vs "para cuando se pueda"' },
    { question: 'Quien decide la compra?', category: 'decision', purpose: 'Mapear decisor real', listen: 'El mismo, el ingeniero, el dueno del campo, el pool' },
  ],
  items: [
    {
      type: 'checklist',
      title: 'Criterios de NO calificacion',
      content: {
        items: ['Volumen minimo irrelevante', 'Solo pide precio sin datos', 'Fuera de zona logistica', 'Solo busca comparacion informal', 'No puede dar datos basicos del lote'],
        note: 'Si alguno aplica -> no califica para visita. Puede calificar para cotizacion telefonica si el volumen es razonable.',
      },
    },
  ],
});

// ============================================================
// STAGE D: VISITA A CAMPO / REUNION TECNICA
// ============================================================
await createStage({
  name: 'D. Visita a Campo / Reunion Tecnica',
  order: 4,
  color: '#EC4899',
  icon: 'MapPin',
  objective: 'Diagnosticar el lote y presentar solucion especifica',
  duration: '1-2 horas',
  description: 'Confirmar diagnostico real en campo, validar necesidad con datos concretos, y proponer solucion tecnica especifica. Usar metodo SPIN adaptado al agro.',
  steps: [
    { title: 'Apertura de la visita', type: 'accion', content: 'Ver el lote y entender antes de hablar de numeros. Recorrer, observar, preguntar.' },
    { title: 'SPIN - Situacion', type: 'pregunta', content: 'Que venis aplicando hoy? Que resultados estas teniendo?' },
    { title: 'SPIN - Problema', type: 'pregunta', content: 'Que problema puntual estas viendo? Malezas resistentes? Enfermedades? Bajo rinde?' },
    { title: 'SPIN - Implicacion', type: 'pregunta', content: 'Si no lo corregis ahora, que impacto en rendimiento? Cuanto te cuesta por hectarea no actuar?' },
    { title: 'SPIN - Necesidad', type: 'pregunta', content: 'Que resultado esperas lograr con esta aplicacion? Cual seria el escenario ideal?' },
    { title: 'Registrar diagnostico', type: 'accion', content: 'Problema concreto, riesgo productivo, rendimiento esperado, presupuesto implicito.' },
    { title: 'Presentar solucion', type: 'accion', content: '1 solucion principal, max 2 alternativas. No 10 productos. Conectar cada recomendacion con el problema que vimos en el lote.' },
    { title: 'Definir avance', type: 'verificacion', content: 'Si -> Cotizacion formal. Duda -> Zona gris. No -> Descarte o mantener para proxima campana.' },
  ],
  scripts: [
    {
      name: 'Apertura de visita',
      situation: 'Al llegar al campo',
      text: 'Gracias por recibirme. La idea es ver el lote, entender bien que esta pasando y despues si tiene sentido te armo una propuesta concreta.\nSi veo que no necesitas nada, te lo digo.',
      notes: 'Autoridad + honestidad. No vender de entrada.',
    },
    {
      name: 'Diagnostico SPIN',
      situation: 'Recorriendo el lote',
      text: 'Que venis aplicando hoy?\nQue problema puntual estas viendo?\nSi no lo corregis ahora, que impacto en rendimiento?\nQue resultado esperas lograr?',
      notes: 'Dejar hablar al productor. No interrumpir. Registrar todo.',
    },
    {
      name: 'Presentacion de solucion',
      situation: 'Despues del diagnostico',
      text: 'Con lo que vi en el lote y lo que me contas, lo que te recomiendo es ___.\nEl costo por hectarea es ___ y el retorno esperado es ___.\nTe parece que armemos los numeros formales?',
      notes: 'Max 2 alternativas. Siempre conectar producto con problema concreto del lote.',
    },
  ],
  questions: [
    { question: 'Que venis aplicando hoy?', category: 'necesidad', purpose: 'Entender tratamiento actual', listen: 'Productos, dosis, frecuencia', followup: 'Y como te esta funcionando?' },
    { question: 'Que problema puntual estas viendo en el lote?', category: 'dolor', purpose: 'Identificar el dolor concreto', listen: 'Plagas, malezas, enfermedades, rendimiento', followup: 'Desde cuando lo venis notando?' },
    { question: 'Si no lo corregis ahora, que impacto en rendimiento?', category: 'impacto', purpose: 'Cuantificar costo de no actuar', listen: 'Perdida en qq/ha, riesgo productivo', followup: 'Cuanto estimas que te cuesta por hectarea?' },
    { question: 'Que resultado esperas lograr con esta aplicacion?', category: 'vision', purpose: 'Definir exito del productor', listen: 'Rendimiento, control, costo-beneficio', followup: 'Cual seria el escenario ideal?' },
  ],
  items: [
    {
      type: 'checklist',
      title: 'Registrar en visita',
      content: {
        items: ['Problema concreto del lote', 'Riesgo productivo si no actua', 'Rendimiento esperado', 'Presupuesto implicito', 'Quien decide', 'Competencia (que mas esta viendo)'],
        note: 'Regla de oro: mientras mas claro el problema, menos se habla de precio.',
      },
    },
  ],
});

// ============================================================
// STAGE E: COTIZACION + PROPUESTA
// ============================================================
await createStage({
  name: 'E. Cotizacion + Propuesta',
  order: 5,
  color: '#F97316',
  icon: 'FileText',
  objective: 'Enviar propuesta tecnica-comercial personalizada en menos de 24hs',
  duration: '< 24 horas',
  description: 'Armar y enviar cotizacion formal conectada con el diagnostico del lote. No es un listado de precios. Es una propuesta tecnica que resuelve un problema concreto.',
  steps: [
    { title: 'Armar cotizacion personalizada', type: 'accion', content: 'Producto, dosis, volumen, precio por hectarea, costo total. Conectar con el diagnostico.' },
    { title: 'Incluir costo por hectarea', type: 'accion', content: 'Siempre presentar en USD/ha o $/ha, no solo precio por litro/kilo.' },
    { title: 'Incluir retorno esperado', type: 'accion', content: 'Si es posible, cuantificar: "Por cada $1 que invertis, recuperas $X en rinde."' },
    { title: 'Enviar en menos de 24hs', type: 'verificacion', content: 'La cotizacion pierde fuerza con el tiempo. Enviar el mismo dia si es posible.' },
    { title: 'Llamar para repasar la cotizacion', type: 'accion', content: 'No solo mandar por WhatsApp. Llamar para repasar juntos y resolver dudas en el momento.' },
    { title: 'Definir proximo paso', type: 'accion', content: 'Confirma -> Cierre. Duda -> Zona gris. No -> Descarte elegante.' },
  ],
  scripts: [
    {
      name: 'Envio de cotizacion',
      situation: 'Al enviar la propuesta por WhatsApp',
      text: 'Te paso la cotizacion como quedamos.\nEsta armada en base a lo que vimos en el lote: ___ hectareas de ___, problema de ___.\nCuando puedas la revisamos juntos asi despejamos cualquier duda.',
      notes: 'Siempre personalizar. No enviar listado generico.',
    },
    {
      name: 'Llamado de repaso',
      situation: 'Al llamar para repasar la cotizacion',
      text: 'Te llamo para repasar la cotizacion que te mande.\nLa arme pensando en lo que vimos en el lote.\nTe cierran los numeros o hay algo que ajustar?',
      notes: 'Estar preparado para objeciones de precio. Tener alternativas listas.',
    },
  ],
});

// ============================================================
// STAGE F: ZONA GRIS
// ============================================================
await createStage({
  name: 'F. Zona Gris',
  order: 6,
  color: '#EF4444',
  icon: 'AlertTriangle',
  objective: 'Resolver la indefinicion en maximo 7 dias',
  duration: 'Max 7 dias',
  description: 'El productor dice que lo piensa. Etapa mas peligrosa del proceso. Maximo 7 dias. Un solo objetivo: definir si avanza o se pausa. Seguimiento con criterio, no presion.',
  steps: [
    { title: 'Agendar proxima accion', type: 'accion', content: 'Siempre dejar accion agendada. Maximo 7 dias. "Te parece si lo retomamos el jueves?"' },
    { title: 'Reencuadrar la situacion', type: 'accion', content: 'Usar script de reencuadre. Conectar con urgencia real (ventana de aplicacion, disponibilidad, clima).' },
    { title: 'Dia 3 - WhatsApp de reactivacion', type: 'accion', content: 'Mensaje breve reconectando con el diagnostico del lote.' },
    { title: 'Dia 7 - Llamado de definicion', type: 'accion', content: 'Llamar para cerrar o pausar. No dejar abierto mas de 7 dias.' },
    { title: 'Reglas de zona gris', type: 'tip', content: 'NO bajar precio sin criterio. NO competir por WhatsApp. NO mandar lista completa. NO descontar sin volumen confirmado. NO perseguir: acompanar.' },
  ],
  scripts: [
    {
      name: 'Reencuadre zona gris',
      situation: 'Productor indeciso',
      text: 'Entiendo que lo estes evaluando.\nTe parece si lo retomamos el jueves y vemos si avanzamos o lo dejamos para mas adelante?',
      notes: 'Zona gris dura maximo 7 dias. Siempre dejar proxima accion agendada.',
    },
    {
      name: 'WhatsApp Dia 3',
      situation: '3 dias despues de la cotizacion',
      text: 'Hola ___, te escribo para retomar lo que hablamos sobre el lote de ___.\nPudiste evaluar la propuesta o preferis que lo veamos juntos 5 minutos?',
      notes: 'Breve, personalizado, sin presion.',
    },
    {
      name: 'Llamado Dia 7 - Definicion',
      situation: '7 dias despues, definicion final',
      text: 'Te llamo para ver si seguimos avanzando con lo del lote de ___ o si preferis dejarlo en pausa por ahora.\nPrefiero ser prolijo y no molestarte si no es el momento.',
      notes: 'Si no define -> pausar. Reactivar en proxima campana.',
    },
    {
      name: 'Urgencia por ventana de aplicacion',
      situation: 'Cuando la ventana de aplicacion esta por cerrarse',
      text: 'Te aviso porque la ventana de aplicacion para ___ se esta cerrando.\nSi esperamos mucho mas, el resultado no va a ser el mismo.\nPreferís que lo definamos esta semana?',
      notes: 'Solo usar si la urgencia es real. No fabricar urgencia falsa.',
    },
  ],
  items: [
    {
      type: 'checklist',
      title: 'Prohibiciones en Zona Gris',
      content: {
        items: ['NO bajar precio sin criterio', 'NO competir por WhatsApp', 'NO mandar lista completa de productos', 'NO descontar sin volumen confirmado', 'NO dejar pasar mas de 7 dias sin definicion'],
        note: 'Maximo 7 dias. Siempre dejar proxima accion agendada.',
      },
    },
  ],
});

// ============================================================
// STAGE G: CIERRE - ORDEN DE COMPRA
// ============================================================
await createStage({
  name: 'G. Cierre - Orden de Compra',
  order: 7,
  color: '#059669',
  icon: 'BadgeCheck',
  objective: 'Obtener confirmacion formal del pedido',
  duration: 'Mismo dia',
  description: 'Transformar interes en orden de compra, reserva o compromiso formal. El cierre no es presionar: es el paso logico despues de un buen diagnostico.',
  steps: [
    { title: 'Intento de cierre', type: 'accion', content: 'Con lo que vimos y si estas de acuerdo, el paso logico seria confirmar el pedido asi aseguramos disponibilidad.' },
    { title: 'Obtener confirmacion formal', type: 'verificacion', content: 'Orden de compra, confirmacion por escrito, WhatsApp o reserva de producto.' },
    { title: 'Si no confirma', type: 'accion', content: 'Vuelve a zona gris. No insistir en el momento.', required: false },
    { title: 'Confirmar condiciones comerciales', type: 'verificacion', content: 'Precio, descuentos por volumen, forma de pago, plazo de entrega.' },
    { title: 'Comunicar pasos siguientes', type: 'accion', content: 'Explicar que sigue: registro del pedido, confirmacion de stock, coordinacion de entrega.' },
  ],
  scripts: [
    {
      name: 'Intento de cierre',
      situation: 'Cliente interesado despues de cotizacion o visita',
      text: 'Con lo que vimos y si estas de acuerdo, el paso logico seria confirmar el pedido asi aseguramos disponibilidad.\nTe parece?',
      notes: 'Natural, no agresivo. Si dice que si -> registrar inmediatamente.',
    },
    {
      name: 'Cierre por escasez real',
      situation: 'Cuando hay stock limitado',
      text: 'Te aviso que de ___ nos quedan pocas unidades.\nSi queres asegurar disponibilidad, conviene confirmar hoy.\nSino esperamos pero no te puedo garantizar stock.',
      notes: 'Solo usar si la escasez es REAL. No fabricar urgencia.',
    },
    {
      name: 'Cierre por descuento por volumen',
      situation: 'Cuando el volumen justifica beneficio',
      text: 'Con el volumen que manejas, puedo conseguirte un mejor precio si confirmamos el pedido completo ahora.\nTe conviene?',
      notes: 'El descuento es por volumen real, no por presion.',
    },
  ],
});

// ============================================================
// STAGE H: REGISTRACION + LOGISTICA
// ============================================================
await createStage({
  name: 'H. Registracion + Logistica',
  order: 8,
  color: '#6366F1',
  icon: 'Truck',
  objective: 'Asegurar la entrega correcta y completa',
  duration: '24-48 horas',
  description: 'Registrar pedido en sistema, confirmar stock, coordinar logistica de entrega. El cliente debe recibir confirmacion clara de que, cuando y donde.',
  steps: [
    { title: 'Registrar pedido en sistema', type: 'accion', content: 'Cargar pedido completo con todos los productos, cantidades y condiciones.' },
    { title: 'Confirmar stock', type: 'verificacion', content: 'Verificar disponibilidad de todos los productos del pedido.' },
    { title: 'Confirmar condiciones comerciales', type: 'verificacion', content: 'Precio, descuentos aplicados, forma de pago acordada.' },
    { title: 'Coordinar entrega', type: 'accion', content: 'Fecha, lugar y logistica. Coordinar con deposito/transporte.' },
    { title: 'Confirmar forma de pago', type: 'verificacion', content: 'Modalidad de pago acordada: contado, cheque, transferencia, canje, financiacion.' },
    { title: 'Confirmacion final al cliente', type: 'accion', content: 'Comunicar al cliente: pedido confirmado, producto, cantidad, hectareas cubiertas y fecha de entrega.' },
  ],
  scripts: [
    {
      name: 'Confirmacion final',
      situation: 'Pedido confirmado y registrado',
      text: 'Perfecto, queda confirmado el pedido de ___ para ___ hectareas.\nTe confirmo entrega el ___ en ___.\nCualquier novedad te aviso con anticipacion.',
      notes: 'Claro, concreto, profesional.',
    },
  ],
  items: [
    {
      type: 'checklist',
      title: 'Checklist de entrega',
      content: {
        items: ['Pedido registrado en sistema', 'Stock confirmado', 'Condiciones comerciales validadas', 'Entrega coordinada (fecha + lugar)', 'Forma de pago confirmada', 'Cliente notificado'],
        note: null,
      },
    },
  ],
});

// ============================================================
// STAGE I: POST-VENTA
// ============================================================
await createStage({
  name: 'I. Post-Venta + Fidelizacion',
  order: 9,
  color: '#D97706',
  icon: 'Heart',
  objective: 'Fidelizar y detectar proximas oportunidades',
  duration: '48hs post-aplicacion + seguimiento de campana',
  description: 'Seguimiento 48hs despues de la aplicacion. El objetivo no es vender: es acompanar. Detectar satisfaccion, problemas y proximas necesidades. Construir relacion de largo plazo.',
  steps: [
    { title: 'Contacto 48hs post-aplicacion', type: 'accion', content: 'Como viste el resultado? Notaste diferencia? Algun problema?' },
    { title: 'Registrar feedback', type: 'accion', content: 'Resultado de aplicacion, satisfaccion del cliente, problemas detectados.' },
    { title: 'Detectar proxima oportunidad', type: 'tip', content: 'Acompanar la campana. Identificar proximas necesidades: segunda aplicacion, proximo cultivo, nueva campana.' },
    { title: 'Agendar proximo contacto', type: 'accion', content: 'No dejar que el cliente se enfrie. Agendar contacto para proxima ventana de aplicacion o campana.' },
    { title: 'Pedir referidos', type: 'tip', content: 'Si el cliente quedo satisfecho: "Conoces algun productor de la zona que pueda necesitar lo mismo?" El mejor momento es cuando el resultado fue bueno.', required: false },
  ],
  scripts: [
    {
      name: 'Seguimiento 48hs',
      situation: '48 horas despues de la aplicacion',
      text: 'Como viste el resultado?\nNotaste diferencia?\nTodo bien con la aplicacion?',
      notes: 'El seguimiento no es presion, es acompanamiento. Escuchar mas que hablar.',
    },
    {
      name: 'Deteccion de proxima necesidad',
      situation: 'Cuando el cliente esta satisfecho',
      text: 'Me alegro que haya funcionado bien.\nPara la proxima aplicacion / campana, te parece si lo vemos con tiempo asi planificamos juntos?',
      notes: 'Posicionarse como asesor de confianza, no solo como vendedor de productos.',
    },
    {
      name: 'Pedido de referido',
      situation: 'Cliente satisfecho con buenos resultados',
      text: 'Que bueno que salio bien.\nConoces algun productor de la zona que pueda estar necesitando algo similar?\nSi queres lo contacto de tu parte.',
      notes: 'Solo pedir si el resultado fue genuinamente bueno. No forzar.',
    },
  ],
  items: [
    {
      type: 'resource',
      title: 'Mensaje para el equipo',
      content: {
        items: ['No gana el que pasa precio primero', 'Gana el que diagnostica mejor', 'Gana el que entiende el lote', 'Gana el que ordena la decision', 'La venta se gana con conocimiento tecnico y acompanamiento'],
        note: 'Filosofia del playbook: asesorar, no vender. El precio es consecuencia del valor.',
      },
    },
  ],
});

// ============================================================
// OBJECTIONS (Global)
// ============================================================
console.log('Creating objections...');

const objections = [
  {
    objection: 'Ya tengo proveedor',
    category: 'competencia',
    severity: 'alto',
    responses: [
      { text: 'No busco reemplazar a tu proveedor. Muchos productores trabajan con mas de uno para tener alternativas y mejores condiciones.', type: 'reencuadre', example: 'Varios clientes de la zona trabajan con 2-3 proveedores.' },
      { text: 'Que es lo que mas valoras de tu proveedor actual?', type: 'pregunta', example: 'Entender que valora para ofrecer algo complementario.' },
      { text: 'Y en cuanto a resultados, estas conforme con lo que estas logrando?', type: 'pregunta', example: 'Abrir puerta a insatisfaccion sin atacar.' },
    ],
    signals_working: 'El productor empieza a comparar abiertamente',
    if_not_working: 'Dejar puerta abierta para proxima campana. No insistir.',
  },
  {
    objection: 'Esta muy caro',
    category: 'precio',
    severity: 'alto',
    responses: [
      { text: 'Comparado con que referencia? El costo por hectarea varia mucho segun dosis y resultado.', type: 'pregunta', example: null },
      { text: 'Si miramos el costo por quintal producido, nuestra solucion rinde mas. Te muestro los numeros.', type: 'evidencia', example: 'En un lote similar, el costo fue $X/ha pero el rinde subio Y qq.' },
      { text: 'El precio mas bajo no siempre es el mas barato. Si el producto no funciona, el costo real es la perdida de rinde.', type: 'reencuadre', example: null },
    ],
    signals_working: 'Pide ver los numeros en detalle o pide comparacion',
    if_not_working: 'No bajar precio sin criterio. Volver a valor tecnico y costo por hectarea.',
  },
  {
    objection: 'Lo tengo que pensar',
    category: 'tiempo',
    severity: 'medio',
    responses: [
      { text: 'Que es lo que te gustaria evaluar puntualmente? Asi lo vemos ahora.', type: 'pregunta', example: 'Descubrir la duda real.' },
      { text: 'Lo importante es no perder la ventana de aplicacion. Lo definimos el jueves?', type: 'reencuadre', example: 'Conectar con urgencia real.' },
    ],
    signals_working: 'Acepta fecha concreta de recontacto',
    if_not_working: 'Si no define en 7 dias, zona gris vencida. Pausar y reactivar en proxima campana.',
  },
  {
    objection: 'Estoy esperando que llueva',
    category: 'tiempo',
    severity: 'medio',
    responses: [
      { text: 'Justamente por eso conviene tener el producto reservado para aplicar apenas se de la ventana. Asi no perdes dias buscando cuando llueva.', type: 'reencuadre', example: null },
      { text: 'Que pasa si llueve el fin de semana y el lunes necesitas aplicar? Si ya tenes el producto, aplicas inmediatamente.', type: 'reencuadre', example: null },
    ],
    signals_working: 'Acepta reservar producto o confirmar pedido anticipado',
    if_not_working: 'Mantener contacto semanal hasta que se de la lluvia.',
  },
  {
    objection: 'Necesito financiamiento',
    category: 'precio',
    severity: 'medio',
    responses: [
      { text: 'Tenemos opciones de financiamiento. Que plazo te serviria?', type: 'pregunta', example: null },
      { text: 'Podemos armar un plan de pago en cuotas atado a cosecha. Te interesa verlo?', type: 'concesion', example: null },
      { text: 'Tambien trabajamos con canje de granos. Es una opcion que te cierra?', type: 'concesion', example: null },
    ],
    signals_working: 'Acepta ver opciones de financiamiento o canje',
    if_not_working: 'Preparar propuesta con condiciones flexibles. No perder la venta por rigidez financiera.',
  },
  {
    objection: 'Mi ingeniero me recomienda otra cosa',
    category: 'autoridad',
    severity: 'alto',
    responses: [
      { text: 'Respeto mucho el criterio del ingeniero. Te parece si le acerco la informacion tecnica para que la evalue?', type: 'empatia', example: 'No confrontar al ingeniero.' },
      { text: 'Te puedo preparar un comparativo tecnico para que lo revise tu ingeniero con datos concretos.', type: 'evidencia', example: null },
      { text: 'Si queres puedo hablar directamente con el y resolver las dudas tecnicas juntos.', type: 'pregunta', example: 'Incluir al decisor tecnico.' },
    ],
    signals_working: 'Acepta que le llegue informacion tecnica o que hablemos con el ingeniero',
    if_not_working: 'Respetar la decision. Dejar puerta abierta. El ingeniero puede ser aliado en el futuro.',
  },
  {
    objection: 'Voy a esperar a la proxima campana',
    category: 'tiempo',
    severity: 'medio',
    responses: [
      { text: 'Entiendo. Solo para que lo tengas en cuenta: si el problema esta ahora, el costo de esperar es perdida de rinde esta campana.', type: 'reencuadre', example: null },
      { text: 'Te parece si agendamos para el inicio de la proxima campana? Asi arrancamos con tiempo.', type: 'pregunta', example: 'Plantar semilla para el futuro.' },
    ],
    signals_working: 'Acepta agendar para proxima campana',
    if_not_working: 'Agendar seguimiento 30 dias antes de proxima campana.',
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

console.log('\nPlaybook Agro creado exitosamente!');
console.log(`   ID: ${PB}`);
console.log(`   Stages: 10 (A-I)`);
console.log(`   URL: /playbook/${PB}`);
