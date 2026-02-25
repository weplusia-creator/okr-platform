import type { StepType, QuestionCategory, ObjectionCategory, ObjectionSeverity } from '../types/playbook';

// ===== PLAYBOOK COMERCIAL EDISUR DEFINITIVO =====
// High Ticket · Inbound · Desarrollador Inmobiliario
// Desarrollo por Etapa – Proceso Completo A-V

export const EDISUR_DEFINITIVO_PLAYBOOK = {
  stages: [
    // ===== A. ENTRADA DEL LEAD + REGLA DE ASIGNACION =====
    {
      name: 'A. Entrada del Lead',
      description: 'Ingreso automático del lead desde Gestar (formulario web, campañas, portales, contacto directo) con información mínima.',
      objective: 'Tomar el lead inmediatamente. No existe selección ni preferencia: orden de llegada obligatorio. El asesor debe ser dueño del lead desde el minuto cero.',
      estimatedDuration: '< 15 min ideal / < 1 hora aceptable',
      color: '#3B82F6',
      icon: 'Inbox',
      steps: [
        { title: 'Abrir Gestar', type: 'accion' as StepType, content: 'Acceder al sistema CRM Gestar para ver los leads entrantes.', isRequired: true, sortOrder: 0 },
        { title: 'Tomar lead (asignarse como responsable)', type: 'accion' as StepType, content: 'El lead DEBE ser tomado inmediatamente. No se puede rechazar ni esperar. Esta etapa NO es opinable.', isRequired: true, sortOrder: 1 },
        { title: 'Ver fecha y hora de ingreso', type: 'verificacion' as StepType, content: 'Registrar cuándo ingresó el lead para medir tiempos de respuesta.', isRequired: true, sortOrder: 2 },
        { title: 'Leer producto consultado', type: 'accion' as StepType, content: 'Identificar como mínimo si es ladrillo o lote.', isRequired: true, sortOrder: 3 },
        { title: 'Chequear si es cliente previo de Edisur', type: 'verificacion' as StepType, content: 'Buscar en el sistema si el lead ya tiene historial con la empresa.', isRequired: true, sortOrder: 4 },
        { title: 'Buscar al lead en LinkedIn / RRSS', type: 'accion' as StepType, content: 'Capturar información de valor del lead antes del primer contacto.', isRequired: true, sortOrder: 5 },
        { title: 'Prepararse para llamar', type: 'accion' as StepType, content: 'Tener claro producto consultado y datos del lead antes de la llamada.', isRequired: true, sortOrder: 6 },
      ],
      scripts: [],
      questions: [],
    },

    // ===== B. PRIMER CONTACTO – LLAMADO TELEFONICO =====
    {
      name: 'B. Primer Contacto – Llamado',
      description: 'Contactar + calificar + vender la reunión presencial. NO es cerrar, pasar precios, explicar productos ni "sacar dudas". SÍ es tomar control, ordenar y llevar a reunión.',
      objective: 'En 5-7 minutos lograr: confirmar interés real, arquetipo (inversor/familia), etapa de búsqueda, horizonte (pozo/terminado), detectar fricción, instalar autoridad, vender reunión y cerrar fecha.',
      estimatedDuration: '5-7 minutos',
      color: '#8B5CF6',
      icon: 'Phone',
      steps: [
        { title: 'Apertura – Control + Contexto (20 seg)', type: 'accion' as StepType, content: '"Hola ___, ¿cómo estás? Te habla ___ de EDISUR. Te llamo por la consulta que hiciste sobre ___, ¿es correcto?" Si dice sí, continuar. Si duda, reconfirmar producto.', isRequired: true, sortOrder: 0 },
        { title: 'Micro-encuadre (instala autoridad)', type: 'accion' as StepType, content: '"Perfecto. Antes de avanzar, quiero entender bien qué estás buscando para no marearte con información que no te sirva." Esto instala: orden, profesionalismo y criterio.', isRequired: true, sortOrder: 1 },
        { title: 'Identificar arquetipo', type: 'pregunta' as StepType, content: '"¿Esto lo estás pensando más como inversión o para vivir?" Esperar respuesta. No interrumpir. Registrar: Familia o Inversor.', isRequired: true, sortOrder: 2 },
        { title: 'Etapa de búsqueda', type: 'pregunta' as StepType, content: '"¿Ya estás viendo opciones concretas o recién empezando a evaluar?" Clasifica: Exploratorio / Comparando / Decisión inminente.', isRequired: true, sortOrder: 3 },
        { title: 'Horizonte (pozo vs terminado)', type: 'pregunta' as StepType, content: '"¿Te interesa algo en pozo para capitalizar crecimiento o preferís algo ya terminado?" Esto define producto real.', isRequired: true, sortOrder: 4 },
        { title: 'Filtro de intensidad', type: 'pregunta' as StepType, content: '"Si encontrás algo que realmente encaje, ¿estarías en condiciones de avanzar ahora o lo estás mirando con más calma?" Ya sabés si es real o curioso.', isRequired: true, sortOrder: 5 },
        { title: 'Pregunta de foco (insight profundo)', type: 'pregunta' as StepType, content: '"¿Qué tendría que pasar para que digas \'esto tiene sentido\'?" Silencio. Dejar hablar. Ahí aparece: miedo, retorno esperado, zona deseada, precio implícito, objeción futura.', isRequired: true, sortOrder: 6 },
        { title: 'Verificar calificación completa', type: 'verificacion' as StepType, content: 'Al terminar, el asesor debe poder responder: 1) Arquetipo, 2) Etapa de búsqueda, 3) Horizonte (pozo/terminado), 4) Nivel de decisión, 5) Qué valora, 6) Si puede avanzar. Si no puede responder esas 6 cosas, NO está listo para vender reunión.', isRequired: true, sortOrder: 7 },
        { title: 'Vender la reunión', type: 'accion' as StepType, content: '"Justamente por todo lo que me contás, la mejor manera de asesorarte bien es vernos 30 minutos en la oficina. Porque por teléfono puedo darte datos sueltos, pero en persona filtramos opciones reales y te vas con claridad. Nos ahorramos tiempo los dos." (Pausa breve) "¿Te parece que lo hagamos así?"', isRequired: true, sortOrder: 8 },
        { title: 'Cerrar con fecha (OBLIGATORIO)', type: 'accion' as StepType, content: 'Si dice sí: "Perfecto. ¿Te queda mejor por la mañana o por la tarde? ¿Martes o miércoles?" Siempre alternativa cerrada. Nunca "Avisame". Ejemplo: "Tengo disponible el martes a las 17 o el jueves a las 11. ¿Cuál te queda mejor?"', isRequired: true, sortOrder: 9 },
        { title: 'Confirmación final', type: 'accion' as StepType, content: '"Perfecto, entonces nos vemos el ___ a las ___. Te mando ubicación y cualquier cosa me escribís por acá."', isRequired: true, sortOrder: 10 },
      ],
      scripts: [
        {
          name: 'Script Llamada Inbound Completo',
          situation: 'Primer contacto telefónico con lead inbound de Gestar',
          scriptText: '1. APERTURA (20 seg):\n"Hola ___, ¿cómo estás? Te habla ___ de EDISUR. Te llamo por la consulta que hiciste sobre ___, ¿es correcto?"\n\n2. MICRO-ENCUADRE:\n"Perfecto. Antes de avanzar, quiero entender bien qué estás buscando para no marearte con información que no te sirva."\n\n3. ARQUETIPO:\n"¿Esto lo estás pensando más como inversión o para vivir?"\n\n4. ETAPA:\n"¿Ya estás viendo opciones concretas o recién empezando a evaluar?"\n\n5. HORIZONTE:\n"¿Te interesa algo en pozo para capitalizar crecimiento o preferís algo ya terminado?"\n\n6. FILTRO:\n"Si encontrás algo que realmente encaje, ¿estarías en condiciones de avanzar ahora o lo estás mirando con más calma?"\n\n7. FOCO:\n"¿Qué tendría que pasar para que digas \'esto tiene sentido\'?"\n(Silencio. Dejar hablar.)\n\n8. VENTA DE REUNION:\n"Justamente por todo lo que me contás, la mejor manera de asesorarte bien es vernos 30 minutos en la oficina. Porque por teléfono puedo darte datos sueltos, pero en persona filtramos opciones reales y te vas con claridad. Nos ahorramos tiempo los dos."\n(Pausa)\n"¿Te parece que lo hagamos así?"\n\n9. CIERRE CON FECHA:\n"Tengo disponible el martes a las 17 o el jueves a las 11. ¿Cuál te queda mejor?"\n\n10. CONFIRMACION:\n"Perfecto, entonces nos vemos el ___ a las ___. Te mando ubicación y cualquier cosa me escribís por acá."',
          notes: 'Principio psicológico: La llamada NO es para informar. Es para ORDENAR. La reunión se vende como "la manera más eficiente de tomar una buena decisión".\n\nSi responde "no sé / estoy viendo / pasame precio":\n"Entiendo. El tema con pasar precios aislados es que sin contexto suelen generar más dudas que claridad, tenemos mucha diversidad de productos y disparidad de precios. Prefiero que lo veamos bien y si no encaja, te lo voy a decir yo primero." Y volver a ofrecer día concreto.',
          sortOrder: 0,
        },
      ],
      questions: [
        { category: 'necesidad' as QuestionCategory, question: '¿Esto lo estás pensando más como inversión o para vivir?', purpose: 'Identificar arquetipo: Familia vs Inversor', sortOrder: 0 },
        { category: 'timeline' as QuestionCategory, question: '¿Ya estás viendo opciones concretas o recién empezando a evaluar?', purpose: 'Clasificar etapa: Exploratorio / Comparando / Decisión inminente', sortOrder: 1 },
        { category: 'necesidad' as QuestionCategory, question: '¿Te interesa algo en pozo para capitalizar crecimiento o preferís algo ya terminado?', purpose: 'Definir horizonte temporal y producto real', sortOrder: 2 },
        { category: 'decision' as QuestionCategory, question: 'Si encontrás algo que realmente encaje, ¿estarías en condiciones de avanzar ahora o lo estás mirando con más calma?', purpose: 'Detectar urgencia sin preguntar "urgencia". Saber si es real o curioso.', sortOrder: 3 },
        { category: 'vision' as QuestionCategory, question: '¿Qué tendría que pasar para que digas "esto tiene sentido"?', purpose: 'Abrir insight profundo. Aparece: miedo, retorno esperado, zona deseada, precio implícito, objeción futura.', sortOrder: 4 },
      ],
    },

    // ===== B1. SECUENCIA "NO CONTACTO" =====
    {
      name: 'B1. Secuencia No Contacto',
      description: 'Protocolo cerrado cuando el lead NO atiende. No se improvisa, no se "siente", no se decide caso por caso. Se ejecuta un protocolo.',
      objective: 'Ejecutar secuencia obligatoria de contacto: 2 llamados + 2 WhatsApp. Si no responde, descartar formalmente a Campañas.',
      estimatedDuration: '2-3 días',
      color: '#6366F1',
      icon: 'PhoneOff',
      steps: [
        { title: 'Intento #1 – Llamado telefónico', type: 'accion' as StepType, content: 'Llamar al lead. Si no atiende, NO insistir en el momento. Pasar al WhatsApp de bienvenida.', isRequired: true, sortOrder: 0 },
        { title: 'WhatsApp #1 – Bienvenida (5-10 min post llamado)', type: 'accion' as StepType, content: 'Enviar dentro de los 5-10 minutos posteriores al llamado fallido. Objetivo: generar reconocimiento, humanizar el contacto, habilitar respuesta.', isRequired: true, sortOrder: 1 },
        { title: 'Intento #2 – Llamado día siguiente', type: 'accion' as StepType, content: 'Llamar al día siguiente, misma franja horaria o mejor. Si atiende → Etapa C. Si no atiende → WhatsApp #2.', isRequired: true, sortOrder: 2 },
        { title: 'WhatsApp #2 – Cierre de secuencia (dentro de 60 min)', type: 'accion' as StepType, content: 'SIEMPRE enviar último WhatsApp de cierre. NUNCA descartar sin aviso. Enviar dentro de los 60 minutos al segundo intento de llamado.', isRequired: true, sortOrder: 3 },
        { title: 'Descarte formal', type: 'accion' as StepType, content: 'Si no responde tras WhatsApp #2: Mover a Oportunidades Cerradas. Cargar motivo de cierre: "No contacto". Queda automáticamente disponible para Campañas.', isRequired: true, sortOrder: 4 },
      ],
      scripts: [
        {
          name: 'WhatsApp #1 – Bienvenida',
          situation: 'Lead no atendió el primer llamado. Enviar dentro de 5-10 minutos.',
          scriptText: 'Hola ___, soy ___ de EDISUR.\nTe llamé recién por la consulta que hiciste sobre ___.\n\nPara asesorarte bien necesito entender un poco qué estás buscando y así evitar enviarte información que no te sirva.\n\n¿Te queda mejor que lo veamos con un llamado corto hoy por la tarde o mañana por la mañana?',
          notes: 'Objetivo: generar reconocimiento, humanizar el contacto, habilitar respuesta.',
          sortOrder: 0,
        },
        {
          name: 'WhatsApp #2 – Cierre de secuencia',
          situation: 'Lead no atendió segundo llamado. Enviar dentro de 60 minutos.',
          scriptText: 'Hola ___, vuelvo a escribirte por la consulta que hiciste en EDISUR sobre ___.\n\nIntenté comunicarme un par de veces para orientarte bien, pero quizás no sea el momento.\n\nSi querés que lo veamos ahora, coordinamos un llamado breve y lo ordenamos. ¿Preferís xxx a las xxx o yyy a las yyy?\nSi no, lo dejamos en pausa y cuando retomes la búsqueda me escribís sin problema.',
          notes: 'Siempre ofrecer alternativa cerrada de horarios. NUNCA descartar sin este mensaje.',
          sortOrder: 1,
        },
      ],
      questions: [],
    },

    // ===== C. CALIFICACION + COORDINACION DE REUNION =====
    {
      name: 'C. Calificación + Reunión',
      description: 'Lead atiende. Determinar si califica y cerrar el próximo paso. El próximo paso SIEMPRE es reunión.',
      objective: 'En una sola llamada: confirmar motivo, identificar arquetipo, identificar horizonte temporal, ver si califica, vender reunión. No más.',
      estimatedDuration: '5-10 minutos',
      color: '#10B981',
      icon: 'ClipboardCheck',
      steps: [
        { title: 'Confirmación de consulta', type: 'accion' as StepType, content: '"Buenísimo, te llamo por la consulta que hiciste sobre ___. Contame un poco qué te motivó a escribirnos."', isRequired: true, sortOrder: 0 },
        { title: 'Identificar arquetipo (NO negociable)', type: 'pregunta' as StepType, content: '"¿Esto lo estás pensando más como inversión o para vivir?" Pregunta clave. No se negocia.', isRequired: true, sortOrder: 1 },
        { title: 'Validar estado de búsqueda', type: 'pregunta' as StepType, content: '"¿Ya estás viendo opciones concretas o recién empezando a evaluar?"', isRequired: true, sortOrder: 2 },
        { title: 'Decisión: ¿Califica?', type: 'verificacion' as StepType, content: 'NO califica si busca: alquiler, fuera de target, productos que no desarrollamos (casa/local comercial). SI califica → vender reunión. IMPORTANTE: Si es inversor y busca producto que no tenemos, SI O SI llevarlo a reunión y presentarle otros vehículos que cumplan con su tesis de inversión/rentabilidad esperada.', isRequired: true, sortOrder: 3 },
        { title: 'Vender la reunión (no sugerir, VENDER)', type: 'accion' as StepType, content: '"Para no marearte con información por teléfono, lo que hacemos es una reunión corta en la oficina donde filtramos opciones y te vas con claridad real. Es la mejor forma de avanzar bien. ¿Te parece que lo veamos así?"', isRequired: true, sortOrder: 4 },
      ],
      scripts: [
        {
          name: 'Script de salida elegante (NO califica)',
          situation: 'El lead no califica – busca alquiler u otro producto que no desarrollamos',
          scriptText: '"Perfecto, te agradezco la claridad. En este caso nosotros trabajamos con venta, así que no te quiero hacer perder tiempo. Si más adelante volvés a evaluar compra, encantados de ayudarte."',
          notes: 'Descartar + cargar motivo. Elegible para campañas si aplica.',
          sortOrder: 0,
        },
        {
          name: 'Venta explícita de reunión',
          situation: 'Lead califica y hay que vender el próximo paso',
          scriptText: '"Para no marearte con información por teléfono, lo que hacemos es una reunión corta en la oficina donde filtramos opciones y te vas con claridad real. Es la mejor forma de avanzar bien. ¿Te parece que lo veamos así?"',
          notes: 'Sí acepta → Etapa D (Pre-reunión). No acepta / pone objeción → Etapa E (Zona gris telefónica).',
          sortOrder: 1,
        },
      ],
      questions: [
        { category: 'necesidad' as QuestionCategory, question: '¿Qué te motivó a escribirnos?', purpose: 'Confirmar motivo de interés real', sortOrder: 0 },
        { category: 'necesidad' as QuestionCategory, question: '¿Esto lo estás pensando más como inversión o para vivir?', purpose: 'Identificar arquetipo. Pregunta NO negociable.', sortOrder: 1 },
        { category: 'timeline' as QuestionCategory, question: '¿Ya estás viendo opciones concretas o recién empezando a evaluar?', purpose: 'Validar estado de búsqueda', sortOrder: 2 },
      ],
    },

    // ===== E. ZONA GRIS TELEFONICA =====
    {
      name: 'E. Zona Gris Telefónica',
      description: 'Etapa MÁS PELIGROSA del funnel. Atienden, califican, pero no avanzan. Un solo objetivo: llevar a reunión. Un solo ciclo: 7 días. Un solo criterio: interés activo o descarte.',
      objective: 'Llevar a reunión en máximo 2 ciclos de 7 días. Reencuadrar toda objeción hacia la reunión. Nunca enviar precio sin reunión.',
      estimatedDuration: '7-14 días máximo (1-2 ciclos)',
      color: '#F59E0B',
      icon: 'AlertTriangle',
      steps: [
        { title: 'Clasificar el "pero"', type: 'verificacion' as StepType, content: 'Antes de actuar, clasificar mentalmente:\n- Tiempo: "Ahora no puedo"\n- Etapa: "Recién arranco"\n- Comparación: "Estoy viendo opciones"\n- Precio: "Pasame valores"', isRequired: true, sortOrder: 0 },
        { title: 'Aplicar script de encuadre', type: 'accion' as StepType, content: '"Perfecto, lo entiendo. Justamente para eso está la reunión, para ordenar todo y que no pierdas tiempo comparando sin contexto. Si te parece, lo retomamos en unos días y lo vemos bien." SIEMPRE agendar próximo contacto.', isRequired: true, sortOrder: 1 },
        { title: 'Regla de materiales – Brochure', type: 'tip' as StepType, content: 'PERMITIDO enviar brochure de MÁXIMO 1 desarrollo. PROHIBIDO mandar catálogos múltiples.', isRequired: true, sortOrder: 2 },
        { title: 'Regla de materiales – Precio', type: 'tip' as StepType, content: 'PROHIBIDO enviar precio sin reunión. PERMITIDO compartir RANGO de precios (de X a Y) y tasas de crecimiento de precios. Sin excepción.', isRequired: true, sortOrder: 3 },
        { title: 'Regla de materiales – Planimetría', type: 'tip' as StepType, content: 'USO CONTROLADO. Permitido SOLO para mostrar ubicación general. NO disponibilidad exacta. Motivo: competidores, inmobiliarios, mystery shoppers, información estratégica sensible.', isRequired: true, sortOrder: 4 },
        { title: 'Evaluar interés activo', type: 'verificacion' as StepType, content: 'HAY interés activo si: responde mensajes, hace preguntas, acepta volver a hablar, no corta comunicación.\nNO hay interés activo si: no responde, evita sistemáticamente, posterga sin fecha.\nMáximo 2 ciclos de 7 días. Si no hay interés → descartar + motivo.', isRequired: true, sortOrder: 5 },
      ],
      scripts: [
        {
          name: 'Encuadre zona gris',
          situation: 'Lead califica pero pone objeción para no avanzar a reunión',
          scriptText: '"Perfecto, lo entiendo. Justamente para eso está la reunión, para ordenar todo y que no pierdas tiempo comparando sin contexto. Si te parece, lo retomamos en unos días y lo vemos bien."',
          notes: 'SIEMPRE agendar un próximo contacto. Si pide precio: "Entiendo. El tema con pasar precios aislados es que sin contexto suelen generar más dudas que claridad, tenemos mucha diversidad de productos y disparidad de precios. Prefiero que lo veamos bien y si no encaja, te lo voy a decir yo primero."',
          sortOrder: 0,
        },
      ],
      questions: [],
    },

    // ===== D. PRE-REUNION (PREPARACION) =====
    {
      name: 'D. Pre-Reunión (Preparación)',
      description: 'Llegar a la reunión con control, no a improvisar. No es investigar para vender: es investigar para hacer mejores preguntas.',
      objective: 'Prepararse con hipótesis, no con respuestas. Tener toda la información disponible antes de salir a buscar al cliente.',
      estimatedDuration: '15-30 minutos antes de la reunión',
      color: '#06B6D4',
      icon: 'Briefcase',
      steps: [
        { title: 'Revisar notas del llamado', type: 'accion' as StepType, content: 'Releer toda la información registrada del lead en las etapas anteriores.', isRequired: true, sortOrder: 0 },
        { title: 'Identificar arquetipo preliminar', type: 'verificacion' as StepType, content: 'Confirmar: Inversor o Familia. Tener claro el producto consultado y horizonte temporal (pozo/terminado).', isRequired: true, sortOrder: 1 },
        { title: 'Llegar con hipótesis, no con respuesta', type: 'tip' as StepType, content: 'La preparación es para hacer mejores preguntas, no para tener todas las respuestas.', isRequired: true, sortOrder: 2 },
        { title: 'Checklist obligatorio pre-reunión', type: 'verificacion' as StepType, content: 'Antes de salir a buscar al cliente en recepción:\n1. Nombre completo\n2. Producto por el que consultó\n3. Arquetipo preliminar\n4. Estado de búsqueda (recién arranca / comparando)\n5. Qué espera resolver en la reunión\n6. Qué NO se va a mostrar (disciplina)\n7. Tener listas las preguntas de calificación según arquetipo\n\nSi no puede responder esto, NO empieza la reunión.', isRequired: true, sortOrder: 3 },
      ],
      scripts: [],
      questions: [],
    },

    // ===== F. REUNION PRESENCIAL – ESTRUCTURA BASE =====
    {
      name: 'F. Reunión Presencial – Base',
      description: 'Columna vertebral del playbook. Todo lo que sigue (lote o ladrillo) se apoya acá. Entender qué necesita de verdad, filtrar opciones, salir con próximo paso concreto.',
      objective: '1) Entender qué necesita de verdad. 2) Filtrar opciones. 3) Salir con próximo paso concreto y agendado. NO es cerrar. NO es mostrar todo.',
      estimatedDuration: '30-45 minutos',
      color: '#EC4899',
      icon: 'Users',
      steps: [
        { title: 'Apertura – instalar autoridad y tranquilidad', type: 'accion' as StepType, content: '"Gracias por venir. La idea de esta reunión es entender bien qué estás buscando y ver si tiene sentido avanzar con alguna opción concreta. Si vemos que no, también te lo voy a decir con total honestidad." → Autoridad + tranquilidad + encuadre.', isRequired: true, sortOrder: 0 },
        { title: 'Confirmar arquetipo (OBLIGATORIO)', type: 'pregunta' as StepType, content: '"Para ordenar bien la charla, ¿esto lo estás pensando más como inversión o para vivir?" Registrar en CRM: Inversor / Familia.', isRequired: true, sortOrder: 1 },
        { title: 'Confirmar producto (OBLIGATORIO)', type: 'pregunta' as StepType, content: '"Y dentro de eso, ¿te estás inclinando más por lote o por un departamento/casa ya construida?" Registrar: Lote / Ladrillo.', isRequired: true, sortOrder: 2 },
        { title: 'Confirmar horizonte temporal (OBLIGATORIO)', type: 'pregunta' as StepType, content: 'Registrar: Pozo / Terminado.', isRequired: true, sortOrder: 3 },
        { title: 'Confirmar presupuesto disponible (OBLIGATORIO)', type: 'pregunta' as StepType, content: 'Registrar: Rango aproximado.', isRequired: true, sortOrder: 4 },
        { title: 'Perfilado del cliente (OBLIGATORIO)', type: 'pregunta' as StepType, content: '"¿A qué te dedicás? ¿Desde cuándo?" Registrar: actividad y antigüedad.', isRequired: true, sortOrder: 5 },
        { title: 'Indagación SPIN suave', type: 'accion' as StepType, content: '"Contame un poco qué te llevó a empezar a buscar ahora."\n"¿Qué cosas son las que hoy más te importan que se cumplan?"\n"¿Qué ya viste o comparaste hasta ahora?"', isRequired: true, sortOrder: 6 },
        { title: 'Regla de oro de la reunión', type: 'tip' as StepType, content: 'Mientras más clara sea la indagación, menos material se muestra.', isRequired: true, sortOrder: 7 },
        { title: 'Decisión: ¿LOTE o LADRILLO?', type: 'verificacion' as StepType, content: 'LOTE → pasar a etapa G. LADRILLO → pasar a etapa H.', isRequired: true, sortOrder: 8 },
      ],
      scripts: [
        {
          name: 'Apertura de reunión',
          situation: 'Inicio de reunión presencial con cliente',
          scriptText: '"Gracias por venir. La idea de esta reunión es entender bien qué estás buscando y ver si tiene sentido avanzar con alguna opción concreta. Si vemos que no, también te lo voy a decir con total honestidad."',
          notes: 'Instala: Autoridad + tranquilidad + encuadre. El cliente siente que no le van a "vender", sino que lo van a asesorar.',
          sortOrder: 0,
        },
      ],
      questions: [
        { category: 'necesidad' as QuestionCategory, question: '¿Esto lo estás pensando más como inversión o para vivir?', purpose: 'Confirmar arquetipo. OBLIGATORIO en reunión.', sortOrder: 0 },
        { category: 'necesidad' as QuestionCategory, question: '¿Te estás inclinando más por lote o por un departamento/casa ya construida?', purpose: 'Confirmar producto: Lote vs Ladrillo.', sortOrder: 1 },
        { category: 'presupuesto' as QuestionCategory, question: '¿Cuál es tu rango de presupuesto disponible?', purpose: 'Confirmar presupuesto para filtrar opciones.', sortOrder: 2 },
        { category: 'dolor' as QuestionCategory, question: '¿Qué te llevó a empezar a buscar ahora?', purpose: 'Entender motivación real y timing.', sortOrder: 3 },
        { category: 'vision' as QuestionCategory, question: '¿Qué cosas son las que hoy más te importan que se cumplan?', purpose: 'Identificar criterios de decisión clave.', sortOrder: 4 },
        { category: 'competencia' as QuestionCategory, question: '¿Qué ya viste o comparaste hasta ahora?', purpose: 'Entender marco de referencia y competencia.', sortOrder: 5 },
        { category: 'necesidad' as QuestionCategory, question: '¿A qué te dedicás? ¿Desde cuándo?', purpose: 'Perfilado del cliente: actividad y antigüedad.', sortOrder: 6 },
      ],
    },

    // ===== G. REUNION LOTE =====
    {
      name: 'G. Reunión Lote',
      description: 'Filtrar zonas, opciones, características y rango de precio. Definir un próximo paso concreto. No cerrar por cerrar, cerrar el AVANCE.',
      objective: 'Filtrar zonas, opciones y características (lotes contiguos, orientación, esquina, frente espacio verde). Filtrar rango de precio. Definir próximo paso concreto.',
      estimatedDuration: '30-45 minutos',
      color: '#14B8A6',
      icon: 'MapPin',
      steps: [
        { title: 'Herramientas permitidas', type: 'tip' as StepType, content: 'PERMITIDO: Gestar (mapa + disponibilidad general), Google Maps.\nPROHIBIDO: Brochures, listados masivos, precios sin contexto posterior.', isRequired: true, sortOrder: 0 },
        { title: 'Trabajo con mapa', type: 'accion' as StepType, content: '"Primero veamos ubicación y contexto, después afinamos opciones." Navegar Gestar + Maps con el cliente.', isRequired: true, sortOrder: 1 },
        { title: 'Indagación específica – Uso previsto', type: 'pregunta' as StepType, content: '"¿Esto lo pensás más como resguardo de valor o con idea de construir?"', isRequired: true, sortOrder: 2 },
        { title: 'Indagación específica – Horizonte', type: 'pregunta' as StepType, content: '"¿Qué horizonte de tiempo tenés?"', isRequired: true, sortOrder: 3 },
        { title: 'Indagación específica – Condiciones', type: 'pregunta' as StepType, content: '"¿Hay algo que sí o sí tenga que cumplir el lote?"', isRequired: true, sortOrder: 4 },
        { title: 'Registrar en CRM', type: 'accion' as StepType, content: 'Registrar: Zona preferida, Uso previsto, Horizonte, Condiciones no negociables.', isRequired: true, sortOrder: 5 },
        { title: 'Cierre de reunión – OBLIGATORIO', type: 'accion' as StepType, content: '"Perfecto. Para no dejar esto en el aire, el próximo paso lógico es que te prepare 1 o 2 opciones que realmente encajen con lo que hablamos. ¿Te parece si lo vemos juntos el ___ a las ___?" Nunca terminar en "lo veo y te aviso".', isRequired: true, sortOrder: 6 },
      ],
      scripts: [
        {
          name: 'Cierre reunión lote',
          situation: 'Finalización de reunión presencial sobre lotes',
          scriptText: '"Perfecto. Para no dejar esto en el aire, el próximo paso lógico es que te prepare 1 o 2 opciones que realmente encajen con lo que hablamos. ¿Te parece si lo vemos juntos el ___ a las ___?"',
          notes: 'NUNCA terminar en "lo veo y te aviso". Sí queda próximo paso → Etapa I. No queda → Etapa K (Zona gris post-reunión).\n\nUna reunión sin próximo paso no es una reunión: es solo una charla.',
          sortOrder: 0,
        },
      ],
      questions: [
        { category: 'necesidad' as QuestionCategory, question: '¿Esto lo pensás más como resguardo de valor o con idea de construir?', purpose: 'Definir uso previsto del lote.', sortOrder: 0 },
        { category: 'timeline' as QuestionCategory, question: '¿Qué horizonte de tiempo tenés?', purpose: 'Entender plazo de inversión/construcción.', sortOrder: 1 },
        { category: 'decision' as QuestionCategory, question: '¿Hay algo que sí o sí tenga que cumplir el lote?', purpose: 'Identificar condiciones no negociables (ubicación, tamaño, orientación, etc.).', sortOrder: 2 },
      ],
    },

    // ===== H. REUNION LADRILLO =====
    {
      name: 'H. Reunión Ladrillo',
      description: 'Ordenar necesidad real, evitar dispersión, definir visita o siguiente paso claro. MÁXIMO 2 opciones: si no entran en 2, falta indagación.',
      objective: 'Ordenar necesidad real, evitar dispersión. Regla EDISUR: MÁXIMO 2 opciones. Si no entran en 2, falta indagación.',
      estimatedDuration: '30-45 minutos',
      color: '#F97316',
      icon: 'Building',
      steps: [
        { title: 'Regla de oro: Máximo 2 opciones', type: 'tip' as StepType, content: 'REGLA EDISUR: Máximo 2 opciones. Si no entran en 2, falta indagación. El riesgo principal es mostrar demasiados proyectos, precios y opciones → confunde al cliente y frena la decisión.', isRequired: true, sortOrder: 0 },
        { title: 'Indagación profunda antes de mostrar', type: 'accion' as StepType, content: '"Antes de mostrarte opciones, quiero entender bien esto."\n"¿Es para vivir o invertir?"\n"¿Qué te haría decir \'este sí\'?"\n"¿Qué descartás de plano?"', isRequired: true, sortOrder: 1 },
        { title: 'Registrar criterios', type: 'accion' as StepType, content: 'Registrar: Tipología, Características, Uso, Presupuesto estimado, Urgencia, Criterios de descarte.', isRequired: true, sortOrder: 2 },
        { title: 'Uso controlado de materiales', type: 'tip' as StepType, content: 'PERMITIDO: Brochure del proyecto puntual, Planos solo si suman claridad.\nPROHIBIDO: Mostrar "todo lo disponible", comparar precios sin encuadre/justificación.', isRequired: true, sortOrder: 3 },
        { title: 'Decisión: ¿Se agenda/realiza visita?', type: 'verificacion' as StepType, content: 'SÍ → Pasar a H1 (Visita a propiedad). NO → Pasar a I (Post-reunión).', isRequired: true, sortOrder: 4 },
      ],
      scripts: [],
      questions: [
        { category: 'necesidad' as QuestionCategory, question: '¿Es para vivir o invertir?', purpose: 'Confirmar uso real del inmueble.', sortOrder: 0 },
        { category: 'vision' as QuestionCategory, question: '¿Qué te haría decir "este sí"?', purpose: 'Identificar criterios positivos de decisión.', sortOrder: 1 },
        { category: 'decision' as QuestionCategory, question: '¿Qué descartás de plano?', purpose: 'Identificar criterios de descarte y filtrar rápido.', sortOrder: 2 },
      ],
    },

    // ===== H1. VISITA A PROPIEDAD (LADRILLO) =====
    {
      name: 'H1. Visita a Propiedad',
      description: 'Validar decisión, no generar más dudas. Revisar tips de visita del producto (horarios, orden de visita, a quién buscar en cada proyecto).',
      objective: 'Validar decisión del cliente, no generar más dudas. Confirmar sensaciones y definir próximo paso.',
      estimatedDuration: '30-60 minutos',
      color: '#FB923C',
      icon: 'Eye',
      steps: [
        { title: 'Encuadre previo a la visita', type: 'accion' as StepType, content: '"La visita es para confirmar sensaciones, no para sumar confusión. Después de verla, definimos cómo seguimos."', isRequired: true, sortOrder: 0 },
        { title: 'Revisar tips de visita del producto', type: 'accion' as StepType, content: 'Cada producto tiene sus tips de visita: horarios ideales, orden de visita de los proyectos, a quién buscar dentro de cada proyecto.', isRequired: true, sortOrder: 1 },
        { title: 'Realizar la visita', type: 'accion' as StepType, content: 'Acompañar al cliente. Observar reacciones. No sobre-vender durante la visita.', isRequired: true, sortOrder: 2 },
        { title: 'Post-visita inmediata (OBLIGATORIO)', type: 'pregunta' as StepType, content: '"¿Esto se acerca a lo que estabas buscando o lo descartamos?" Registrar: Reacción, Objeciones reales, Interés.', isRequired: true, sortOrder: 3 },
      ],
      scripts: [
        {
          name: 'Encuadre pre-visita',
          situation: 'Antes de salir a visitar la propiedad',
          scriptText: '"La visita es para confirmar sensaciones, no para sumar confusión. Después de verla, definimos cómo seguimos."',
          notes: 'La visita debe validar la decisión, no generar más dudas.',
          sortOrder: 0,
        },
        {
          name: 'Post-visita',
          situation: 'Inmediatamente después de la visita a propiedad',
          scriptText: '"¿Esto se acerca a lo que estabas buscando o lo descartamos?"',
          notes: 'Registrar: Reacción, Objeciones reales, Interés. Luego avanza a etapa I (Post-reunión).',
          sortOrder: 1,
        },
      ],
      questions: [],
    },

    // ===== I. POST-REUNION =====
    {
      name: 'I. Post-Reunión',
      description: 'Cerrar la reunión con dirección. Evitar que la conversación se enfríe. Regla madre: toda reunión termina con mensaje post-reunión enviado el mismo día.',
      objective: 'Enviar WhatsApp post-reunión dentro de las 2 horas. Definir próximo paso explícito. Buscar reunión/meet/llamado de cierre para presentar mejores opciones.',
      estimatedDuration: 'Dentro de 2 horas post-reunión',
      color: '#A855F7',
      icon: 'MessageSquare',
      steps: [
        { title: 'WhatsApp post-reunión (DENTRO de 2 horas)', type: 'accion' as StepType, content: 'Audio o escrito, preferiblemente audio. Personalizado, corto, con dirección. NUNCA enviar: listados masivos, toda la disponibilidad con precios, información nueva no hablada en la reunión.', isRequired: true, sortOrder: 0 },
        { title: 'Definir próximo paso explícito', type: 'accion' as StepType, content: 'Objetivo: reunión/meet/llamado de cierre para presentar la mejor opción acorde a criterios de búsqueda relevados.', isRequired: true, sortOrder: 1 },
        { title: 'Registrar en CRM', type: 'accion' as StepType, content: 'Actualizar estado del lead con toda la información obtenida en la reunión.', isRequired: true, sortOrder: 2 },
      ],
      scripts: [
        {
          name: 'WhatsApp post-reunión (BASE)',
          situation: 'Dentro de las 2 horas posteriores a la reunión presencial',
          scriptText: '"Gracias por venir hoy, [Nombre]. Me quedó claro que estás buscando [resumen breve y personalizado]. Para avanzar con orden, el próximo paso es [llamado / reunión / visita]. ¿Te parece si lo vemos el [día] a las [hora]?"',
          notes: 'Personalizado, corto, con dirección. Objetivo: presentar la mejor opción acorde a criterios de búsqueda. Sí queda próximo paso → Etapa J. No queda → Etapa K.',
          sortOrder: 0,
        },
      ],
      questions: [],
    },

    // ===== K. ZONA GRIS POST-REUNION =====
    {
      name: 'K. Zona Gris Post-Reunión',
      description: 'BLOQUE CRÍTICO. El lead ya conoce EDISUR, tuvo reunión/visita, pero no avanzó. Acá se pierden más operaciones que en cualquier otra etapa.',
      objective: 'Reactivar sin presionar. Volver a poner foco y forzar definición. Ciclo estándar de 15 días con contactos programados.',
      estimatedDuration: '15 días',
      color: '#EF4444',
      icon: 'Clock',
      steps: [
        { title: 'Día 0 – WhatsApp post-reunión', type: 'accion' as StepType, content: 'Enviar WhatsApp post-reunión (etapa I). Ya debe estar hecho.', isRequired: true, sortOrder: 0 },
        { title: 'Día 3 – Contacto de reactivación (WhatsApp)', type: 'accion' as StepType, content: 'WhatsApp corto de reactivación. No bombardear información.', isRequired: true, sortOrder: 1 },
        { title: 'Día 7 – Contacto de definición (Llamado)', type: 'accion' as StepType, content: 'Llamado telefónico para definir: avanzamos o pausamos.', isRequired: true, sortOrder: 2 },
        { title: 'Día 15 – Contacto "buscar que hable" (Llamado)', type: 'accion' as StepType, content: 'Llamado/escrito para entender el silencio. Darle la oportunidad de que hable. Encontrar la objeción REAL.', isRequired: true, sortOrder: 3 },
        { title: 'Evaluar reactivación', type: 'verificacion' as StepType, content: '¿Se logra reactivar y agendar? SÍ → Etapa J. NO → evaluar descarte.\n\nSe DESCARTA si: no responde 3 intentos + 1 llamado, no muestra intención concreta, evita definir. Se registra motivo y pasa a Campañas.\n\nSe mantiene activo si: responde, pide tiempo concreto, acepta contacto.', isRequired: true, sortOrder: 4 },
      ],
      scripts: [
        {
          name: 'Día 3 – Reactivación',
          situation: '3 días después de la reunión sin respuesta',
          scriptText: '"Hola [Nombre], te escribo para retomar lo que vimos el otro día. ¿Pudiste revisar las opciones que charlamos o preferís que lo veamos juntos 10 minutos?"',
          notes: 'WhatsApp corto. No bombardear información.',
          sortOrder: 0,
        },
        {
          name: 'Día 7 – Definición',
          situation: '7 días después de la reunión, sin avance',
          scriptText: '"Te llamo para ver si seguimos avanzando o si preferís dejarlo en pausa por ahora. Prefiero ser prolijo y respetar tu tiempo."',
          notes: 'Llamado telefónico. Buscar definición clara.',
          sortOrder: 1,
        },
        {
          name: 'Día 15 – Buscar que hable',
          situation: '15 días después de la reunión, silencio prolongado',
          scriptText: '"Te llamo/escribo para entender tu silencio... ¿qué pasó?"',
          notes: 'Darle la oportunidad de que hable. Encontrar la objeción REAL. Este es el último intento antes del descarte.',
          sortOrder: 2,
        },
      ],
      questions: [],
    },

    // ===== J. SEGUIMIENTO (SISTEMA ORDENADO) =====
    {
      name: 'J. Seguimiento Ordenado',
      description: 'Acompañar leads vivos, no perseguirlos. Dos universos: seguimiento activo (leads con interés) y campañas (leads cerrados/reactivables).',
      objective: 'Mantener seguimiento con timing, agenda y contenido mínimo. Leads de campañas que reaccionan vuelven a Etapa C.',
      estimatedDuration: 'Continuo',
      color: '#22C55E',
      icon: 'Target',
      steps: [
        { title: 'Clasificar: Seguimiento activo vs Campañas', type: 'verificacion' as StepType, content: 'Seguimiento activo: leads con interés (E y K), timing claro, agenda definida, contenido mínimo.\nCampañas: leads cerrados/reactivables, llamados proactivos, sin expectativa inmediata, si reaccionan → vuelven a C.', isRequired: true, sortOrder: 0 },
        { title: 'Ejecutar seguimiento según clasificación', type: 'accion' as StepType, content: 'Seguimiento activo: mantener contacto según agenda. Campañas: llamados proactivos periódicos.', isRequired: true, sortOrder: 1 },
      ],
      scripts: [
        {
          name: 'Script base Campañas',
          situation: 'Llamado proactivo a lead que consultó anteriormente',
          scriptText: '"Hola [Nombre], te llamo porque en su momento habías consultado por [producto] y quería saber si seguía teniendo sentido retomarlo o si quedó en pausa."',
          notes: 'Sin expectativa inmediata. Si reaccionan positivamente → vuelven a Etapa C.',
          sortOrder: 0,
        },
      ],
      questions: [],
    },

    // ===== L. SEGUIMIENTO CON INTERES =====
    {
      name: 'L. Seguimiento con Interés',
      description: 'El lead mostró interés, respondió seguimiento, necesita resolver dudas para avanzar.',
      objective: 'Explicar cómo sigue el proceso y buscar seña. Decidir instancia: llamado (M) o reunión presencial (N).',
      estimatedDuration: '1-3 días',
      color: '#84CC16',
      icon: 'TrendingUp',
      steps: [
        { title: 'Confirmar interés activo', type: 'verificacion' as StepType, content: 'El lead mostró interés, respondió seguimiento, necesita resolver dudas para avanzar.', isRequired: true, sortOrder: 0 },
        { title: 'Decidir instancia', type: 'verificacion' as StepType, content: '¿Qué instancia conviene?\nLlamado → Etapa M (Llamado dudas + proceso + intento de seña)\nReunión presencial → Etapa N (Reunión presencial dudas + proceso)', isRequired: true, sortOrder: 1 },
      ],
      scripts: [],
      questions: [],
    },

    // ===== M. LLAMADO DUDAS + PROCESO + INTENTO DE SEÑA =====
    {
      name: 'M. Llamado Dudas + Seña',
      description: 'Aclarar cómo se opera, reducir incertidumbre, avanzar a seña.',
      objective: '1) Aclarar cómo se opera. 2) Reducir incertidumbre. 3) Avanzar a seña.',
      estimatedDuration: '15-20 minutos',
      color: '#A855F7',
      icon: 'Phone',
      steps: [
        { title: 'Apertura del llamado', type: 'accion' as StepType, content: '"Te llamo para ordenar dudas y contarte bien cómo sigue el proceso si avanzamos. La idea es que tengas todo claro antes de tomar una decisión."', isRequired: true, sortOrder: 0 },
        { title: 'Explicar proceso', type: 'accion' as StepType, content: 'Explicar según corresponda: servicios, boleto, aspectos legales, seña, tiempos, firma. Sin tecnicismos. Sin apuro.', isRequired: true, sortOrder: 1 },
        { title: 'Intento de seña (elegante)', type: 'accion' as StepType, content: '"Con lo que ya vimos, el próximo paso lógico sería avanzar con una seña para reservar la unidad. Puede ser monetaria o, si te resulta más cómodo, dejarla de palabra y coordinamos la firma."', isRequired: true, sortOrder: 2 },
        { title: 'Evaluar avance', type: 'verificacion' as StepType, content: '¿Hay avance? SÍ → Etapa O (Seña + compromiso). NO → vuelve a K (Zona gris). Pasa si: dudas despejadas, compromiso verbal o monetario, fecha tentativa de firma.', isRequired: true, sortOrder: 3 },
      ],
      scripts: [
        {
          name: 'Apertura llamado dudas',
          situation: 'Llamado para resolver dudas y avanzar a seña',
          scriptText: '"Te llamo para ordenar dudas y contarte bien cómo sigue el proceso si avanzamos. La idea es que tengas todo claro antes de tomar una decisión."',
          notes: 'Sin tecnicismos. Sin apuro. El objetivo es dar seguridad operativa.',
          sortOrder: 0,
        },
        {
          name: 'Intento de seña',
          situation: 'Después de explicar el proceso, al intentar cerrar seña',
          scriptText: '"Con lo que ya vimos, el próximo paso lógico sería avanzar con una seña para reservar la unidad. Puede ser monetaria o, si te resulta más cómodo, dejarla de palabra y coordinamos la firma."',
          notes: 'Si hay avance → Etapa O. Si no → vuelve a K.',
          sortOrder: 1,
        },
      ],
      questions: [],
    },

    // ===== N. REUNION PRESENCIAL DUDAS + PROCESO =====
    {
      name: 'N. Reunión Dudas + Proceso',
      description: 'Transformar interés en compromiso. Cerrar incertidumbre y dar seguridad operativa para avanzar, BUSCANDO LA SEÑA.',
      objective: 'Transformar interés en compromiso. Cerrar incertidumbre, dar seguridad operativa y buscar seña.',
      estimatedDuration: '30 minutos',
      color: '#D946EF',
      icon: 'Users',
      steps: [
        { title: 'Apertura y encuadre (2-3 min)', type: 'accion' as StepType, content: '"La idea de esta reunión es ordenar todas las dudas que tengas y contarte, paso a paso, cómo sigue el proceso si avanzamos. Prefiero que tengas todo claro antes de tomar cualquier decisión."', isRequired: true, sortOrder: 0 },
        { title: 'Bloque: Cómo opera EDISUR (estructura fija)', type: 'accion' as StepType, content: 'Explicar SIEMPRE en este orden:\n1. Qué es la seña y para qué sirve\n2. Cómo es el boleto\n3. Rol de legales\n4. Tiempos y firma\n5. Qué pasa después de firmar\nLenguaje simple, sin tecnicismos innecesarios.', isRequired: true, sortOrder: 1 },
        { title: 'Intento explícito de seña (OBLIGATORIO)', type: 'accion' as StepType, content: '"Con lo que ya vimos y si esto te cierra, el próximo paso lógico sería avanzar con una seña para reservar la unidad. Idealmente monetaria, pero también podemos dejarla de palabra y coordinamos la firma."', isRequired: true, sortOrder: 2 },
        { title: 'Evaluar avance', type: 'verificacion' as StepType, content: '¿Hay avance? SÍ → Etapa O. NO → Etapa K (Zona gris post-reunión).\nPasa si: dudas despejadas, proceso explicado, compromiso verbal o monetario, fecha tentativa de firma.\nNo pasa si: "Lo pienso y te aviso", nuevas dudas sin avance.', isRequired: true, sortOrder: 3 },
      ],
      scripts: [
        {
          name: 'Apertura reunión dudas + proceso',
          situation: 'Inicio de reunión presencial para resolver dudas y avanzar',
          scriptText: '"La idea de esta reunión es ordenar todas las dudas que tengas y contarte, paso a paso, cómo sigue el proceso si avanzamos. Prefiero que tengas todo claro antes de tomar cualquier decisión."',
          notes: 'Transformar interés en compromiso. Dar seguridad operativa.',
          sortOrder: 0,
        },
        {
          name: 'Intento explícito de seña',
          situation: 'Después de explicar el proceso de EDISUR',
          scriptText: '"Con lo que ya vimos y si esto te cierra, el próximo paso lógico sería avanzar con una seña para reservar la unidad. Idealmente monetaria, pero también podemos dejarla de palabra y coordinamos la firma."',
          notes: 'OBLIGATORIO intentar seña. Si hay avance → O. Si no → K.',
          sortOrder: 1,
        },
      ],
      questions: [],
    },

    // ===== O. SEÑA + COMPROMISO DE FIRMA =====
    {
      name: 'O. Seña + Compromiso',
      description: 'Formalizar el compromiso comercial y activar el proceso interno.',
      objective: 'Registrar seña, acordar fecha de firma, pasar la operación en el sistema, confirmar siguiente paso al cliente.',
      estimatedDuration: '15-30 minutos',
      color: '#F43F5E',
      icon: 'FileText',
      steps: [
        { title: 'Registrar seña en Gestar', type: 'accion' as StepType, content: 'Registrar la seña (monetaria o de palabra) en el sistema CRM.', isRequired: true, sortOrder: 0 },
        { title: 'Acordar fecha de firma', type: 'accion' as StepType, content: 'Definir día y hora concretos para la firma del boleto.', isRequired: true, sortOrder: 1 },
        { title: 'Pasar la operación en el sistema', type: 'accion' as StepType, content: 'Actualizar el estado de la operación en Gestar.', isRequired: true, sortOrder: 2 },
        { title: 'Confirmar al cliente el siguiente paso', type: 'accion' as StepType, content: '"Perfecto. Entonces dejamos asentada la seña y avanzamos con la preparación del boleto. Te voy a pedir unos datos y coordinamos la firma para el [día]."', isRequired: true, sortOrder: 3 },
        { title: 'Coordinar operativa de pago', type: 'accion' as StepType, content: '¿Trae el pago? ¿Lo acompañamos al banco? Definir logística.', isRequired: true, sortOrder: 4 },
        { title: 'Si es ladrillo: coordinar entrega con post-venta', type: 'accion' as StepType, content: 'Para productos de ladrillo, coordinar proceso de entrega con el equipo de post-venta.', isRequired: false, sortOrder: 5 },
      ],
      scripts: [
        {
          name: 'Confirmación de seña',
          situation: 'Al formalizar la seña con el cliente',
          scriptText: '"Perfecto. Entonces dejamos asentada la seña y avanzamos con la preparación del boleto. Te voy a pedir unos datos y coordinamos la firma para el [día]."',
          notes: 'El proceso no cambia entre seña monetaria o de palabra, solo el modo de confirmación.',
          sortOrder: 0,
        },
      ],
      questions: [],
    },

    // ===== P. SOLICITAR DATOS PARA BOLETO =====
    {
      name: 'P. Datos para Boleto',
      description: 'Recolectar toda la información necesaria para confección legal sin demoras.',
      objective: 'Obtener todos los datos del cliente para el boleto en una sola instancia.',
      estimatedDuration: '10-15 minutos',
      color: '#0EA5E9',
      icon: 'FileText',
      steps: [
        { title: 'Solicitar datos al cliente', type: 'accion' as StepType, content: '"Para avanzar con el boleto necesito algunos datos básicos. Te los voy a pedir ahora así evitamos idas y vueltas."', isRequired: true, sortOrder: 0 },
        { title: 'Nombre y apellido', type: 'verificacion' as StepType, content: 'Dato obligatorio para el boleto.', isRequired: true, sortOrder: 1 },
        { title: 'DNI', type: 'verificacion' as StepType, content: 'Dato obligatorio para el boleto.', isRequired: true, sortOrder: 2 },
        { title: 'Estado civil', type: 'verificacion' as StepType, content: 'Dato obligatorio para el boleto.', isRequired: true, sortOrder: 3 },
        { title: 'CUIT/CUIL', type: 'verificacion' as StepType, content: 'Dato obligatorio para el boleto.', isRequired: true, sortOrder: 4 },
        { title: 'Domicilio', type: 'verificacion' as StepType, content: 'Dato obligatorio para el boleto.', isRequired: true, sortOrder: 5 },
        { title: 'Email', type: 'verificacion' as StepType, content: 'Dato obligatorio para el boleto.', isRequired: true, sortOrder: 6 },
        { title: 'Modalidad de pago acordada', type: 'verificacion' as StepType, content: 'Confirmar la modalidad de pago definida.', isRequired: true, sortOrder: 7 },
      ],
      scripts: [
        {
          name: 'Solicitud de datos',
          situation: 'Al recolectar datos para confección del boleto',
          scriptText: '"Para avanzar con el boleto necesito algunos datos básicos. Te los voy a pedir ahora así evitamos idas y vueltas."',
          notes: 'Datos completos → avanza a Q (Confección del boleto).',
          sortOrder: 0,
        },
      ],
      questions: [],
    },

    // ===== Q. CONFECCION DEL BOLETO =====
    {
      name: 'Q. Confección del Boleto',
      description: 'Generar el documento contractual correcto con los datos recibidos.',
      objective: 'Confeccionar el boleto completo. Si falta info, volver a P.',
      estimatedDuration: '1-2 días',
      color: '#6366F1',
      icon: 'FileText',
      steps: [
        { title: 'Confeccionar boleto con datos recibidos', type: 'accion' as StepType, content: 'Generar el documento contractual con toda la información del cliente y la operación.', isRequired: true, sortOrder: 0 },
        { title: 'Verificar datos completos', type: 'verificacion' as StepType, content: 'Si datos completos → continuar a R (Legales). Si falta info → volver a P (solicitar datos faltantes).', isRequired: true, sortOrder: 1 },
      ],
      scripts: [],
      questions: [],
    },

    // ===== R. DERIVACION A LEGALES =====
    {
      name: 'R. Derivación a Legales',
      description: 'Validación jurídica antes de firma. Loop interno, NO comercial.',
      objective: 'Enviar boleto a Legales para revisión formal y legal. Aprobar o corregir.',
      estimatedDuration: '1-3 días',
      color: '#7C3AED',
      icon: 'Scale',
      steps: [
        { title: 'Enviar boleto a Legales', type: 'accion' as StepType, content: 'Enviar el boleto confeccionado al departamento legal para revisión.', isRequired: true, sortOrder: 0 },
        { title: 'Revisión formal y legal', type: 'verificacion' as StepType, content: '¿Legales aprueba? SÍ → Etapa S (Pre-firma). NO → Loop interno (volver a Q o P según observación). IMPORTANTE: Este loop es INTERNO, NO comercial. El cliente NO vuelve a zona gris.', isRequired: true, sortOrder: 1 },
      ],
      scripts: [],
      questions: [],
    },

    // ===== S. ACTIVAR REUNION DE FIRMA (PRE-FIRMA) =====
    {
      name: 'S. Pre-Firma',
      description: 'Preparar una experiencia cuidada y profesional para la firma.',
      objective: 'Coordinar fecha/hora, asignar cochera, preparar sala y cartel de bienvenida.',
      estimatedDuration: '1-2 días antes de firma',
      color: '#DB2777',
      icon: 'Calendar',
      steps: [
        { title: 'Coordinar fecha y hora de firma', type: 'accion' as StepType, content: 'Definir fecha y hora concretas con el cliente.', isRequired: true, sortOrder: 0 },
        { title: 'Asignar cochera y avisar por WhatsApp', type: 'accion' as StepType, content: 'Asignar cochera al cliente y comunicarla.', isRequired: true, sortOrder: 1 },
        { title: 'Preparar cartel de bienvenida', type: 'accion' as StepType, content: 'Preparar cartel personalizado de bienvenida para el cliente.', isRequired: true, sortOrder: 2 },
        { title: 'Preparar sala', type: 'accion' as StepType, content: 'Asegurar que la sala de firma esté lista y profesional.', isRequired: true, sortOrder: 3 },
        { title: 'Preparar agenda interna', type: 'accion' as StepType, content: 'Coordinar internamente quiénes participan y el orden de la reunión.', isRequired: true, sortOrder: 4 },
      ],
      scripts: [
        {
          name: 'WhatsApp pre-firma',
          situation: 'Confirmación al cliente antes de la reunión de firma',
          scriptText: '"Te confirmo la reunión de firma para el [día] a las [hora]. Te asignamos la cochera [número]. Te esperamos."',
          notes: 'Experiencia premium y cuidada.',
          sortOrder: 0,
        },
      ],
      questions: [],
    },

    // ===== T. REUNION DE FIRMA DE BOLETO =====
    {
      name: 'T. Reunión de Firma',
      description: 'Cerrar la operación con una experiencia premium y ordenada.',
      objective: 'Ejecutar la firma del boleto con protocolo de experiencia premium.',
      estimatedDuration: '30-60 minutos',
      color: '#16A34A',
      icon: 'PenTool',
      steps: [
        { title: 'Recepción con cartel de bienvenida', type: 'accion' as StepType, content: 'Recibir al cliente con cartel personalizado de bienvenida.', isRequired: true, sortOrder: 0 },
        { title: 'Café / agua', type: 'accion' as StepType, content: 'Ofrecer bebidas al cliente para crear ambiente cómodo.', isRequired: true, sortOrder: 1 },
        { title: 'Ingreso de abogados', type: 'accion' as StepType, content: 'Incorporar al equipo legal a la reunión.', isRequired: true, sortOrder: 2 },
        { title: 'Revisión final del boleto', type: 'accion' as StepType, content: 'Revisión conjunta del documento antes de firmar.', isRequired: true, sortOrder: 3 },
        { title: 'Firma del boleto', type: 'accion' as StepType, content: 'Ejecutar la firma formal del boleto.', isRequired: true, sortOrder: 4 },
      ],
      scripts: [],
      questions: [],
    },

    // ===== U. FINANZAS: PAGO Y CIERRE =====
    {
      name: 'U. Finanzas: Pago y Cierre',
      description: 'Finalizar la operación administrativa y financiera.',
      objective: 'Derivar a Finanzas, ejecutar pago según modalidad acordada, confirmar cierre.',
      estimatedDuration: '1-5 días',
      color: '#0D9488',
      icon: 'DollarSign',
      steps: [
        { title: 'Derivar a Finanzas', type: 'accion' as StepType, content: 'Pasar la operación al departamento de Finanzas.', isRequired: true, sortOrder: 0 },
        { title: 'Ejecutar pago según modalidad acordada', type: 'accion' as StepType, content: 'Procesar el pago según lo definido con el cliente.', isRequired: true, sortOrder: 1 },
        { title: 'Confirmación final', type: 'verificacion' as StepType, content: 'Confirmar que el pago fue procesado correctamente.', isRequired: true, sortOrder: 2 },
        { title: 'Cerrar operación como Venta', type: 'accion' as StepType, content: 'Marcar la operación como VENTA cerrada en el sistema. Fin del proceso comercial.', isRequired: true, sortOrder: 3 },
      ],
      scripts: [],
      questions: [],
    },

    // ===== V. MENSAJE FINAL: AGRADECIMIENTO =====
    {
      name: 'V. Agradecimiento + Referidos',
      description: 'Expandir al cliente y cristalizar la relación con un mensaje agradable y de servicio. Pedir referidos.',
      objective: 'Agradecer la confianza y pedir referidos. Un proceso claro baja la ansiedad del cliente, protege al asesor y aumenta la tasa de cierre.',
      estimatedDuration: 'Mismo día o día siguiente al cierre',
      color: '#22C55E',
      icon: 'Heart',
      steps: [
        { title: 'Enviar WhatsApp de agradecimiento', type: 'accion' as StepType, content: 'Mensaje agradeciendo la confianza y pidiendo referidos. El mejor momento para pedir referidos es cuando el cliente está satisfecho con la experiencia.', isRequired: true, sortOrder: 0 },
        { title: 'Pedir referidos', type: 'accion' as StepType, content: 'Solicitar referidos de forma natural y elegante.', isRequired: true, sortOrder: 1 },
      ],
      scripts: [
        {
          name: 'Agradecimiento + pedido de referidos',
          situation: 'Después del cierre exitoso de la operación',
          scriptText: '"[Nombre], quería agradecerte la confianza. Fue un placer acompañarte en todo el proceso. Si conocés a alguien que esté evaluando una inversión o buscando su próximo hogar, no dudes en pasarle mi contacto. ¡Estamos para ayudar!"',
          notes: 'MENSAJE FINAL CLAVE: Un proceso claro baja la ansiedad del cliente, protege al asesor y aumenta la tasa de cierre.\n\nEl seguimiento no es insistir. Es ayudar al cliente a decidir.',
          sortOrder: 0,
        },
      ],
      questions: [],
    },
  ],

  // ===== OBJECIONES GLOBALES DEL PLAYBOOK =====
  objections: [
    {
      objection: '"Pasame precios" / "Mandame valores por WhatsApp"',
      category: 'precio' as ObjectionCategory,
      severity: 'alto' as ObjectionSeverity,
      responses: [
        { text: 'Entiendo. El tema con pasar precios aislados es que sin contexto suelen generar más dudas que claridad, tenemos mucha diversidad de productos y disparidad de precios. Prefiero que lo veamos bien y si no encaja, te lo voy a decir yo primero.', type: 'reencuadre', example: 'Reencuadrar a reunión. NUNCA enviar precio sin reunión.' },
        { text: 'Puedo compartirte un rango general de precios (de X a Y) y tasas de crecimiento, pero para que realmente te sirva necesitamos verlo en contexto. ¿Te parece que lo hagamos en una reunión corta?', type: 'concesion', example: 'Permitido compartir RANGO, no precio exacto.' },
      ],
      signalsWorking: 'El cliente acepta reunión después del reencuadre',
      ifNotWorking: 'Mantener en zona gris con rango de precios. Nunca enviar precio exacto sin reunión.',
      sortOrder: 0,
    },
    {
      objection: '"Ahora no puedo" / "No es el momento"',
      category: 'tiempo' as ObjectionCategory,
      severity: 'medio' as ObjectionSeverity,
      responses: [
        { text: 'Perfecto, lo entiendo. Justamente para eso está la reunión, para ordenar todo y que no pierdas tiempo comparando sin contexto. Si te parece, lo retomamos en unos días y lo vemos bien.', type: 'reencuadre', example: 'SIEMPRE agendar próximo contacto concreto.' },
        { text: '¿Cuándo sería un mejor momento? Te agendo un seguimiento para que no se pierda.', type: 'pregunta', example: 'Buscar fecha concreta, nunca dejar en "cuando puedas".' },
      ],
      signalsWorking: 'El cliente da una fecha concreta para retomar',
      ifNotWorking: 'Mantener en seguimiento. Si evita sistemáticamente, descartar tras 2 ciclos.',
      sortOrder: 1,
    },
    {
      objection: '"Estoy viendo opciones" / "Estoy comparando"',
      category: 'competencia' as ObjectionCategory,
      severity: 'medio' as ObjectionSeverity,
      responses: [
        { text: 'Justamente, la reunión te va a servir para comparar con más criterio. En 30 minutos filtramos opciones reales y te vas con claridad. Si no encaja, te lo digo yo primero.', type: 'reencuadre', example: 'Posicionar la reunión como herramienta de comparación.' },
        { text: '¿Qué es lo que más te importa que se cumpla? Así vemos si tiene sentido avanzar o no.', type: 'pregunta', example: 'Buscar criterios de decisión para personalizar.' },
      ],
      signalsWorking: 'El cliente comparte qué está viendo y acepta reunión para comparar',
      ifNotWorking: 'Enviar brochure de 1 solo proyecto relevante. Nunca catálogos múltiples.',
      sortOrder: 2,
    },
    {
      objection: '"Recién empiezo a evaluar" / "Estoy explorando"',
      category: 'tiempo' as ObjectionCategory,
      severity: 'bajo' as ObjectionSeverity,
      responses: [
        { text: 'Perfecto, justamente el mejor momento para vernos es ahora, así arrancás con las ideas ordenadas y no perdés tiempo viendo cosas que no te sirven.', type: 'reencuadre', example: 'Posicionar la reunión como punto de partida inteligente.' },
        { text: '¿Qué te llevó a empezar a buscar ahora?', type: 'pregunta', example: 'Entender motivación real detrás de la exploración.' },
      ],
      signalsWorking: 'El cliente explica su motivación y acepta reunión "para ordenar"',
      ifNotWorking: 'Agendar seguimiento en 1-2 semanas.',
      sortOrder: 3,
    },
    {
      objection: '"Lo pienso y te aviso" / "Lo veo y te aviso" / "Después vemos"',
      category: 'confianza' as ObjectionCategory,
      severity: 'alto' as ObjectionSeverity,
      responses: [
        { text: 'Por supuesto. ¿Qué aspectos específicos necesitás pensar? Así te puedo dar más información sobre eso puntual.', type: 'pregunta', example: 'Buscar la objeción REAL detrás del "lo pienso".' },
        { text: 'Entiendo. Para no dejar esto en el aire, ¿te parece si lo retomamos el [día]? Así lo vemos con más calma.', type: 'reencuadre', example: 'NUNCA aceptar "avisame". Siempre proponer fecha.' },
      ],
      signalsWorking: 'El cliente acepta fecha concreta y dice qué necesita pensar',
      ifNotWorking: 'Activar secuencia zona gris (K). Si no responde tras ciclo completo, descartar.',
      sortOrder: 4,
    },
    {
      objection: '"Mandame un mensaje cuando puedas" / "Escribime después"',
      category: 'tiempo' as ObjectionCategory,
      severity: 'medio' as ObjectionSeverity,
      responses: [
        { text: 'Dale, te escribo. Pero para aprovechar mejor el contacto, ¿te queda mejor que te llame mañana por la mañana o por la tarde?', type: 'reencuadre', example: 'Convertir vaguedad en compromiso concreto.' },
      ],
      signalsWorking: 'El cliente da horario concreto',
      ifNotWorking: 'Ejecutar secuencia de no contacto (B1).',
      sortOrder: 5,
    },
    {
      objection: '"Te explico todo ahora" (el asesor quiere dar toda la info por teléfono)',
      category: 'producto' as ObjectionCategory,
      severity: 'alto' as ObjectionSeverity,
      responses: [
        { text: 'PROHIBIDO: "Te paso precios por WhatsApp", "Después vemos", "Mandame un mensaje cuando puedas", "Te explico todo ahora", "Depende...". Todo esto DEBILITA AUTORIDAD y MATA CONVERSIÓN.', type: 'reencuadre', example: 'Auto-corrección del asesor. La llamada no es para informar, es para ORDENAR.' },
      ],
      signalsWorking: 'El asesor mantiene el control y vende la reunión',
      ifNotWorking: 'Revisar script de llamada. La llamada se convirtió en asesoramiento gratuito.',
      sortOrder: 6,
    },
  ],
};
