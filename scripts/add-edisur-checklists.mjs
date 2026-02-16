const SB_URL = 'https://avgfqdtfmoqkjfgtvrtg.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2Z2ZxZHRmbW9xa2pmZ3R2cnRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYwMDY1NywiZXhwIjoyMDg1MTc2NjU3fQ.cBuGvG3uiRJ5UL3c0h-UTL056brKIczBYCG4I404e-0';
const PB = '37d8548e-16d2-47fd-8683-9f176770c68f';

async function query(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
  });
  return r.json();
}

async function insert(path, body) {
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

// Get all stages
const stages = await query(`playbook_stages?playbook_id=eq.${PB}&order=sort_order`);
console.log(`Found ${stages.length} stages\n`);

// Map stage name prefix to checklist data
const checklists = {
  'A.': {
    title: 'Checklist operativo inmediato',
    items: [
      'Abrir Gestar',
      'Tomar lead (asignarse como responsable)',
      'Ver fecha y hora de ingreso',
      'Leer producto consultado',
      'Prepararse para llamar',
      'Chequear si es o no cliente previo de EDISUR',
    ],
    pasa: 'Para pasar a etapa B (Primer llamado)',
    pasaItems: [
      'Lead tomado en Gestar',
      'Responsable asignado',
      'Producto identificado',
      'Contacto disponible',
    ],
    noPasa: 'Si falta 1 solo ítem → NO se puede avanzar.',
    cursos: [
      { situacion: 'Lead tomado', accion: 'Avanza a etapa B' },
      { situacion: 'Lead no tomado', accion: 'Error de proceso' },
      { situacion: 'Lead tomado tarde', accion: 'Riesgo de baja conversión' },
    ],
  },
  'B. Primer': {
    title: 'Checklist de éxito del llamado',
    items: [
      'El lead atendió',
      'Se identificó arquetipo (familia/inversor)',
      'Se validó si califica',
      'Se intentó vender la reunión',
      'Quedó claro el próximo paso',
    ],
    pasa: 'Pasa a C si',
    pasaItems: [
      'Atiende',
      'Califica',
      'Se intenta reunión',
    ],
    noPasa: 'Pasa a B1 si no atiende. Si falla un ítem → llamado no cumplió objetivo.',
    cursos: [
      { situacion: 'Atiende y califica', accion: 'Avanza a C' },
      { situacion: 'Atiende y no califica (alquiler, fuera de target)', accion: 'Cierre inmediato' },
      { situacion: 'Atiende pero pone objeción', accion: 'Etapa E (Zona gris telefónica)' },
      { situacion: 'No atiende', accion: 'B1 (Secuencia No Contacto)' },
    ],
    prohibiciones: [
      '"Te paso precios por WhatsApp"',
      '"Después vemos"',
      '"Mandame un mensaje cuando puedas"',
      '"Te explico todo ahora"',
      '"Depende…"',
    ],
  },
  'B1.': {
    title: 'Checklist secuencia No Contacto',
    items: [
      'Intento #1 realizado (llamado)',
      'WhatsApp #1 enviado (5-10 min después)',
      'Intento #2 realizado (día siguiente)',
      'WhatsApp #2 de cierre enviado (si no atendió #2)',
      'Descarte formal registrado con motivo "No contacto"',
    ],
    pasa: 'Pasa a C si',
    pasaItems: [
      'Atiende en intento #2',
    ],
    noPasa: 'Se descarta si: no atiende intento #1, no responde WhatsApp #1, no atiende intento #2, no responde WhatsApp #2.',
    cursos: [
      { situacion: 'Atiende en intento #2', accion: 'Pasa a etapa C' },
      { situacion: 'No responde nada', accion: 'Descarte → Campañas' },
    ],
  },
  'C.': {
    title: 'Checklist de calificación',
    items: [
      'Motivo de consulta confirmado',
      'Arquetipo identificado (inversor/familia)',
      'Estado de búsqueda validado',
      'Calificación determinada (califica / no califica)',
      'Reunión vendida (si califica)',
      'Fecha tentativa definida',
    ],
    pasa: 'Pasa a D si',
    pasaItems: [
      'Califica',
      'Acepta reunión',
      'Fecha tentativa definida',
    ],
    noPasa: 'Pasa a E si: califica, no acepta ahora, expresa un "pero".',
    cursos: [
      { situacion: 'Califica + acepta reunión', accion: 'Pasa a D (Pre-reunión)' },
      { situacion: 'Califica + pone objeción', accion: 'Pasa a E (Zona gris telefónica)' },
      { situacion: 'No califica', accion: 'Cierre elegante + descartar con motivo' },
    ],
  },
  'E.': {
    title: 'Checklist Zona Gris Telefónica',
    items: [
      'Tipo de "pero" clasificado (tiempo/etapa/comparación/precio)',
      'Script de encuadre aplicado',
      'Próximo contacto agendado',
      'Brochure enviado (máx 1 desarrollo, si corresponde)',
      'Interés activo evaluado',
    ],
    pasa: 'Pasa a D si',
    pasaItems: [
      'Se agenda reunión',
      'Lead responde activamente',
    ],
    noPasa: 'Se descarta si: no responde, evita contacto, no acepta avanzar tras 2 ciclos.',
    cursos: [
      { situacion: 'Interés activo', accion: 'Loop E (máx 2 ciclos de 7 días)' },
      { situacion: 'Sin interés', accion: 'Descartar + motivo' },
      { situacion: 'Pide precio', accion: 'Reencuadrar a reunión' },
    ],
    reglasMateriales: [
      '✔️ Brochure: permitido, máx 1 desarrollo',
      '❌ Precio: prohibido sin reunión, SIN EXCEPCIÓN',
      '⚠️ Planimetría: solo ubicación general, NO disponibilidad exacta (competidores, inmobiliarios, mystery shoppers)',
    ],
  },
  'D.': {
    title: 'Checklist obligatorio pre-reunión',
    items: [
      'Nombre completo del lead',
      'Producto por el que consultó',
      'Arquetipo preliminar (inversor/familia)',
      'Estado de búsqueda (recién arranca / comparando)',
      'Qué espera resolver en la reunión',
      'Qué NO se va a mostrar (disciplina)',
      'Preguntas de calificación listas según arquetipo',
    ],
    pasa: 'Para iniciar la reunión',
    pasaItems: [
      'Todos los ítems respondidos',
    ],
    noPasa: 'Si no puede responder el checklist → NO empieza la reunión.',
  },
  'F.': {
    title: 'Checklist reunión presencial base',
    items: [
      'Apertura con encuadre realizada',
      'Arquetipo confirmado y registrado (inversor/familia)',
      'Producto confirmado y registrado (lote/ladrillo)',
      'Indagación base completada (SPIN suave)',
      'Definido: ¿busca LOTE o LADRILLO?',
    ],
    pasa: 'Siguiente paso',
    pasaItems: [
      'Si busca LOTE → Etapa G',
      'Si busca LADRILLO → Etapa H',
    ],
    noPasa: 'Regla de oro: mientras más clara sea la indagación, menos material se muestra.',
  },
  'G.': {
    title: 'Checklist reunión Lote',
    items: [
      'Trabajo con mapa (Gestar + Maps) realizado',
      'Zona preferida registrada',
      'Uso previsto registrado (resguardo/construir)',
      'Horizonte de tiempo registrado',
      'Condiciones no negociables registradas',
      'Próximo paso con fecha agendado',
    ],
    pasa: 'Pasa a I si',
    pasaItems: [
      'Arquetipo confirmado',
      'Zona y criterios definidos',
      'Próximo paso con fecha',
    ],
    noPasa: 'No pasa si: no hay agenda o no quedó foco. Va a K (Zona gris post-reunión).',
    cursos: [
      { situacion: 'Próximo paso agendado', accion: 'Pasa a I (Post-reunión)' },
      { situacion: 'Sin agenda', accion: 'Pasa a K (Zona gris post-reunión)' },
    ],
  },
  'H.': {
    title: 'Checklist reunión Ladrillo + Visita',
    items: [
      'Indagación profunda completada',
      'Máximo 2 opciones presentadas',
      'Tipología registrada',
      'Presupuesto estimado registrado',
      'Urgencia registrada',
      'Criterios de descarte registrados',
      'Visita realizada (si aplica)',
      'Reacción post-visita registrada',
      'Próximo paso definido',
    ],
    pasa: 'Pasa si',
    pasaItems: [
      'Opciones filtradas',
      'Reacción clara',
      'Próximo paso definido',
    ],
    noPasa: 'No pasa si: "Lo veo y te aviso" sin agenda.',
    cursos: [
      { situacion: 'Agenda visita o sigue', accion: 'Visita → Post-reunión (I)' },
      { situacion: 'Sin definición', accion: 'Zona gris post-reunión (K)' },
    ],
  },
  'I.': {
    title: 'Checklist Post-Reunión',
    items: [
      'WhatsApp post-reunión enviado (dentro de 2 horas)',
      'Resumen personalizado incluido',
      'Próximo paso explícito definido',
      'Fecha tentativa propuesta',
      'Registro en CRM actualizado',
    ],
    pasa: 'Pasa a J si',
    pasaItems: [
      'WhatsApp enviado',
      'Próximo paso explícito',
      'Fecha tentativa',
    ],
    noPasa: 'Si "después vemos" o sin agenda → Etapa K.',
    prohibiciones: [
      'Listados masivos',
      'Toda la disponibilidad con precios',
      'Información nueva no hablada en la reunión',
    ],
  },
  'K.': {
    title: 'Checklist Zona Gris Post-Reunión',
    items: [
      'Día 0: WhatsApp post-reunión enviado',
      'Día 3: WhatsApp de reactivación enviado',
      'Día 7: Llamado de definición realizado',
      'Evaluación de reactivación completada',
      'Motivo de descarte registrado (si aplica)',
    ],
    pasa: 'Se mantiene activo si',
    pasaItems: [
      'Responde',
      'Pide tiempo concreto',
      'Acepta contacto',
    ],
    noPasa: 'Se descarta si: evasivo, silencio prolongado, "cuando pueda te aviso" sin retorno.',
    cursos: [
      { situacion: 'Se reactiva y agenda', accion: 'Pasa a J (Seguimiento)' },
      { situacion: 'No responde 2 intentos + 1 llamado', accion: 'Descarte → Campañas' },
    ],
  },
  'J.': {
    title: 'Checklist Seguimiento y Campañas',
    items: [
      'Lead clasificado: seguimiento activo o campaña',
      'Timing de contacto definido',
      'Agenda de próximo contacto cargada',
      'Contenido mínimo preparado',
    ],
    cursos: [
      { situacion: 'Seguimiento activo con interés', accion: 'Continúa con timing y agenda' },
      { situacion: 'Lead de campaña reacciona', accion: 'Vuelve a etapa C' },
    ],
  },
  'L/M.': {
    title: 'Checklist Dudas + Proceso + Seña',
    items: [
      'Instancia definida (llamado o reunión presencial)',
      'Proceso explicado: seña, boleto, legales, tiempos, firma',
      'Dudas despejadas',
      'Intento explícito de seña realizado',
      'Compromiso obtenido (verbal o monetario)',
      'Fecha tentativa de firma acordada',
    ],
    pasa: 'Pasa a O si',
    pasaItems: [
      'Dudas despejadas',
      'Compromiso verbal o monetario',
      'Fecha tentativa de firma',
    ],
    noPasa: 'Si evasión o más dudas sin avance → vuelve a K (Zona Gris).',
  },
  'O.': {
    title: 'Checklist Seña + Compromiso',
    items: [
      'Seña registrada en Gestar',
      'Fecha de firma acordada',
      'Operación cargada en el sistema',
      'Cliente confirmado del siguiente paso',
    ],
    pasa: 'Pasa a P/Q',
    pasaItems: [
      'Seña registrada',
      'Fecha de firma acordada',
      'Operación cargada',
    ],
  },
  'P/Q.': {
    title: 'Checklist Datos + Boleto',
    items: [
      'Nombre y apellido',
      'DNI',
      'Estado civil',
      'CUIT/CUIL',
      'Domicilio',
      'Email',
      'Modalidad de pago acordada',
      'Boleto confeccionado',
    ],
    pasa: 'Pasa a R cuando',
    pasaItems: [
      'Todos los datos completos',
      'Boleto confeccionado',
    ],
    noPasa: 'Si falta info → loop interno (volver a solicitar).',
  },
  'R.': {
    title: 'Checklist Derivación a Legales',
    items: [
      'Boleto enviado a Legales',
      'Revisión formal completada',
      'Aprobación de Legales obtenida',
    ],
    pasa: 'Pasa a S si',
    pasaItems: [
      'Legales aprueba',
    ],
    noPasa: 'Si no aprueba → loop interno a P/Q. El cliente NO vuelve a zona gris.',
  },
  'S.': {
    title: 'Checklist Pre-Firma',
    items: [
      'Fecha y hora de firma coordinada',
      'Cochera asignada',
      'WhatsApp de confirmación enviado',
      'Cartel de bienvenida preparado',
      'Sala preparada',
      'Agenda interna lista',
    ],
    pasa: 'Pasa a T cuando',
    pasaItems: [
      'Todo preparado',
      'Cliente confirmado',
    ],
  },
  'T.': {
    title: 'Checklist Reunión de Firma',
    items: [
      'Recepción con cartel de bienvenida',
      'Café / agua ofrecidos',
      'Abogados presentes',
      'Revisión final del boleto completada',
      'Boleto firmado',
    ],
    pasa: 'Pasa a U cuando',
    pasaItems: [
      'Boleto firmado',
    ],
  },
  'U.': {
    title: 'Checklist Finanzas y Cierre',
    items: [
      'Derivado a Finanzas',
      'Pago realizado según modalidad',
      'Confirmación final obtenida',
      'Lead cerrado como VENTA en el sistema',
    ],
  },
};

let total = 0;

for (const stage of stages) {
  // Find matching checklist by prefix
  const key = Object.keys(checklists).find(k => stage.name.startsWith(k));
  if (!key) {
    console.log(`⚠️  No checklist for: ${stage.name}`);
    continue;
  }

  const cl = checklists[key];
  let order = 0;

  // 1. Main operational checklist
  await insert('playbook_items', {
    playbook_id: PB,
    stage_id: stage.id,
    item_type: 'checklist',
    title: cl.title,
    content: { items: cl.items },
    sort_order: order++,
  });
  total++;

  // 2. Pass/no-pass checklist
  if (cl.pasaItems) {
    await insert('playbook_items', {
      playbook_id: PB,
      stage_id: stage.id,
      item_type: 'checklist',
      title: `✅ ${cl.pasa}`,
      content: {
        items: cl.pasaItems,
        note: cl.noPasa || null,
      },
      sort_order: order++,
    });
    total++;
  }

  // 3. Decision courses
  if (cl.cursos) {
    await insert('playbook_items', {
      playbook_id: PB,
      stage_id: stage.id,
      item_type: 'checklist',
      title: '🔀 Cursos de acción',
      content: {
        items: cl.cursos.map(c => `${c.situacion} → ${c.accion}`),
      },
      sort_order: order++,
    });
    total++;
  }

  // 4. Prohibitions (if any)
  if (cl.prohibiciones) {
    await insert('playbook_items', {
      playbook_id: PB,
      stage_id: stage.id,
      item_type: 'red_flag',
      title: '❌ Prohibiciones absolutas',
      content: {
        items: cl.prohibiciones,
      },
      sort_order: order++,
    });
    total++;
  }

  // 5. Material rules (if any)
  if (cl.reglasMateriales) {
    await insert('playbook_items', {
      playbook_id: PB,
      stage_id: stage.id,
      item_type: 'material',
      title: '📋 Reglas sobre materiales',
      content: {
        items: cl.reglasMateriales,
      },
      sort_order: order++,
    });
    total++;
  }

  console.log(`  ✅ ${stage.name} — ${order} items`);
}

console.log(`\n✅ ${total} checklists/items agregados al playbook EDISUR`);
