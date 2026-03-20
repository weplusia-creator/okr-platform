// Script to create Playbook Agro - exact content from SQL migration
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
if (!createdBy) throw new Error('No user found for org ' + ORG_ID);

console.log('Creating Playbook Agro...');

// 1. Create playbook
const [playbook] = await api('playbooks', {
  organization_id: ORG_ID,
  name: 'Playbook Agro',
  description: 'Playbook comercial para venta de insumos agropecuarios. Desde la entrada del lead hasta el post-venta.',
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

// ===== STAGES =====
const stages = {};

async function createStage(key, data) {
  const [s] = await api('playbook_stages', { playbook_id: PB, ...data });
  stages[key] = s.id;
  console.log(`  Stage: ${data.name}`);
  return s.id;
}

await createStage('entrada', { name: 'Entrada del Lead + Asignación', description: 'El lead ingresa y se asigna a un asesor. Orden de llegada obligatorio.', objective: 'Registrar, asignar y contactar al lead en menos de 1 hora', color: '#3B82F6', sort_order: 0, estimated_duration: '< 1 hora' });
await createStage('contacto', { name: 'Primer Contacto – Llamado', description: 'Contactar, entender necesidad, calificar y definir próximo paso.', objective: 'Confirmar datos técnicos y definir próximo paso en 5-10 min', color: '#8B5CF6', sort_order: 1, estimated_duration: '5-10 min' });
await createStage('noContacto', { name: 'No Contacto – Secuencia', description: 'Secuencia obligatoria cuando el lead no atiende.', objective: 'Agotar todas las vías de contacto antes de descartar', color: '#F59E0B', sort_order: 2, estimated_duration: '48 horas' });
await createStage('calificacion', { name: 'Calificación Profunda', description: 'Determinar si el lead tiene volumen y está en momento de decisión.', objective: 'Clasificar al cliente y decidir si califica', color: '#10B981', sort_order: 3, estimated_duration: '15 min' });
await createStage('visita', { name: 'Visita a Campo / Reunión Técnica', description: 'Confirmar diagnóstico real, validar necesidad, proponer solución.', objective: 'Diagnosticar el lote y presentar solución específica', color: '#EC4899', sort_order: 4, estimated_duration: '1-2 horas' });
await createStage('zonaGris', { name: 'Zona Gris', description: 'El productor dice que lo piensa. Máximo 7 días.', objective: 'Resolver la indefinición en máximo 7 días', color: '#EF4444', sort_order: 5, estimated_duration: 'Máx 7 días' });
await createStage('cierre', { name: 'Cierre – Orden de Compra', description: 'Transformar interés en orden de compra o reserva.', objective: 'Obtener confirmación formal del pedido', color: '#059669', sort_order: 6, estimated_duration: 'Mismo día' });
await createStage('logistica', { name: 'Registración + Logística', description: 'Registrar pedido, confirmar stock, coordinar entrega.', objective: 'Asegurar la entrega correcta y completa', color: '#6366F1', sort_order: 7, estimated_duration: '24-48 horas' });
await createStage('postVenta', { name: 'Post-Venta', description: 'Seguimiento 48hs después de aplicación.', objective: 'Fidelizar y detectar próximas oportunidades', color: '#D97706', sort_order: 8, estimated_duration: '48hs post-aplicación' });

// ===== STEPS =====
console.log('Creating steps...');
const step = (sid, title, type, content, required, order) => api('playbook_steps', { stage_id: sid, title, type, content, is_required: required, sort_order: order });

// Entrada del Lead
await step(stages.entrada, 'Registrar lead en CRM', 'accion', 'Registrar nombre, teléfono, producto consultado, zona y canal de origen.', true, 0);
await step(stages.entrada, 'Asignarse como responsable', 'accion', 'Orden de llegada obligatorio. No hay excusas.', true, 1);
await step(stages.entrada, 'Ver producto consultado', 'accion', 'Identificar qué producto o categoría consultó.', true, 2);
await step(stages.entrada, 'Ver zona productiva', 'accion', 'Identificar zona productiva para evaluar logística.', true, 3);
await step(stages.entrada, 'Identificar si ya es cliente', 'verificacion', 'Buscar en el CRM si ya tiene historial.', true, 4);
await step(stages.entrada, 'Revisar historial de compras', 'accion', 'Si existe, revisar compras anteriores.', false, 5);
await step(stages.entrada, 'Contactar dentro del tiempo máximo', 'verificacion', 'Ideal: < 15 min. Aceptable: < 1 hora.', true, 6);

// Primer Contacto
await step(stages.contacto, 'Confirmar cultivo', 'verificacion', '¿Qué cultivo está trabajando?', true, 0);
await step(stages.contacto, 'Confirmar superficie', 'verificacion', '¿Cuántas hectáreas?', true, 1);
await step(stages.contacto, 'Confirmar zona', 'verificacion', '¿En qué zona productiva?', true, 2);
await step(stages.contacto, 'Confirmar momento del ciclo', 'verificacion', '¿En qué estado está hoy el lote?', true, 3);
await step(stages.contacto, 'Confirmar si ya tiene proveedor', 'verificacion', '¿Ya viene trabajando con otro proveedor?', true, 4);
await step(stages.contacto, 'Confirmar nivel de decisión', 'verificacion', '¿Está en condiciones de definir ahora?', true, 5);
await step(stages.contacto, 'Definir próximo paso', 'accion', 'Cotización, visita o reunión. Siempre con día y hora.', true, 6);

// No Contacto
await step(stages.noContacto, 'Llamado inicial', 'accion', 'Primer intento de contacto telefónico.', true, 0);
await step(stages.noContacto, 'WhatsApp inmediato', 'accion', 'Mensaje de WhatsApp inmediato tras llamado fallido.', true, 1);
await step(stages.noContacto, 'Segundo intento de llamado', 'accion', 'Segundo intento telefónico.', true, 2);
await step(stages.noContacto, 'Último mensaje de cierre', 'accion', 'Mensaje final antes de descartar.', true, 3);
await step(stages.noContacto, 'Descarte formal', 'accion', 'Registrar motivo: No contacto.', true, 4);

// Calificación Profunda
await step(stages.calificacion, 'Determinar volumen', 'verificacion', '¿Tiene volumen atractivo?', true, 0);
await step(stages.calificacion, 'Evaluar momento de decisión', 'verificacion', '¿Está en momento de decisión?', true, 1);
await step(stages.calificacion, 'Evaluar si vale visita', 'verificacion', '¿Justifica visita a campo?', true, 2);
await step(stages.calificacion, 'Descartar precio-shopping', 'verificacion', '¿Solo pide precio sin datos?', true, 3);
await step(stages.calificacion, 'Clasificar perfil de cliente', 'accion', 'Productor chico/medio/grande, Contratista, Ingeniero asesor.', true, 4);
await step(stages.calificacion, 'Registrar perfil y decisión', 'accion', 'Registrar clasificación en CRM.', true, 5);

// Visita a Campo
await step(stages.visita, 'Apertura de la visita', 'accion', 'Ver el lote y entender antes de hablar de números.', true, 0);
await step(stages.visita, 'SPIN - Situación', 'pregunta', '¿Qué venís aplicando hoy?', true, 1);
await step(stages.visita, 'SPIN - Problema', 'pregunta', '¿Qué problema puntual estás viendo?', true, 2);
await step(stages.visita, 'SPIN - Implicación', 'pregunta', 'Si no lo corregís ahora, ¿qué impacto en rendimiento?', true, 3);
await step(stages.visita, 'SPIN - Necesidad', 'pregunta', '¿Qué resultado esperás lograr?', true, 4);
await step(stages.visita, 'Registrar diagnóstico', 'accion', 'Problema, riesgo, rendimiento esperado, presupuesto.', true, 5);
await step(stages.visita, 'Presentar solución', 'accion', '1 solución principal, máx 2 alternativas. No 10 productos.', true, 6);
await step(stages.visita, 'Definir avance', 'verificacion', 'Sí → Cotización. Duda → Zona gris. No → Descarte.', true, 7);

// Zona Gris
await step(stages.zonaGris, 'Agendar próxima acción', 'accion', 'Siempre dejar acción agendada. Máximo 7 días.', true, 0);
await step(stages.zonaGris, 'Reencuadrar la situación', 'accion', 'Script de reencuadre para definir avance o pausa.', true, 1);
await step(stages.zonaGris, 'Reglas de zona gris', 'tip', 'NO bajar precio sin criterio. NO competir por WhatsApp. NO mandar lista completa. NO descontar sin volumen.', true, 2);

// Cierre
await step(stages.cierre, 'Intento de cierre', 'accion', 'Confirmar el pedido para asegurar disponibilidad.', true, 0);
await step(stages.cierre, 'Obtener confirmación formal', 'verificacion', 'Orden de compra, escrito o reserva.', true, 1);
await step(stages.cierre, 'Si no confirma', 'accion', 'Vuelve a zona gris.', false, 2);

// Registración + Logística
await step(stages.logistica, 'Registrar pedido en sistema', 'accion', 'Cargar pedido completo.', true, 0);
await step(stages.logistica, 'Confirmar stock', 'verificacion', 'Verificar disponibilidad.', true, 1);
await step(stages.logistica, 'Confirmar condiciones', 'verificacion', 'Precio, descuentos, forma de pago.', true, 2);
await step(stages.logistica, 'Coordinar entrega', 'accion', 'Fecha, lugar y logística.', true, 3);
await step(stages.logistica, 'Confirmar forma de pago', 'verificacion', 'Modalidad de pago acordada.', true, 4);
await step(stages.logistica, 'Confirmación final al cliente', 'accion', 'Comunicar pedido, producto, hectáreas y fecha.', true, 5);

// Post-Venta
await step(stages.postVenta, 'Contacto 48hs post-aplicación', 'accion', '¿Cómo viste el resultado? ¿Notaste diferencia?', true, 0);
await step(stages.postVenta, 'Registrar feedback', 'accion', 'Resultado de aplicación y satisfacción.', true, 1);
await step(stages.postVenta, 'Detectar próxima oportunidad', 'tip', 'Acompañar la campaña. Identificar próximas necesidades.', true, 2);

// ===== SCRIPTS =====
console.log('Creating scripts...');
const script = (sid, name, situation, text, notes, order) => api('playbook_scripts', { playbook_id: PB, stage_id: sid, name, situation, script_text: text, notes, sort_order: order });

await script(stages.contacto, 'Apertura de llamada', 'Lead nuevo consulta', 'Hola ___, ¿cómo estás?\nTe habla ___ de [Empresa].\nTe llamo por la consulta que hiciste sobre ___, ¿es correcto?', 'Tono amable, directo.', 0);
await script(stages.contacto, 'Micro-encuadre técnico', 'Instalar autoridad técnica', 'Antes de pasarte números, quiero entender bien el lote y el momento del cultivo así te asesoro correctamente.', 'Eleva el estándar y evita guerra de precios.', 1);
await script(stages.contacto, 'Diagnóstico técnico', 'Obtener datos del lote', '¿Qué cultivo estás trabajando?\n¿Cuántas hectáreas?\n¿En qué zona?\n¿En qué estado está hoy el lote?', 'Registrar todo. Sin estos datos no se puede cotizar.', 2);
await script(stages.contacto, 'Situación actual', 'Clasificar proveedores', '¿Ya venís trabajando con algún proveedor o estás evaluando alternativas?', 'Clasificar: Fiel / Comparando / Sin proveedor estable.', 3);
await script(stages.contacto, 'Nivel de decisión', 'Detectar intención real', 'Si la propuesta cierra técnica y económicamente, ¿estás en condiciones de definir ahora o lo estás evaluando con más tiempo?', null, 4);
await script(stages.contacto, 'Venta del próximo paso', 'Cerrar con día y hora', 'Con lo que me contás, prefiero prepararte una propuesta bien ajustada y no tirarte un precio al aire.\n¿Te parece si la vemos hoy a la tarde por llamada o mañana en el campo?', 'Nunca: Te la mando y vemos.', 5);
await script(stages.noContacto, 'WhatsApp #1', 'Lead no atendió', 'Hola ___, soy ___ de [Empresa].\nTe llamé por la consulta sobre ___.\nPara cotizar bien necesito un par de datos del lote.\n¿Te queda mejor que lo veamos hoy o mañana?', null, 6);
await script(stages.noContacto, 'WhatsApp #2 - Cierre', 'Último intento', 'Intenté comunicarme para asesorarte correctamente.\nSi no es el momento lo dejamos en pausa, y cuando lo retomes lo vemos sin problema.', 'Registrar motivo: No contacto.', 7);
await script(stages.zonaGris, 'Reencuadre zona gris', 'Productor indeciso', 'Entiendo que lo estés evaluando.\n¿Te parece si lo retomamos el jueves y vemos si avanzamos o lo dejamos para más adelante?', 'Zona gris dura máximo 7 días.', 8);
await script(stages.cierre, 'Intento de cierre', 'Cliente interesado', 'Con lo que vimos y si estás de acuerdo, el paso lógico sería confirmar el pedido así aseguramos disponibilidad.', null, 9);
await script(stages.logistica, 'Confirmación final', 'Pedido confirmado', 'Perfecto, queda confirmado el pedido de ___ para ___ hectáreas.\nTe confirmo entrega el ___.', null, 10);
await script(stages.postVenta, 'Seguimiento 48hs', 'Post-aplicación', '¿Cómo viste el resultado?\n¿Notaste diferencia?', 'El seguimiento no es presión, es acompañar.', 11);

// ===== QUESTIONS =====
console.log('Creating questions...');
const question = (sid, cat, q, purpose, listen, followup, order) => api('playbook_questions', { playbook_id: PB, stage_id: sid, category: cat, question: q, purpose, what_to_listen: listen, followup_question: followup, sort_order: order });

await question(stages.visita, 'necesidad', '¿Qué venís aplicando hoy?', 'Entender tratamiento actual', 'Productos, dosis, frecuencia', '¿Y cómo te está funcionando?', 0);
await question(stages.visita, 'dolor', '¿Qué problema puntual estás viendo en el lote?', 'Identificar el dolor concreto', 'Plagas, malezas, enfermedades, rendimiento', '¿Desde cuándo lo venís notando?', 1);
await question(stages.visita, 'impacto', 'Si no lo corregís ahora, ¿qué impacto en rendimiento?', 'Cuantificar costo de no actuar', 'Pérdida en qq/ha, riesgo', '¿Cuánto estimás que te cuesta por hectárea?', 2);
await question(stages.visita, 'necesidad', '¿Qué resultado esperás lograr con esta aplicación?', 'Definir éxito del productor', 'Rendimiento, control, costo-beneficio', '¿Cuál sería el escenario ideal?', 3);
await question(stages.contacto, 'necesidad', '¿Qué cultivo estás trabajando?', 'Dato básico', 'Soja, maíz, trigo, girasol', null, 4);
await question(stages.contacto, 'necesidad', '¿Cuántas hectáreas?', 'Determinar volumen', 'Número concreto', null, 5);
await question(stages.contacto, 'necesidad', '¿En qué zona productiva?', 'Evaluar logística', 'Zona núcleo, marginal', null, 6);
await question(stages.contacto, 'competencia', '¿Ya tenés proveedor o estás evaluando?', 'Situación competitiva', 'Fiel, comparando, sin proveedor', null, 7);

// ===== OBJECTIONS =====
console.log('Creating objections...');

await api('playbook_objections', { playbook_id: PB, objection: 'Ya tengo proveedor', category: 'competencia', severity: 'alto', responses: [{ type: 'reencuadre', text: 'No busco reemplazar a tu proveedor. Muchos productores trabajan con más de uno para tener alternativas.', example: 'Varios clientes de la zona trabajan con 2-3 proveedores.' }, { type: 'pregunta', text: '¿Qué es lo que más valorás de tu proveedor actual?', example: null }], signals_working: 'El productor empieza a comparar abiertamente', if_not_working: 'Dejar puerta abierta para próxima campaña.', sort_order: 0 });
await api('playbook_objections', { playbook_id: PB, objection: 'Está muy caro', category: 'precio', severity: 'alto', responses: [{ type: 'reencuadre', text: '¿Comparado con qué referencia? El costo por hectárea varía mucho según dosis y resultado.', example: null }, { type: 'evidencia', text: 'Si miramos el costo por quintal producido, nuestra solución rinde más.', example: 'En un lote similar, el costo fue $X/ha pero el rinde subió Y qq.' }], signals_working: 'Pide ver los números en detalle', if_not_working: 'No bajar precio. Volver a valor técnico.', sort_order: 1 });
await api('playbook_objections', { playbook_id: PB, objection: 'Lo tengo que pensar', category: 'tiempo', severity: 'medio', responses: [{ type: 'pregunta', text: '¿Qué es lo que te gustaría evaluar puntualmente?', example: null }, { type: 'reencuadre', text: 'Lo importante es no perder la ventana de aplicación. ¿Lo definimos el jueves?', example: null }], signals_working: 'Acepta fecha concreta', if_not_working: 'Si no define en 7 días, zona gris vencida.', sort_order: 2 });
await api('playbook_objections', { playbook_id: PB, objection: 'Estoy esperando que llueva', category: 'tiempo', severity: 'medio', responses: [{ type: 'reencuadre', text: 'Justamente por eso conviene tener el producto reservado para aplicar apenas se dé la ventana.', example: null }], signals_working: 'Acepta reservar producto', if_not_working: 'Mantener contacto semanal.', sort_order: 3 });
await api('playbook_objections', { playbook_id: PB, objection: 'Necesito financiamiento', category: 'precio', severity: 'medio', responses: [{ type: 'reencuadre', text: 'Tenemos opciones de financiamiento. ¿Qué plazo te serviría?', example: null }, { type: 'concesion', text: 'Podemos armar un plan de pago en cuotas atado a cosecha.', example: null }], signals_working: 'Acepta ver opciones', if_not_working: 'Preparar propuesta con condiciones flexibles.', sort_order: 4 });

// ===== ITEMS (checklists & resources) =====
console.log('Creating items...');

await api('playbook_items', { playbook_id: PB, stage_id: stages.entrada, item_type: 'checklist', title: 'Checklist operativo inmediato', content: { items: ['Registrar en CRM', 'Asignarse como responsable', 'Ver producto consultado', 'Ver zona productiva', 'Identificar si ya es cliente', 'Revisar historial de compras'], note: 'Tiempo máx: Ideal < 15 min, Aceptable < 1 hora.' }, sort_order: 0 });
await api('playbook_items', { playbook_id: PB, stage_id: stages.contacto, item_type: 'checklist', title: 'Checklist de calificación', content: { items: ['Cultivo', 'Hectáreas', 'Zona', 'Estado del cultivo', 'Si ya tiene proveedor', 'Nivel de decisión', 'Volumen estimado'], note: 'Si no puede responder esto → no puede cotizar.' }, sort_order: 1 });
await api('playbook_items', { playbook_id: PB, stage_id: stages.calificacion, item_type: 'checklist', title: 'Criterios de NO calificación', content: { items: ['Volumen mínimo irrelevante', 'Solo pide precio sin datos', 'Fuera de zona logística', 'Solo busca comparación informal'], note: 'Si alguno aplica → no califica.' }, sort_order: 2 });
await api('playbook_items', { playbook_id: PB, stage_id: stages.visita, item_type: 'checklist', title: 'Registrar en visita', content: { items: ['Problema concreto del lote', 'Riesgo productivo', 'Rendimiento esperado', 'Presupuesto implícito'], note: 'Regla de oro: mientras más claro el problema, menos se habla de precio.' }, sort_order: 3 });
await api('playbook_items', { playbook_id: PB, stage_id: stages.zonaGris, item_type: 'checklist', title: 'Prohibiciones en Zona Gris', content: { items: ['NO bajar precio sin criterio', 'NO competir por WhatsApp', 'NO mandar lista completa', 'NO descontar sin volumen confirmado'], note: 'Máximo 7 días. Siempre dejar próxima acción agendada.' }, sort_order: 4 });
await api('playbook_items', { playbook_id: PB, stage_id: stages.logistica, item_type: 'checklist', title: 'Checklist de entrega', content: { items: ['Registrar pedido', 'Confirmar stock', 'Confirmar condiciones', 'Coordinar entrega', 'Confirmar forma de pago', 'Confirmación al cliente'], note: null }, sort_order: 5 });
await api('playbook_items', { playbook_id: PB, stage_id: stages.postVenta, item_type: 'resource', title: 'Mensaje para el equipo', content: { items: ['No gana el que pasa precio primero', 'Gana el que diagnostica mejor', 'Gana el que entiende el lote', 'Gana el que ordena la decisión'], note: 'La venta se gana con conocimiento técnico y acompañamiento.' }, sort_order: 6 });

console.log('\n✅ Playbook Agro creado exitosamente!');
console.log(`   ID: ${PB}`);
console.log(`   Stages: 9`);
console.log(`   URL: /playbook/${PB}`);
