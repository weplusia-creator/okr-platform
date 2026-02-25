#!/usr/bin/env node
/**
 * Seed script: Creates the EDISUR DEFINITIVO playbook directly in Supabase.
 * Run: node scripts/seed-edisur-playbook.mjs
 */

const SUPABASE_URL = 'https://avgfqdtfmoqkjfgtvrtg.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ORG_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = 'dd1e5290-803d-472e-96ae-9a43a80b7de3'; // Mateo (super_admin)

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Prefer': 'return=representation',
};

async function api(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status} on ${path}: ${err}`);
  }
  return res.json();
}

// ===== TEMPLATE DATA =====
const STAGES = [
  {
    name: 'A. Entrada del Lead',
    description: 'Ingreso automático del lead desde Gestar (formulario web, campañas, portales, contacto directo) con información mínima.',
    objective: 'Tomar el lead inmediatamente. No existe selección ni preferencia: orden de llegada obligatorio. El asesor debe ser dueño del lead desde el minuto cero.',
    estimated_duration: '< 15 min ideal / < 1 hora aceptable',
    color: '#3B82F6',
    icon: 'Inbox',
    steps: [
      { title: 'Abrir Gestar', type: 'accion', content: 'Acceder al sistema CRM Gestar para ver los leads entrantes.', is_required: true },
      { title: 'Tomar lead (asignarse como responsable)', type: 'accion', content: 'El lead DEBE ser tomado inmediatamente. No se puede rechazar ni esperar. Esta etapa NO es opinable.', is_required: true },
      { title: 'Ver fecha y hora de ingreso', type: 'verificacion', content: 'Registrar cuándo ingresó el lead para medir tiempos de respuesta.', is_required: true },
      { title: 'Leer producto consultado', type: 'accion', content: 'Identificar como mínimo si es ladrillo o lote.', is_required: true },
      { title: 'Chequear si es cliente previo de Edisur', type: 'verificacion', content: 'Buscar en el sistema si el lead ya tiene historial con la empresa.', is_required: true },
      { title: 'Buscar al lead en LinkedIn / RRSS', type: 'accion', content: 'Capturar información de valor del lead antes del primer contacto.', is_required: true },
      { title: 'Prepararse para llamar', type: 'accion', content: 'Tener claro producto consultado y datos del lead antes de la llamada.', is_required: true },
    ],
    scripts: [],
    questions: [],
  },
  {
    name: 'B. Primer Contacto – Llamado',
    description: 'Contactar + calificar + vender la reunión presencial. NO es cerrar, pasar precios, explicar productos ni "sacar dudas".',
    objective: 'En 5-7 minutos lograr: confirmar interés real, arquetipo (inversor/familia), etapa de búsqueda, horizonte (pozo/terminado), detectar fricción, instalar autoridad, vender reunión y cerrar fecha.',
    estimated_duration: '5-7 minutos',
    color: '#8B5CF6',
    icon: 'Phone',
    steps: [
      { title: 'Apertura – Control + Contexto (20 seg)', type: 'accion', content: '"Hola ___, ¿cómo estás? Te habla ___ de EDISUR. Te llamo por la consulta que hiciste sobre ___, ¿es correcto?" Si dice sí, continuar. Si duda, reconfirmar producto.', is_required: true },
      { title: 'Micro-encuadre (instala autoridad)', type: 'accion', content: '"Perfecto. Antes de avanzar, quiero entender bien qué estás buscando para no marearte con información que no te sirva." Esto instala: orden, profesionalismo y criterio.', is_required: true },
      { title: 'Identificar arquetipo', type: 'pregunta', content: '"¿Esto lo estás pensando más como inversión o para vivir?" Esperar respuesta. No interrumpir. Registrar: Familia o Inversor.', is_required: true },
      { title: 'Etapa de búsqueda', type: 'pregunta', content: '"¿Ya estás viendo opciones concretas o recién empezando a evaluar?" Clasifica: Exploratorio / Comparando / Decisión inminente.', is_required: true },
      { title: 'Horizonte (pozo vs terminado)', type: 'pregunta', content: '"¿Te interesa algo en pozo para capitalizar crecimiento o preferís algo ya terminado?" Esto define producto real.', is_required: true },
      { title: 'Filtro de intensidad', type: 'pregunta', content: '"Si encontrás algo que realmente encaje, ¿estarías en condiciones de avanzar ahora o lo estás mirando con más calma?" Ya sabés si es real o curioso.', is_required: true },
      { title: 'Pregunta de foco (insight profundo)', type: 'pregunta', content: '"¿Qué tendría que pasar para que digas \'esto tiene sentido\'?" Silencio. Dejar hablar. Ahí aparece: miedo, retorno esperado, zona deseada, precio implícito, objeción futura.', is_required: true },
      { title: 'Verificar calificación completa', type: 'verificacion', content: 'Al terminar, el asesor debe poder responder: 1) Arquetipo, 2) Etapa de búsqueda, 3) Horizonte (pozo/terminado), 4) Nivel de decisión, 5) Qué valora, 6) Si puede avanzar. Si no puede responder esas 6 cosas, NO está listo para vender reunión.', is_required: true },
      { title: 'Vender la reunión', type: 'accion', content: '"Justamente por todo lo que me contás, la mejor manera de asesorarte bien es vernos 30 minutos en la oficina. Porque por teléfono puedo darte datos sueltos, pero en persona filtramos opciones reales y te vas con claridad. Nos ahorramos tiempo los dos." (Pausa breve) "¿Te parece que lo hagamos así?"', is_required: true },
      { title: 'Cerrar con fecha (OBLIGATORIO)', type: 'accion', content: 'Si dice sí: "Perfecto. ¿Te queda mejor por la mañana o por la tarde? ¿Martes o miércoles?" Siempre alternativa cerrada. Nunca "Avisame". Ejemplo: "Tengo disponible el martes a las 17 o el jueves a las 11. ¿Cuál te queda mejor?"', is_required: true },
      { title: 'Confirmación final', type: 'accion', content: '"Perfecto, entonces nos vemos el ___ a las ___. Te mando ubicación y cualquier cosa me escribís por acá."', is_required: true },
    ],
    scripts: [
      {
        name: 'Script Llamada Inbound Completo',
        situation: 'Primer contacto telefónico con lead inbound de Gestar',
        script_text: '1. APERTURA (20 seg):\n"Hola ___, ¿cómo estás? Te habla ___ de EDISUR. Te llamo por la consulta que hiciste sobre ___, ¿es correcto?"\n\n2. MICRO-ENCUADRE:\n"Perfecto. Antes de avanzar, quiero entender bien qué estás buscando para no marearte con información que no te sirva."\n\n3. ARQUETIPO:\n"¿Esto lo estás pensando más como inversión o para vivir?"\n\n4. ETAPA:\n"¿Ya estás viendo opciones concretas o recién empezando a evaluar?"\n\n5. HORIZONTE:\n"¿Te interesa algo en pozo para capitalizar crecimiento o preferís algo ya terminado?"\n\n6. FILTRO:\n"Si encontrás algo que realmente encaje, ¿estarías en condiciones de avanzar ahora o lo estás mirando con más calma?"\n\n7. FOCO:\n"¿Qué tendría que pasar para que digas \'esto tiene sentido\'?"\n(Silencio. Dejar hablar.)\n\n8. VENTA DE REUNION:\n"Justamente por todo lo que me contás, la mejor manera de asesorarte bien es vernos 30 minutos en la oficina. Porque por teléfono puedo darte datos sueltos, pero en persona filtramos opciones reales y te vas con claridad. Nos ahorramos tiempo los dos."\n(Pausa)\n"¿Te parece que lo hagamos así?"\n\n9. CIERRE CON FECHA:\n"Tengo disponible el martes a las 17 o el jueves a las 11. ¿Cuál te queda mejor?"\n\n10. CONFIRMACION:\n"Perfecto, entonces nos vemos el ___ a las ___. Te mando ubicación y cualquier cosa me escribís por acá."',
        notes: 'Principio psicológico: La llamada NO es para informar. Es para ORDENAR. La reunión se vende como "la manera más eficiente de tomar una buena decisión".\n\nSi responde "no sé / estoy viendo / pasame precio":\n"Entiendo. El tema con pasar precios aislados es que sin contexto suelen generar más dudas que claridad, tenemos mucha diversidad de productos y disparidad de precios. Prefiero que lo veamos bien y si no encaja, te lo voy a decir yo primero." Y volver a ofrecer día concreto.',
      },
    ],
    questions: [
      { category: 'necesidad', question: '¿Esto lo estás pensando más como inversión o para vivir?', purpose: 'Identificar arquetipo: Familia vs Inversor' },
      { category: 'timeline', question: '¿Ya estás viendo opciones concretas o recién empezando a evaluar?', purpose: 'Clasificar etapa: Exploratorio / Comparando / Decisión inminente' },
      { category: 'necesidad', question: '¿Te interesa algo en pozo para capitalizar crecimiento o preferís algo ya terminado?', purpose: 'Definir horizonte temporal y producto real' },
      { category: 'decision', question: 'Si encontrás algo que realmente encaje, ¿estarías en condiciones de avanzar ahora o lo estás mirando con más calma?', purpose: 'Detectar urgencia sin preguntar "urgencia". Saber si es real o curioso.' },
      { category: 'vision', question: '¿Qué tendría que pasar para que digas "esto tiene sentido"?', purpose: 'Abrir insight profundo. Aparece: miedo, retorno esperado, zona deseada, precio implícito, objeción futura.' },
    ],
  },
  {
    name: 'B1. Secuencia No Contacto',
    description: 'Protocolo cerrado cuando el lead NO atiende. No se improvisa, no se "siente", no se decide caso por caso.',
    objective: 'Ejecutar secuencia obligatoria: 2 llamados + 2 WhatsApp. Si no responde, descartar formalmente a Campañas.',
    estimated_duration: '2-3 días',
    color: '#6366F1',
    icon: 'PhoneOff',
    steps: [
      { title: 'Intento #1 – Llamado telefónico', type: 'accion', content: 'Llamar al lead. Si no atiende, NO insistir en el momento.', is_required: true },
      { title: 'WhatsApp #1 – Bienvenida (5-10 min post llamado)', type: 'accion', content: 'Enviar dentro de los 5-10 minutos posteriores al llamado fallido.', is_required: true },
      { title: 'Intento #2 – Llamado día siguiente', type: 'accion', content: 'Llamar al día siguiente, misma franja horaria. Si atiende → Etapa C. Si no → WhatsApp #2.', is_required: true },
      { title: 'WhatsApp #2 – Cierre de secuencia (dentro de 60 min)', type: 'accion', content: 'SIEMPRE enviar último WhatsApp de cierre. NUNCA descartar sin aviso.', is_required: true },
      { title: 'Descarte formal', type: 'accion', content: 'Si no responde tras WhatsApp #2: Mover a Oportunidades Cerradas. Motivo: "No contacto". Queda disponible para Campañas.', is_required: true },
    ],
    scripts: [
      { name: 'WhatsApp #1 – Bienvenida', situation: 'Lead no atendió el primer llamado. Enviar dentro de 5-10 minutos.', script_text: 'Hola ___, soy ___ de EDISUR.\nTe llamé recién por la consulta que hiciste sobre ___.\n\nPara asesorarte bien necesito entender un poco qué estás buscando y así evitar enviarte información que no te sirva.\n\n¿Te queda mejor que lo veamos con un llamado corto hoy por la tarde o mañana por la mañana?', notes: 'Objetivo: generar reconocimiento, humanizar, habilitar respuesta.' },
      { name: 'WhatsApp #2 – Cierre de secuencia', situation: 'Lead no atendió segundo llamado. Enviar dentro de 60 minutos.', script_text: 'Hola ___, vuelvo a escribirte por la consulta que hiciste en EDISUR sobre ___.\n\nIntenté comunicarme un par de veces para orientarte bien, pero quizás no sea el momento.\n\nSi querés que lo veamos ahora, coordinamos un llamado breve y lo ordenamos. ¿Preferís xxx a las xxx o yyy a las yyy?\nSi no, lo dejamos en pausa y cuando retomes la búsqueda me escribís sin problema.', notes: 'Siempre ofrecer alternativa cerrada. NUNCA descartar sin este mensaje.' },
    ],
    questions: [],
  },
  {
    name: 'C. Calificación + Reunión',
    description: 'Lead atiende. Determinar si califica y cerrar el próximo paso. El próximo paso SIEMPRE es reunión.',
    objective: 'En una sola llamada: confirmar motivo, identificar arquetipo, identificar horizonte temporal, ver si califica, vender reunión.',
    estimated_duration: '5-10 minutos',
    color: '#10B981',
    icon: 'ClipboardCheck',
    steps: [
      { title: 'Confirmación de consulta', type: 'accion', content: '"Buenísimo, te llamo por la consulta que hiciste sobre ___. Contame un poco qué te motivó a escribirnos."', is_required: true },
      { title: 'Identificar arquetipo (NO negociable)', type: 'pregunta', content: '"¿Esto lo estás pensando más como inversión o para vivir?"', is_required: true },
      { title: 'Validar estado de búsqueda', type: 'pregunta', content: '"¿Ya estás viendo opciones concretas o recién empezando a evaluar?"', is_required: true },
      { title: 'Decisión: ¿Califica?', type: 'verificacion', content: 'NO califica: alquiler, fuera de target, productos que no desarrollamos. SÍ califica → vender reunión. IMPORTANTE: Inversor que busca producto que no tenemos → SI O SI llevarlo a reunión y presentarle otros vehículos.', is_required: true },
      { title: 'Vender la reunión (no sugerir, VENDER)', type: 'accion', content: '"Para no marearte con información por teléfono, lo que hacemos es una reunión corta en la oficina donde filtramos opciones y te vas con claridad real. Es la mejor forma de avanzar bien. ¿Te parece que lo veamos así?"', is_required: true },
    ],
    scripts: [
      { name: 'Salida elegante (NO califica)', situation: 'Lead no califica – busca alquiler u otro producto', script_text: '"Perfecto, te agradezco la claridad. En este caso nosotros trabajamos con venta, así que no te quiero hacer perder tiempo. Si más adelante volvés a evaluar compra, encantados de ayudarte."', notes: 'Descartar + cargar motivo. Elegible para campañas.' },
      { name: 'Venta explícita de reunión', situation: 'Lead califica, vender el próximo paso', script_text: '"Para no marearte con información por teléfono, lo que hacemos es una reunión corta en la oficina donde filtramos opciones y te vas con claridad real. Es la mejor forma de avanzar bien. ¿Te parece que lo veamos así?"', notes: 'Sí acepta → D. No acepta → E (Zona gris).' },
    ],
    questions: [
      { category: 'necesidad', question: '¿Qué te motivó a escribirnos?', purpose: 'Confirmar motivo de interés real' },
      { category: 'necesidad', question: '¿Esto lo estás pensando más como inversión o para vivir?', purpose: 'Identificar arquetipo. Pregunta NO negociable.' },
      { category: 'timeline', question: '¿Ya estás viendo opciones concretas o recién empezando a evaluar?', purpose: 'Validar estado de búsqueda' },
    ],
  },
  {
    name: 'E. Zona Gris Telefónica',
    description: 'Etapa MÁS PELIGROSA del funnel. Atienden, califican, pero no avanzan.',
    objective: 'Llevar a reunión en máx 2 ciclos de 7 días. Reencuadrar toda objeción hacia la reunión. Nunca enviar precio sin reunión.',
    estimated_duration: '7-14 días máximo',
    color: '#F59E0B',
    icon: 'AlertTriangle',
    steps: [
      { title: 'Clasificar el "pero"', type: 'verificacion', content: 'Tiempo: "Ahora no puedo" / Etapa: "Recién arranco" / Comparación: "Estoy viendo opciones" / Precio: "Pasame valores"', is_required: true },
      { title: 'Aplicar script de encuadre', type: 'accion', content: '"Perfecto, lo entiendo. Justamente para eso está la reunión, para ordenar todo y que no pierdas tiempo comparando sin contexto." SIEMPRE agendar próximo contacto.', is_required: true },
      { title: 'Regla – Brochure', type: 'tip', content: 'PERMITIDO: máximo 1 desarrollo. PROHIBIDO: catálogos múltiples.', is_required: true },
      { title: 'Regla – Precio', type: 'tip', content: 'PROHIBIDO precio exacto sin reunión. PERMITIDO rango de precios (de X a Y) y tasas de crecimiento.', is_required: true },
      { title: 'Regla – Planimetría', type: 'tip', content: 'USO CONTROLADO: solo ubicación general. NO disponibilidad exacta (competidores, mystery shoppers).', is_required: true },
      { title: 'Evaluar interés activo', type: 'verificacion', content: 'Interés activo: responde, pregunta, acepta hablar. Sin interés: no responde, evita, posterga sin fecha. Máx 2 ciclos → descartar.', is_required: true },
    ],
    scripts: [
      { name: 'Encuadre zona gris', situation: 'Lead califica pero no avanza a reunión', script_text: '"Perfecto, lo entiendo. Justamente para eso está la reunión, para ordenar todo y que no pierdas tiempo comparando sin contexto. Si te parece, lo retomamos en unos días y lo vemos bien."', notes: 'Si pide precio: "El tema con pasar precios aislados es que sin contexto suelen generar más dudas que claridad. Prefiero que lo veamos bien y si no encaja, te lo voy a decir yo primero."' },
    ],
    questions: [],
  },
  {
    name: 'D. Pre-Reunión (Preparación)',
    description: 'Llegar a la reunión con control, no a improvisar. Investigar para hacer mejores preguntas.',
    objective: 'Prepararse con hipótesis, no con respuestas. Tener toda la info antes de buscar al cliente.',
    estimated_duration: '15-30 min antes de reunión',
    color: '#06B6D4',
    icon: 'Briefcase',
    steps: [
      { title: 'Revisar notas del llamado', type: 'accion', content: 'Releer toda la información registrada del lead.', is_required: true },
      { title: 'Identificar arquetipo preliminar', type: 'verificacion', content: 'Confirmar: Inversor o Familia. Producto consultado. Horizonte (pozo/terminado).', is_required: true },
      { title: 'Llegar con hipótesis, no con respuesta', type: 'tip', content: 'La preparación es para hacer mejores preguntas, no para tener todas las respuestas.', is_required: true },
      { title: 'Checklist obligatorio pre-reunión', type: 'verificacion', content: '1. Nombre completo\n2. Producto consultado\n3. Arquetipo preliminar\n4. Estado de búsqueda\n5. Qué espera resolver\n6. Qué NO se va a mostrar\n7. Preguntas de calificación listas\n\nSi no puede responder esto, NO empieza la reunión.', is_required: true },
    ],
    scripts: [],
    questions: [],
  },
  {
    name: 'F. Reunión Presencial – Base',
    description: 'Columna vertebral del playbook. Entender qué necesita, filtrar opciones, salir con próximo paso concreto.',
    objective: '1) Entender necesidad real. 2) Filtrar opciones. 3) Salir con próximo paso agendado. NO cerrar. NO mostrar todo.',
    estimated_duration: '30-45 minutos',
    color: '#EC4899',
    icon: 'Users',
    steps: [
      { title: 'Apertura – autoridad + tranquilidad', type: 'accion', content: '"Gracias por venir. La idea de esta reunión es entender bien qué estás buscando y ver si tiene sentido avanzar con alguna opción concreta. Si vemos que no, también te lo voy a decir con total honestidad."', is_required: true },
      { title: 'Confirmar arquetipo (OBLIGATORIO)', type: 'pregunta', content: '"¿Esto lo estás pensando más como inversión o para vivir?" Registrar: Inversor / Familia.', is_required: true },
      { title: 'Confirmar producto (OBLIGATORIO)', type: 'pregunta', content: '"¿Te estás inclinando más por lote o por un departamento/casa ya construida?" Registrar: Lote / Ladrillo.', is_required: true },
      { title: 'Confirmar horizonte temporal (OBLIGATORIO)', type: 'pregunta', content: 'Registrar: Pozo / Terminado.', is_required: true },
      { title: 'Confirmar presupuesto (OBLIGATORIO)', type: 'pregunta', content: 'Registrar: Rango aproximado.', is_required: true },
      { title: 'Perfilado del cliente (OBLIGATORIO)', type: 'pregunta', content: '"¿A qué te dedicás? ¿Desde cuándo?" Registrar: actividad y antigüedad.', is_required: true },
      { title: 'Indagación SPIN suave', type: 'accion', content: '"Contame qué te llevó a empezar a buscar ahora."\n"¿Qué cosas son las que hoy más te importan?"\n"¿Qué ya viste o comparaste?"', is_required: true },
      { title: 'Regla de oro', type: 'tip', content: 'Mientras más clara sea la indagación, menos material se muestra.', is_required: true },
      { title: 'Decisión: ¿LOTE o LADRILLO?', type: 'verificacion', content: 'LOTE → etapa G. LADRILLO → etapa H.', is_required: true },
    ],
    scripts: [
      { name: 'Apertura de reunión', situation: 'Inicio de reunión presencial', script_text: '"Gracias por venir. La idea de esta reunión es entender bien qué estás buscando y ver si tiene sentido avanzar con alguna opción concreta. Si vemos que no, también te lo voy a decir con total honestidad."', notes: 'Instala: autoridad + tranquilidad + encuadre.' },
    ],
    questions: [
      { category: 'necesidad', question: '¿Esto lo estás pensando más como inversión o para vivir?', purpose: 'Confirmar arquetipo. OBLIGATORIO.' },
      { category: 'necesidad', question: '¿Te inclinás más por lote o depto/casa construida?', purpose: 'Confirmar producto: Lote vs Ladrillo.' },
      { category: 'presupuesto', question: '¿Cuál es tu rango de presupuesto disponible?', purpose: 'Filtrar opciones.' },
      { category: 'dolor', question: '¿Qué te llevó a empezar a buscar ahora?', purpose: 'Entender motivación real.' },
      { category: 'vision', question: '¿Qué cosas son las que hoy más te importan que se cumplan?', purpose: 'Criterios de decisión clave.' },
      { category: 'competencia', question: '¿Qué ya viste o comparaste hasta ahora?', purpose: 'Marco de referencia y competencia.' },
      { category: 'necesidad', question: '¿A qué te dedicás? ¿Desde cuándo?', purpose: 'Perfilado del cliente.' },
    ],
  },
  {
    name: 'G. Reunión Lote',
    description: 'Filtrar zonas, opciones, características y rango de precio. No cerrar por cerrar, cerrar el AVANCE.',
    objective: 'Filtrar zonas y opciones (contiguos, orientación, esquina, frente espacio verde). Definir próximo paso concreto.',
    estimated_duration: '30-45 minutos',
    color: '#14B8A6',
    icon: 'MapPin',
    steps: [
      { title: 'Herramientas permitidas', type: 'tip', content: 'PERMITIDO: Gestar + Google Maps. PROHIBIDO: Brochures, listados masivos, precios sin contexto.', is_required: true },
      { title: 'Trabajo con mapa', type: 'accion', content: '"Primero veamos ubicación y contexto, después afinamos opciones."', is_required: true },
      { title: 'Indagación – Uso previsto', type: 'pregunta', content: '"¿Esto lo pensás más como resguardo de valor o con idea de construir?"', is_required: true },
      { title: 'Indagación – Horizonte', type: 'pregunta', content: '"¿Qué horizonte de tiempo tenés?"', is_required: true },
      { title: 'Indagación – Condiciones', type: 'pregunta', content: '"¿Hay algo que sí o sí tenga que cumplir el lote?"', is_required: true },
      { title: 'Registrar en CRM', type: 'accion', content: 'Zona preferida, Uso previsto, Horizonte, Condiciones no negociables.', is_required: true },
      { title: 'Cierre de reunión – OBLIGATORIO', type: 'accion', content: '"Perfecto. Para no dejar esto en el aire, el próximo paso lógico es que te prepare 1 o 2 opciones que realmente encajen. ¿Te parece si lo vemos juntos el ___ a las ___?"', is_required: true },
    ],
    scripts: [
      { name: 'Cierre reunión lote', situation: 'Finalización de reunión sobre lotes', script_text: '"Perfecto. Para no dejar esto en el aire, el próximo paso lógico es que te prepare 1 o 2 opciones que realmente encajen con lo que hablamos. ¿Te parece si lo vemos juntos el ___ a las ___?"', notes: 'NUNCA terminar en "lo veo y te aviso". Una reunión sin próximo paso no es una reunión: es solo una charla.' },
    ],
    questions: [
      { category: 'necesidad', question: '¿Esto lo pensás más como resguardo de valor o con idea de construir?', purpose: 'Definir uso previsto del lote.' },
      { category: 'timeline', question: '¿Qué horizonte de tiempo tenés?', purpose: 'Entender plazo de inversión/construcción.' },
      { category: 'decision', question: '¿Hay algo que sí o sí tenga que cumplir el lote?', purpose: 'Condiciones no negociables.' },
    ],
  },
  {
    name: 'H. Reunión Ladrillo',
    description: 'Ordenar necesidad real, evitar dispersión. REGLA EDISUR: MÁXIMO 2 opciones.',
    objective: 'Ordenar necesidad real. Si no entran en 2 opciones, falta indagación.',
    estimated_duration: '30-45 minutos',
    color: '#F97316',
    icon: 'Building',
    steps: [
      { title: 'Regla de oro: Máximo 2 opciones', type: 'tip', content: 'Si no entran en 2, falta indagación. Demasiadas opciones confunden y frenan la decisión.', is_required: true },
      { title: 'Indagación profunda antes de mostrar', type: 'accion', content: '"Antes de mostrarte opciones, quiero entender bien esto."\n"¿Es para vivir o invertir?"\n"¿Qué te haría decir \'este sí\'?"\n"¿Qué descartás de plano?"', is_required: true },
      { title: 'Registrar criterios', type: 'accion', content: 'Tipología, Características, Uso, Presupuesto, Urgencia, Criterios de descarte.', is_required: true },
      { title: 'Uso controlado de materiales', type: 'tip', content: 'PERMITIDO: Brochure puntual, planos si suman. PROHIBIDO: "todo lo disponible", comparar precios sin encuadre.', is_required: true },
      { title: '¿Se agenda/realiza visita?', type: 'verificacion', content: 'SÍ → H1 (Visita). NO → I (Post-reunión).', is_required: true },
    ],
    scripts: [],
    questions: [
      { category: 'necesidad', question: '¿Es para vivir o invertir?', purpose: 'Confirmar uso real.' },
      { category: 'vision', question: '¿Qué te haría decir "este sí"?', purpose: 'Criterios positivos de decisión.' },
      { category: 'decision', question: '¿Qué descartás de plano?', purpose: 'Criterios de descarte.' },
    ],
  },
  {
    name: 'H1. Visita a Propiedad',
    description: 'Validar decisión, no generar más dudas. Revisar tips de visita del producto.',
    objective: 'Validar decisión del cliente y definir próximo paso.',
    estimated_duration: '30-60 minutos',
    color: '#FB923C',
    icon: 'Eye',
    steps: [
      { title: 'Encuadre previo', type: 'accion', content: '"La visita es para confirmar sensaciones, no para sumar confusión. Después de verla, definimos cómo seguimos."', is_required: true },
      { title: 'Revisar tips de visita del producto', type: 'accion', content: 'Horarios ideales, orden de visita, a quién buscar en cada proyecto.', is_required: true },
      { title: 'Realizar la visita', type: 'accion', content: 'Acompañar al cliente. Observar reacciones. No sobre-vender.', is_required: true },
      { title: 'Post-visita (OBLIGATORIO)', type: 'pregunta', content: '"¿Esto se acerca a lo que estabas buscando o lo descartamos?" Registrar: Reacción, Objeciones, Interés.', is_required: true },
    ],
    scripts: [
      { name: 'Encuadre pre-visita', situation: 'Antes de visitar la propiedad', script_text: '"La visita es para confirmar sensaciones, no para sumar confusión. Después de verla, definimos cómo seguimos."', notes: null },
      { name: 'Post-visita', situation: 'Después de la visita', script_text: '"¿Esto se acerca a lo que estabas buscando o lo descartamos?"', notes: 'Registrar: Reacción, Objeciones, Interés. Avanza a I.' },
    ],
    questions: [],
  },
  {
    name: 'I. Post-Reunión',
    description: 'Regla madre: toda reunión termina con mensaje post-reunión enviado el mismo día.',
    objective: 'WhatsApp dentro de 2 horas. Definir próximo paso explícito. Buscar reunión/meet/llamado de cierre.',
    estimated_duration: 'Dentro de 2 horas post-reunión',
    color: '#A855F7',
    icon: 'MessageSquare',
    steps: [
      { title: 'WhatsApp post-reunión (DENTRO de 2 horas)', type: 'accion', content: 'Audio o escrito, preferiblemente audio. Personalizado, corto, con dirección. NO enviar: listados masivos, toda disponibilidad, info nueva no hablada.', is_required: true },
      { title: 'Definir próximo paso explícito', type: 'accion', content: 'Reunión/meet/llamado de cierre para presentar mejor opción.', is_required: true },
      { title: 'Registrar en CRM', type: 'accion', content: 'Actualizar estado con info de la reunión.', is_required: true },
    ],
    scripts: [
      { name: 'WhatsApp post-reunión', situation: 'Dentro de las 2 horas post-reunión', script_text: '"Gracias por venir hoy, [Nombre]. Me quedó claro que estás buscando [resumen breve y personalizado]. Para avanzar con orden, el próximo paso es [llamado / reunión / visita]. ¿Te parece si lo vemos el [día] a las [hora]?"', notes: 'Con próximo paso → J. Sin próximo paso → K.' },
    ],
    questions: [],
  },
  {
    name: 'K. Zona Gris Post-Reunión',
    description: 'BLOQUE CRÍTICO. Acá se pierden más operaciones que en cualquier otra etapa.',
    objective: 'Reactivar sin presionar. Ciclo de 15 días con contactos programados: día 3, día 7, día 15.',
    estimated_duration: '15 días',
    color: '#EF4444',
    icon: 'Clock',
    steps: [
      { title: 'Día 0 – WhatsApp post-reunión', type: 'accion', content: 'Ya debe estar hecho (etapa I).', is_required: true },
      { title: 'Día 3 – Reactivación (WhatsApp)', type: 'accion', content: 'WhatsApp corto de reactivación.', is_required: true },
      { title: 'Día 7 – Definición (Llamado)', type: 'accion', content: 'Llamado para definir: avanzamos o pausamos.', is_required: true },
      { title: 'Día 15 – Buscar que hable (Llamado)', type: 'accion', content: 'Entender silencio. Encontrar la objeción REAL.', is_required: true },
      { title: 'Evaluar reactivación', type: 'verificacion', content: 'Reactivado → J. Descarte si: no responde 3 intentos + 1 llamado, sin intención concreta, evita definir.', is_required: true },
    ],
    scripts: [
      { name: 'Día 3 – Reactivación', situation: '3 días post-reunión', script_text: '"Hola [Nombre], te escribo para retomar lo que vimos el otro día. ¿Pudiste revisar las opciones que charlamos o preferís que lo veamos juntos 10 minutos?"', notes: null },
      { name: 'Día 7 – Definición', situation: '7 días post-reunión', script_text: '"Te llamo para ver si seguimos avanzando o si preferís dejarlo en pausa por ahora. Prefiero ser prolijo y respetar tu tiempo."', notes: null },
      { name: 'Día 15 – Buscar que hable', situation: '15 días post-reunión, silencio', script_text: '"Te llamo/escribo para entender tu silencio... ¿qué pasó?"', notes: 'Darle la oportunidad de hablar. Encontrar la objeción REAL.' },
    ],
    questions: [],
  },
  {
    name: 'J. Seguimiento Ordenado',
    description: 'Acompañar leads vivos, no perseguirlos. Seguimiento activo vs Campañas.',
    objective: 'Seguimiento con timing, agenda y contenido mínimo. Leads de campañas que reaccionan vuelven a C.',
    estimated_duration: 'Continuo',
    color: '#22C55E',
    icon: 'Target',
    steps: [
      { title: 'Clasificar: Activo vs Campañas', type: 'verificacion', content: 'Activo: interés real, agenda definida. Campañas: cerrados/reactivables, sin expectativa inmediata.', is_required: true },
      { title: 'Ejecutar según clasificación', type: 'accion', content: 'Activo: contacto según agenda. Campañas: llamados proactivos periódicos.', is_required: true },
    ],
    scripts: [
      { name: 'Script base Campañas', situation: 'Llamado proactivo a lead anterior', script_text: '"Hola [Nombre], te llamo porque en su momento habías consultado por [producto] y quería saber si seguía teniendo sentido retomarlo o si quedó en pausa."', notes: 'Si reaccionan → vuelven a C.' },
    ],
    questions: [],
  },
  {
    name: 'L. Seguimiento con Interés',
    description: 'Lead mostró interés, respondió seguimiento, necesita resolver dudas.',
    objective: 'Explicar cómo sigue el proceso y buscar seña. Decidir: llamado (M) o reunión (N).',
    estimated_duration: '1-3 días',
    color: '#84CC16',
    icon: 'TrendingUp',
    steps: [
      { title: 'Confirmar interés activo', type: 'verificacion', content: 'Lead mostró interés, respondió seguimiento.', is_required: true },
      { title: 'Decidir instancia', type: 'verificacion', content: 'Llamado → M. Reunión presencial → N.', is_required: true },
    ],
    scripts: [],
    questions: [],
  },
  {
    name: 'M. Llamado Dudas + Seña',
    description: 'Aclarar cómo se opera, reducir incertidumbre, avanzar a seña.',
    objective: '1) Aclarar proceso. 2) Reducir incertidumbre. 3) Avanzar a seña.',
    estimated_duration: '15-20 minutos',
    color: '#A855F7',
    icon: 'Phone',
    steps: [
      { title: 'Apertura', type: 'accion', content: '"Te llamo para ordenar dudas y contarte bien cómo sigue el proceso si avanzamos."', is_required: true },
      { title: 'Explicar proceso', type: 'accion', content: 'Servicios, boleto, legales, seña, tiempos, firma. Sin tecnicismos.', is_required: true },
      { title: 'Intento de seña', type: 'accion', content: '"Con lo que ya vimos, el próximo paso lógico sería avanzar con una seña. Puede ser monetaria o de palabra."', is_required: true },
      { title: 'Evaluar avance', type: 'verificacion', content: 'Avance → O. Sin avance → K.', is_required: true },
    ],
    scripts: [
      { name: 'Apertura llamado dudas', situation: 'Resolver dudas y avanzar a seña', script_text: '"Te llamo para ordenar dudas y contarte bien cómo sigue el proceso si avanzamos. La idea es que tengas todo claro antes de tomar una decisión."', notes: 'Sin tecnicismos. Sin apuro.' },
      { name: 'Intento de seña', situation: 'Después de explicar proceso', script_text: '"Con lo que ya vimos, el próximo paso lógico sería avanzar con una seña para reservar la unidad. Puede ser monetaria o, si te resulta más cómodo, dejarla de palabra y coordinamos la firma."', notes: 'Avance → O. Sin avance → K.' },
    ],
    questions: [],
  },
  {
    name: 'N. Reunión Dudas + Proceso',
    description: 'Transformar interés en compromiso. Cerrar incertidumbre, BUSCANDO LA SEÑA.',
    objective: 'Explicar proceso paso a paso. Intento explícito de seña OBLIGATORIO.',
    estimated_duration: '30 minutos',
    color: '#D946EF',
    icon: 'Users',
    steps: [
      { title: 'Apertura y encuadre (2-3 min)', type: 'accion', content: '"La idea de esta reunión es ordenar todas las dudas y contarte cómo sigue el proceso si avanzamos."', is_required: true },
      { title: 'Cómo opera EDISUR (estructura fija)', type: 'accion', content: '1. Qué es la seña\n2. Cómo es el boleto\n3. Rol de legales\n4. Tiempos y firma\n5. Qué pasa después de firmar', is_required: true },
      { title: 'Intento de seña (OBLIGATORIO)', type: 'accion', content: '"Con lo que ya vimos y si esto te cierra, el próximo paso lógico sería avanzar con una seña. Idealmente monetaria, pero también podemos dejarla de palabra."', is_required: true },
      { title: 'Evaluar avance', type: 'verificacion', content: 'Avance → O. Sin avance → K.', is_required: true },
    ],
    scripts: [
      { name: 'Apertura reunión dudas', situation: 'Inicio reunión para resolver dudas', script_text: '"La idea de esta reunión es ordenar todas las dudas que tengas y contarte, paso a paso, cómo sigue el proceso si avanzamos. Prefiero que tengas todo claro antes de tomar cualquier decisión."', notes: null },
      { name: 'Intento de seña', situation: 'Después de explicar proceso EDISUR', script_text: '"Con lo que ya vimos y si esto te cierra, el próximo paso lógico sería avanzar con una seña para reservar la unidad. Idealmente monetaria, pero también podemos dejarla de palabra y coordinamos la firma."', notes: 'OBLIGATORIO intentar seña.' },
    ],
    questions: [],
  },
  {
    name: 'O. Seña + Compromiso',
    description: 'Formalizar el compromiso comercial y activar proceso interno.',
    objective: 'Registrar seña, acordar fecha de firma, pasar operación en sistema.',
    estimated_duration: '15-30 minutos',
    color: '#F43F5E',
    icon: 'FileText',
    steps: [
      { title: 'Registrar seña en Gestar', type: 'accion', content: 'Registrar seña (monetaria o de palabra).', is_required: true },
      { title: 'Acordar fecha de firma', type: 'accion', content: 'Día y hora concretos.', is_required: true },
      { title: 'Pasar operación en sistema', type: 'accion', content: 'Actualizar estado en Gestar.', is_required: true },
      { title: 'Confirmar al cliente', type: 'accion', content: '"Perfecto. Dejamos asentada la seña y avanzamos con la preparación del boleto. Te voy a pedir unos datos y coordinamos la firma para el [día]."', is_required: true },
      { title: 'Coordinar pago', type: 'accion', content: '¿Trae el pago? ¿Lo acompañamos al banco?', is_required: true },
      { title: 'Si ladrillo: coordinar entrega con post-venta', type: 'accion', content: 'Coordinar proceso de entrega con post-venta.', is_required: false },
    ],
    scripts: [
      { name: 'Confirmación de seña', situation: 'Al formalizar la seña', script_text: '"Perfecto. Entonces dejamos asentada la seña y avanzamos con la preparación del boleto. Te voy a pedir unos datos y coordinamos la firma para el [día]."', notes: null },
    ],
    questions: [],
  },
  {
    name: 'P. Datos para Boleto',
    description: 'Recolectar información para confección legal sin demoras.',
    objective: 'Obtener todos los datos en una sola instancia.',
    estimated_duration: '10-15 minutos',
    color: '#0EA5E9',
    icon: 'FileText',
    steps: [
      { title: 'Solicitar datos', type: 'accion', content: '"Para avanzar con el boleto necesito algunos datos básicos. Te los voy a pedir ahora así evitamos idas y vueltas."', is_required: true },
      { title: 'Nombre y apellido', type: 'verificacion', content: 'Dato obligatorio.', is_required: true },
      { title: 'DNI', type: 'verificacion', content: 'Dato obligatorio.', is_required: true },
      { title: 'Estado civil', type: 'verificacion', content: 'Dato obligatorio.', is_required: true },
      { title: 'CUIT/CUIL', type: 'verificacion', content: 'Dato obligatorio.', is_required: true },
      { title: 'Domicilio', type: 'verificacion', content: 'Dato obligatorio.', is_required: true },
      { title: 'Email', type: 'verificacion', content: 'Dato obligatorio.', is_required: true },
      { title: 'Modalidad de pago acordada', type: 'verificacion', content: 'Confirmar modalidad definida.', is_required: true },
    ],
    scripts: [
      { name: 'Solicitud de datos', situation: 'Recolectar datos para boleto', script_text: '"Para avanzar con el boleto necesito algunos datos básicos. Te los voy a pedir ahora así evitamos idas y vueltas."', notes: null },
    ],
    questions: [],
  },
  {
    name: 'Q. Confección del Boleto',
    description: 'Generar el documento contractual con los datos recibidos.',
    objective: 'Confeccionar boleto completo. Si falta info, volver a P.',
    estimated_duration: '1-2 días',
    color: '#6366F1',
    icon: 'FileText',
    steps: [
      { title: 'Confeccionar boleto', type: 'accion', content: 'Generar documento contractual.', is_required: true },
      { title: 'Verificar datos completos', type: 'verificacion', content: 'Completos → R (Legales). Incompletos → P.', is_required: true },
    ],
    scripts: [],
    questions: [],
  },
  {
    name: 'R. Derivación a Legales',
    description: 'Validación jurídica. Loop INTERNO, no comercial. El cliente NO vuelve a zona gris.',
    objective: 'Enviar boleto a Legales. Aprobar o corregir.',
    estimated_duration: '1-3 días',
    color: '#7C3AED',
    icon: 'Scale',
    steps: [
      { title: 'Enviar boleto a Legales', type: 'accion', content: 'Enviar para revisión formal y legal.', is_required: true },
      { title: 'Revisión legal', type: 'verificacion', content: 'Aprueba → S (Pre-firma). No aprueba → loop interno (Q o P).', is_required: true },
    ],
    scripts: [],
    questions: [],
  },
  {
    name: 'S. Pre-Firma',
    description: 'Preparar experiencia premium: cochera, cartel de bienvenida, sala.',
    objective: 'Coordinar fecha/hora, asignar cochera, preparar sala y cartel.',
    estimated_duration: '1-2 días antes de firma',
    color: '#DB2777',
    icon: 'Calendar',
    steps: [
      { title: 'Coordinar fecha y hora', type: 'accion', content: 'Definir fecha y hora con el cliente.', is_required: true },
      { title: 'Asignar cochera + WhatsApp', type: 'accion', content: 'Asignar cochera y comunicar al cliente.', is_required: true },
      { title: 'Preparar cartel de bienvenida', type: 'accion', content: 'Cartel personalizado.', is_required: true },
      { title: 'Preparar sala', type: 'accion', content: 'Sala lista y profesional.', is_required: true },
      { title: 'Agenda interna', type: 'accion', content: 'Coordinar participantes y orden.', is_required: true },
    ],
    scripts: [
      { name: 'WhatsApp pre-firma', situation: 'Confirmación al cliente', script_text: '"Te confirmo la reunión de firma para el [día] a las [hora]. Te asignamos la cochera [número]. Te esperamos."', notes: 'Experiencia premium y cuidada.' },
    ],
    questions: [],
  },
  {
    name: 'T. Reunión de Firma',
    description: 'Cerrar operación con experiencia premium y ordenada.',
    objective: 'Ejecutar firma con protocolo de experiencia premium.',
    estimated_duration: '30-60 minutos',
    color: '#16A34A',
    icon: 'PenTool',
    steps: [
      { title: 'Recepción con cartel de bienvenida', type: 'accion', content: 'Cartel personalizado.', is_required: true },
      { title: 'Café / agua', type: 'accion', content: 'Crear ambiente cómodo.', is_required: true },
      { title: 'Ingreso de abogados', type: 'accion', content: 'Incorporar equipo legal.', is_required: true },
      { title: 'Revisión final del boleto', type: 'accion', content: 'Revisión conjunta.', is_required: true },
      { title: 'Firma del boleto', type: 'accion', content: 'Firma formal.', is_required: true },
    ],
    scripts: [],
    questions: [],
  },
  {
    name: 'U. Finanzas: Pago y Cierre',
    description: 'Finalizar operación administrativa y financiera.',
    objective: 'Derivar a Finanzas, ejecutar pago, cerrar operación como Venta.',
    estimated_duration: '1-5 días',
    color: '#0D9488',
    icon: 'DollarSign',
    steps: [
      { title: 'Derivar a Finanzas', type: 'accion', content: 'Pasar operación a Finanzas.', is_required: true },
      { title: 'Ejecutar pago', type: 'accion', content: 'Procesar según modalidad acordada.', is_required: true },
      { title: 'Confirmación final', type: 'verificacion', content: 'Pago procesado correctamente.', is_required: true },
      { title: 'Cerrar como Venta', type: 'accion', content: 'Marcar como VENTA cerrada. Fin del proceso comercial.', is_required: true },
    ],
    scripts: [],
    questions: [],
  },
  {
    name: 'V. Agradecimiento + Referidos',
    description: 'Cristalizar la relación. Agradecer y pedir referidos.',
    objective: 'Agradecer la confianza y pedir referidos. Un proceso claro baja la ansiedad y aumenta la tasa de cierre.',
    estimated_duration: 'Mismo día o día siguiente al cierre',
    color: '#22C55E',
    icon: 'Heart',
    steps: [
      { title: 'WhatsApp de agradecimiento', type: 'accion', content: 'Mensaje agradeciendo confianza y pidiendo referidos.', is_required: true },
      { title: 'Pedir referidos', type: 'accion', content: 'Solicitar referidos de forma natural.', is_required: true },
    ],
    scripts: [
      { name: 'Agradecimiento + referidos', situation: 'Después del cierre exitoso', script_text: '"[Nombre], quería agradecerte la confianza. Fue un placer acompañarte en todo el proceso. Si conocés a alguien que esté evaluando una inversión o buscando su próximo hogar, no dudes en pasarle mi contacto. ¡Estamos para ayudar!"', notes: 'El seguimiento no es insistir. Es ayudar al cliente a decidir.' },
    ],
    questions: [],
  },
];

const OBJECTIONS = [
  {
    objection: '"Pasame precios" / "Mandame valores por WhatsApp"',
    category: 'precio',
    severity: 'alto',
    responses: [
      { text: 'El tema con pasar precios aislados es que sin contexto suelen generar más dudas que claridad. Prefiero que lo veamos bien y si no encaja, te lo voy a decir yo primero.', type: 'reencuadre', example: 'Reencuadrar a reunión. NUNCA enviar precio sin reunión.' },
      { text: 'Puedo compartirte un rango general de precios (de X a Y) y tasas de crecimiento, pero para que realmente te sirva necesitamos verlo en contexto.', type: 'concesion', example: 'Permitido RANGO, no precio exacto.' },
    ],
    signals_working: 'El cliente acepta reunión después del reencuadre',
    if_not_working: 'Mantener en zona gris con rango de precios.',
  },
  {
    objection: '"Ahora no puedo" / "No es el momento"',
    category: 'tiempo',
    severity: 'medio',
    responses: [
      { text: 'Perfecto, lo entiendo. Justamente para eso está la reunión, para ordenar todo. Si te parece, lo retomamos en unos días.', type: 'reencuadre', example: 'SIEMPRE agendar próximo contacto.' },
      { text: '¿Cuándo sería un mejor momento? Te agendo seguimiento.', type: 'pregunta', example: 'Buscar fecha concreta.' },
    ],
    signals_working: 'El cliente da fecha concreta',
    if_not_working: 'Descartar tras 2 ciclos si evita sistemáticamente.',
  },
  {
    objection: '"Estoy viendo opciones" / "Estoy comparando"',
    category: 'competencia',
    severity: 'medio',
    responses: [
      { text: 'Justamente, la reunión te va a servir para comparar con más criterio. En 30 minutos filtramos opciones reales.', type: 'reencuadre', example: 'Posicionar reunión como herramienta de comparación.' },
      { text: '¿Qué es lo que más te importa que se cumpla? Así vemos si tiene sentido avanzar.', type: 'pregunta', example: 'Buscar criterios para personalizar.' },
    ],
    signals_working: 'Comparte qué está viendo y acepta reunión',
    if_not_working: 'Enviar brochure de 1 solo proyecto relevante.',
  },
  {
    objection: '"Recién empiezo a evaluar" / "Estoy explorando"',
    category: 'tiempo',
    severity: 'bajo',
    responses: [
      { text: 'Perfecto, justamente el mejor momento para vernos es ahora, así arrancás con las ideas ordenadas.', type: 'reencuadre', example: 'Reunión como punto de partida inteligente.' },
      { text: '¿Qué te llevó a empezar a buscar ahora?', type: 'pregunta', example: 'Motivación real detrás de la exploración.' },
    ],
    signals_working: 'Explica motivación y acepta reunión',
    if_not_working: 'Seguimiento en 1-2 semanas.',
  },
  {
    objection: '"Lo pienso y te aviso" / "Lo veo y te aviso" / "Después vemos"',
    category: 'confianza',
    severity: 'alto',
    responses: [
      { text: '¿Qué aspectos específicos necesitás pensar? Así te doy más info sobre eso puntual.', type: 'pregunta', example: 'Buscar objeción REAL.' },
      { text: 'Para no dejar esto en el aire, ¿te parece si lo retomamos el [día]?', type: 'reencuadre', example: 'NUNCA aceptar "avisame". Siempre proponer fecha.' },
    ],
    signals_working: 'Acepta fecha concreta y dice qué necesita pensar',
    if_not_working: 'Activar zona gris K. Si no responde tras ciclo, descartar.',
  },
  {
    objection: '"Mandame un mensaje" / "Escribime después"',
    category: 'tiempo',
    severity: 'medio',
    responses: [
      { text: 'Dale, te escribo. Pero para aprovechar mejor, ¿te queda mejor mañana por la mañana o por la tarde?', type: 'reencuadre', example: 'Convertir vaguedad en compromiso concreto.' },
    ],
    signals_working: 'Da horario concreto',
    if_not_working: 'Ejecutar secuencia B1.',
  },
  {
    objection: 'Asesor quiere dar toda la info por teléfono',
    category: 'producto',
    severity: 'alto',
    responses: [
      { text: 'PROHIBIDO: "Te paso precios por WhatsApp", "Después vemos", "Te explico todo ahora", "Depende...". Todo debilita autoridad y mata conversión.', type: 'reencuadre', example: 'Auto-corrección. La llamada es para ORDENAR, no para informar.' },
    ],
    signals_working: 'El asesor mantiene control y vende la reunión',
    if_not_working: 'Revisar script. Se convirtió en asesoramiento gratuito.',
  },
];

async function main() {
  console.log('Creating EDISUR DEFINITIVO playbook...\n');

  // 1. Create the playbook
  const [playbook] = await api('playbooks', {
    organization_id: ORG_ID,
    name: 'EDISUR DEFINITIVO',
    description: 'Playbook Comercial EDISUR – Desarrollo por Etapa. High Ticket · Inbound · Desarrollador Inmobiliario. Proceso completo A-V con scripts, preguntas de calificación, reglas de materiales y objeciones.',
    type: 'por_producto',
    status: 'activo',
    created_by: USER_ID,
  });
  console.log(`✓ Playbook created: ${playbook.id}`);

  // 2. Create stages with steps, scripts, questions
  for (let i = 0; i < STAGES.length; i++) {
    const s = STAGES[i];
    const [stage] = await api('playbook_stages', {
      playbook_id: playbook.id,
      name: s.name,
      description: s.description,
      objective: s.objective,
      estimated_duration: s.estimated_duration,
      sort_order: i,
      color: s.color,
      icon: s.icon,
    });
    console.log(`  ✓ Stage ${i}: ${s.name}`);

    // Steps
    for (let j = 0; j < s.steps.length; j++) {
      const step = s.steps[j];
      await api('playbook_steps', {
        stage_id: stage.id,
        title: step.title,
        type: step.type,
        content: step.content,
        is_required: step.is_required,
        sort_order: j,
      });
    }
    if (s.steps.length) console.log(`    ✓ ${s.steps.length} steps`);

    // Scripts
    for (let j = 0; j < s.scripts.length; j++) {
      const sc = s.scripts[j];
      await api('playbook_scripts', {
        playbook_id: playbook.id,
        stage_id: stage.id,
        name: sc.name,
        situation: sc.situation,
        script_text: sc.script_text,
        notes: sc.notes,
        sort_order: j,
      });
    }
    if (s.scripts.length) console.log(`    ✓ ${s.scripts.length} scripts`);

    // Questions
    for (let j = 0; j < s.questions.length; j++) {
      const q = s.questions[j];
      await api('playbook_questions', {
        playbook_id: playbook.id,
        stage_id: stage.id,
        question: q.question,
        category: q.category,
        purpose: q.purpose,
        sort_order: j,
      });
    }
    if (s.questions.length) console.log(`    ✓ ${s.questions.length} questions`);
  }

  // 3. Create objections
  for (let i = 0; i < OBJECTIONS.length; i++) {
    const o = OBJECTIONS[i];
    await api('playbook_objections', {
      playbook_id: playbook.id,
      objection: o.objection,
      category: o.category,
      severity: o.severity,
      responses: o.responses,
      signals_working: o.signals_working,
      if_not_working: o.if_not_working,
      sort_order: i,
    });
  }
  console.log(`  ✓ ${OBJECTIONS.length} objections`);

  console.log(`\n✅ EDISUR DEFINITIVO created successfully!`);
  console.log(`   Playbook ID: ${playbook.id}`);
  console.log(`   Stages: ${STAGES.length}`);
  console.log(`   Total steps: ${STAGES.reduce((sum, s) => sum + s.steps.length, 0)}`);
  console.log(`   Total scripts: ${STAGES.reduce((sum, s) => sum + s.scripts.length, 0)}`);
  console.log(`   Total questions: ${STAGES.reduce((sum, s) => sum + s.questions.length, 0)}`);
  console.log(`   Objections: ${OBJECTIONS.length}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
