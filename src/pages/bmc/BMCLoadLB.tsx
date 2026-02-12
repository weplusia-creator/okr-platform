import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { BMC_BLOCK_CONFIG } from '../../types/bmc';

// Block name mapping from Spanish labels to block types
const BLOCK_MAP: Record<string, string> = {
  'Segmentos': 'customer_segments',
  'Propuesta de Valor': 'value_propositions',
  'Canales': 'channels',
  'Relación': 'customer_relationships',
  'Socios': 'key_partnerships',
  'Ingresos': 'revenue_streams',
  'Recursos': 'key_resources',
  'Actividades': 'key_activities',
  'Costos': 'cost_structure',
};

const PARTICIPANTS = ['Saso', 'Joaco', 'Iván', 'Cecilia', 'Pancha'];

// All 65 questions organized by block
const QUESTIONS: { block: string; question: string; helpText: string }[] = [
  // Segmentos (Q1-Q8)
  { block: 'Segmentos', question: '¿Quién es hoy nuestro inversor tipo (perfil real, no ideal)?', helpText: 'Claridad de cliente financiero' },
  { block: 'Segmentos', question: '¿Qué problema principal le resolvemos al inversor al entrar en LB?', helpText: 'Motivación real del inversor' },
  { block: 'Segmentos', question: '¿Qué tipo de inversor no queremos volver a tener?', helpText: 'Aprendizaje por fricción' },
  { block: 'Segmentos', question: 'Descripción exhaustiva de los 2 tipos de inversores que tiene LB, cuales son sus desafíos, ventajas y desventajas, y qué podemos hacer para alinear sus expectativas?', helpText: 'Aprendizaje por fricción' },
  { block: 'Segmentos', question: '¿Quién es hoy el consumidor final tipo de nuestros proyectos?', helpText: 'Cliente comprador real' },
  { block: 'Segmentos', question: '¿Qué valora más el consumidor final al comprar una unidad?', helpText: 'Drivers de decisión' },
  { block: 'Segmentos', question: '¿Qué segmento de consumidor nos genera más problemas post-venta?', helpText: 'Riesgo operativo' },
  { block: 'Segmentos', question: '¿Qué diferencia hay entre el cliente ideal y el cliente real que tenemos hoy?', helpText: 'Gap estratégico' },
  // Propuesta de Valor (Q9-Q16)
  { block: 'Propuesta de Valor', question: '¿Por qué un inversor elige LB y no otro desarrollo?', helpText: 'Diferencial financiero' },
  { block: 'Propuesta de Valor', question: 'Si tuvieras que describir la propuesta de valor de LB (qué hace, de manera clara y entendible), y cómo aporta valor a la sociedad, qué dirías?', helpText: 'Propuesta fácil y entendible' },
  { block: 'Propuesta de Valor', question: '¿Qué riesgo le estamos quitando al inversor?', helpText: 'Propuesta anti-riesgo' },
  { block: 'Propuesta de Valor', question: '¿Qué parte de nuestra propuesta depende de Saso?', helpText: 'Dependencia crítica' },
  { block: 'Propuesta de Valor', question: '¿Por qué un consumidor final compra una unidad de LB?', helpText: 'Valor percibido' },
  { block: 'Propuesta de Valor', question: '¿Qué promesa le hacemos al comprador y no puede fallar?', helpText: 'Promesa central' },
  { block: 'Propuesta de Valor', question: '¿Dónde agregamos más valor: diseño, ejecución o gestión?', helpText: 'Foco estratégico' },
  { block: 'Propuesta de Valor', question: '¿Qué parte de la propuesta no está hoy explicitada ni comunicada?', helpText: 'Oportunidad' },
  // Canales (Q17-Q23)
  { block: 'Canales', question: '¿Cómo llegan hoy los inversores a LB?', helpText: 'Dependencia relacional' },
  { block: 'Canales', question: '¿Qué tan escalable es ese canal de inversores?', helpText: 'Escalabilidad' },
  { block: 'Canales', question: '¿Cómo se va a comercializar Nazarena y Manzanares?', helpText: 'Definición comercial' },
  { block: 'Canales', question: '¿Cómo llega hoy el consumidor final a nuestros proyectos?', helpText: 'Funnel real' },
  { block: 'Canales', question: '¿Qué canal de venta hoy genera más fricción?', helpText: 'Cuello de botella' },
  { block: 'Canales', question: '¿Qué canal deberíamos profesionalizar sí o sí?', helpText: 'Prioridad' },
  { block: 'Canales', question: '¿Qué canal hoy es un riesgo si crecemos?', helpText: 'Riesgo oculto' },
  // Relación (Q24-Q30)
  { block: 'Relación', question: '¿Cómo es hoy la relación real con los inversores?', helpText: 'Experiencia inversor' },
  { block: 'Relación', question: '¿Qué expectativas del inversor no estamos gestionando bien?', helpText: 'Riesgo relacional' },
  { block: 'Relación', question: '¿Qué parte del vínculo con inversores es informal?', helpText: 'Falta de sistema' },
  { block: 'Relación', question: '¿Cómo es hoy la experiencia del consumidor final?', helpText: 'Experiencia cliente' },
  { block: 'Relación', question: '¿Dónde aparecen más reclamos del comprador?', helpText: 'Fricción post-venta' },
  { block: 'Relación', question: '¿Qué relación queremos tener con ambos a futuro?', helpText: 'Visión' },
  { block: 'Relación', question: '¿Qué deberíamos estandarizar para no improvisar más?', helpText: 'Necesidad de procesos' },
  // Socios (Q31-Q37)
  { block: 'Socios', question: '¿Quiénes son hoy nuestros socios financieros clave?', helpText: 'Dependencia financiera' },
  { block: 'Socios', question: '¿Qué socio financiero podría volverse un riesgo?', helpText: 'Riesgo estratégico' },
  { block: 'Socios', question: '¿Qué tipo de inversor necesitamos a futuro?', helpText: 'Perfil deseado' },
  { block: 'Socios', question: '¿Qué proveedores/contratistas son críticos?', helpText: 'Riesgo operativo' },
  { block: 'Socios', question: '¿Qué relación deberíamos profesionalizar urgente?', helpText: 'Orden' },
  { block: 'Socios', question: '¿Qué socio nos permitiría escalar mejor?', helpText: 'Oportunidad' },
  { block: 'Socios', question: '¿Qué dependencia hoy nos limita como empresa?', helpText: 'Cuello de botella' },
  // Ingresos (Q38-Q44)
  { block: 'Ingresos', question: '¿De dónde viene hoy el ingreso principal de LB?', helpText: 'Fuente dominante' },
  { block: 'Ingresos', question: '¿Qué parte del ingreso proviene del inversor y cuál del consumidor final?', helpText: 'Dependencia real' },
  { block: 'Ingresos', question: '¿Qué ingresos son previsibles y cuáles no?', helpText: 'Estabilidad financiera' },
  { block: 'Ingresos', question: '¿Cómo impactan los alquileres de los triplex en el flujo mensual?', helpText: 'Flujo de caja' },
  { block: 'Ingresos', question: '¿Qué margen real deja cada tipo de unidad/proyecto?', helpText: 'Rentabilidad' },
  { block: 'Ingresos', question: '¿Qué supuestos financieros no están validados con datos?', helpText: 'Riesgo oculto' },
  { block: 'Ingresos', question: '¿Qué ingreso queremos estabilizar para crecer con menos riesgo?', helpText: 'Prioridad estratégica' },
  // Recursos (Q45-Q51)
  { block: 'Recursos', question: '¿Cuáles son hoy los recursos más críticos para que LB funcione?', helpText: 'Núcleo del negocio' },
  { block: 'Recursos', question: '¿Qué recurso está hoy sobrecargado?', helpText: 'Riesgo operativo' },
  { block: 'Recursos', question: '¿Qué conocimiento vive solo en la cabeza de alguien?', helpText: 'Falta de sistema' },
  { block: 'Recursos', question: '¿Qué información debería estar centralizada y no lo está?', helpText: 'Desorden informativo' },
  { block: 'Recursos', question: '¿Qué pasaría si Saso se corre 30 días de la operación?', helpText: 'Dependencia real' },
  { block: 'Recursos', question: '¿Qué recursos necesitamos fortalecer para escalar Manzanares?', helpText: 'Preparación para crecer' },
  { block: 'Recursos', question: '¿Qué recurso estamos subutilizando hoy?', helpText: 'Oportunidad' },
  // Actividades (Q52-Q58)
  { block: 'Actividades', question: '¿Qué actividades generan más valor real para LB?', helpText: 'Enfoque' },
  { block: 'Actividades', question: '¿Qué tareas se hacen hoy sin proceso claro?', helpText: 'Desorden' },
  { block: 'Actividades', question: '¿Dónde se pierde más tiempo y energía?', helpText: 'Ineficiencia' },
  { block: 'Actividades', question: '¿Qué actividades deberían documentarse ya?', helpText: 'Prioridad' },
  { block: 'Actividades', question: '¿Qué tareas hoy dependen de urgencias constantes?', helpText: 'Falta de planificación' },
  { block: 'Actividades', question: '¿Qué actividades no debería hacer más Saso?', helpText: 'Delegación' },
  { block: 'Actividades', question: '¿Qué actividades son críticas para escalar sin romper la operación?', helpText: 'Escalabilidad' },
  // Costos (Q59-Q65)
  { block: 'Costos', question: '¿Cuáles son hoy los costos más relevantes del negocio?', helpText: 'Drivers de costo' },
  { block: 'Costos', question: '¿Qué costos no estamos midiendo con claridad?', helpText: 'Ceguera financiera' },
  { block: 'Costos', question: '¿Qué gastos crecen cuando hay desorden?', helpText: 'Impacto del caos' },
  { block: 'Costos', question: '¿Qué costos dependen de malas decisiones o improvisación?', helpText: 'Riesgo' },
  { block: 'Costos', question: '¿Qué costos podrían reducirse con procesos claros?', helpText: 'Oportunidad' },
  { block: 'Costos', question: '¿Qué costos escalan mal si sumamos proyectos?', helpText: 'Límite del modelo' },
  { block: 'Costos', question: '¿Qué estructura de costos queremos a 12 meses?', helpText: 'Visión futura' },
];

// Responses for Q1-Q4 (only questions with participant responses)
// Index matches PARTICIPANTS array order: [Saso, Joaco, Iván, Cecilia, Pancha]
const RESPONSES: Record<number, string[]> = {
  0: [ // Q1
    'Varios tipos de inversor. de largo plazo, con excedentes de capital que busca renta. Inversor de Pozo quiere una unidad en cuotas para renta. El ideal es el primero, ofrecer una ganancia asegurada, y mas de largo plazo que nos permite contar con un capital de trabajo estable, (Plazo minimo 3 años)',
    'Que sea alguien que tengamos confianza. Alguien conocido. Hasta ahi se me ocurre un perfil',
    'Inversores privados particulares',
    'El perfil real de hoy es quien tiene un excendente de $/USD y quiere tener una tasa de interes conveniente',
    'No se. Pero creo que alguien de confianza. Algunos que ya invirtieron y confían en la empresa',
  ],
  1: [ // Q2
    'ganancia asegurada de su capital inmovilizado. Ejemplo, en general el inversor que invierte en propiedades busca la renta posterior en el alquiler, esto hace que tenga que despues lidiar con los problemas de relacion con un inquilinio, nosotros nos ocupamos de eso. el recibe su renta. Tasa acual 12% anual. Actualmente estamos bien de capital de trabajo para los proximos 6 meses, con lo cual es posible que nuevos inversores entren al 10%',
    'Seguridad de inversion, a traves de la honestidad. Y ademas una seguridad economica ya que en el caso de no poder devolverle la plata tiene una unidad de garantia',
    'Habitacional, inversion de confianza con un producto tangible',
    'Tener una tasa de interes conveniente. La motivacion es la plata',
    'Invertir en un proyecto de confianza que le genere buenos intereses',
  ],
  2: [ // Q3
    'hoy depedimos del comprador de pozo, paga anticipo y cuotas, las espectativas que tienen este tipo de compradores generalmente son mayores a las que podemos ofrecer en cuanto a producto final. Me gustaria poder hacer obra con inversores como los descriptos anteriormente, y vennder la unidad terminada al comprador final, o alquilarla para generarle una renta al inversor',
    'Que no cumpla y respete con los plazos pactados',
    '',
    'Incumplidores, morosos, poco previsibles o que cambien las reglas de juego. Inversores que no comprendan el producto o su fin.',
    'No se si NO volver a tener (creo que por eso un poco se cambió el modelo de inversor). Pero si puedo decir que en general el consumidor final, quien va a vivir allí, es gente que paga por xx casa/depto y siempre quiere mas, o en el medio del camino de obra pretenden cambiar cosas... es el cliente mas quisquilloso el consumidor final',
  ],
  3: [ // Q4
    '1) Inversor con Renta Asegurada. Tasa anual entre el 8 y 12%, a 3 años de plazo idealmente. Objetivo general capital de trabajo para hacer obra y vender producto terminado 2) Inversor de Pozo, paga durante la obra, alinear expectativas de lo que compra versus lo que vamos a entregar en Calidad y Plazo, respecto del costo que esta pagando. VENTAJA 1 poco nivel de exigencia comercial, mientras reciba su renta no se mete. VENTAJA 2, costo financiero nulo. Se puede alinear expectativas del Inversor 2, lo que surgio, showroom, o renders REALES, combos de terminacion, creatividad, atencion de post venta, entrega, creatividad uso de la tecnologia.',
    'Inversor comun: desafio es generar una porpuesta atractiva y confiable para que pueda invertir su plata en LB. Ventajas: No espera calidad, espera rentabilidad. Desventajas: El alto porcentaje de renta (12%). El segundo inversor que seria el que compra en pozo es mas desafiante porque requiere un trato mas del dia a dia, espera resultados basados en 3 cosas importantes: El plazo, el costo y la calidad. Creo que este es el mas dificil para LB hoy porque nos esta costando conseguirlos y los que se consiguen no sabemos darles un plazo asegurado y ademas en terminos de calidad muchas veces las expextativas no coinciden porque ellos no ven los costos.',
    'Inversores de pozo: exigencia desproporcionada e inestable respecto al producto final. Acompañamiento del proyecto desde el inicio. Precision en relacion a las terminaciones con imagenes, comunicacion fluida y sin ruidos. Inversor con renta: Anticipos y previsivilidad financiera, no se involucra tanto en las definiciones de la obra. Cashflow y modelo de negocio claro',
    '1-Inversor final: es aquel que compra la propiedad para habitarla, o para renta. 2-Inversor a largo plazo: es alguien que confia en el proyecto y que tiene un excedente de dinero para invertir a cambio de una tasa de interes conveniente. Desafios: para el caso el caso del inversor final es cumplir las expectativas en cuanto a calidad, tiempos, y plata (por contrato podría haber mayores costos y el ideal es que no los hubiera). Y el desafio para el inversor es que LB cumpla con los desembolsos de intereses pactados. Lo ideal sería que una vez cumplido el plazo el inversor vuelva a invertir. Para alinear las expectativas hay que tener metas y promesas claras.',
    'El inversor que tiene expectativas en los plazos y la calidad del producto, que al no tener bien especificadas las terminaciones, exige más de lo que se le puede dar. En algunos casos es alguien que va a habitar la propiedad y en otros, alguien que compra como inversión pero que compara con su casa actual. Otro inversor es el que acompaña los tiempos y las condiciones de la construccion.',
  ],
};

// Unified responses for Q1-Q4
const UNIFIED_RESPONSES: Record<number, string> = {
  0: 'Hoy el inversor tipo real de LB es un inversor privado particular, con excedente de capital en pesos o dólares, que busca una renta atractiva y relativamente segura en el mediano/largo plazo, y cuya decisión de invertir está fuertemente basada en la confianza personal con los socios de la empresa o en experiencias previas positivas. En la práctica conviven dos subperfiles: inversores de largo plazo que aportan capital de trabajo estable por un horizonte mínimo cercano a los 3 años, y pequeños inversores de pozo que buscan acceder a una unidad en cuotas como activo de renta futura. Actualmente, el criterio dominante de selección no es financiero ni estratégico, sino relacional.',
  1: 'LB le resuelve al inversor la necesidad de obtener una renta atractiva y previsible sobre su capital inmovilizado, sin tener que involucrarse en la gestión operativa ni asumir la complejidad de administrar una propiedad. El inversor accede a una inversión respaldada por un activo tangible, con una tasa de interés definida, garantía en unidades habitacionales y un esquema en el que LB se ocupa integralmente del desarrollo, la ejecución y la gestión, permitiéndole al inversor capturar el rendimiento sin lidiar con riesgos operativos, inquilinos o decisiones del día a día.',
  2: 'LB no quiere volver a trabajar con perfiles que no cumplan los acuerdos financieros y operativos, que sean imprevisibles en pagos o que pretendan modificar las reglas del juego durante el desarrollo del proyecto. En particular, el mayor aprendizaje surge del comprador de pozo que actúa como consumidor final: este perfil suele tener expectativas de producto y personalización superiores a lo que el modelo permite, genera cambios en obra, fricción constante y desvíos operativos. A futuro, LB busca separar claramente al inversor financiero del consumidor final, desarrollando obras con capital inversor y comercializando unidades terminadas o destinadas a renta, evitando mezclar ambos roles.',
  3: 'LB hoy convive con dos perfiles: (1) Inversor de renta asegurada (financiero), que aporta capital de trabajo por un horizonte ideal de ~3 años a una tasa objetivo 8–12% anual, con baja intervención en decisiones de obra y foco en previsibilidad de pagos; y (2) Inversor de pozo / comprador anticipado, que paga durante la obra y opera con lógica de consumidor (a veces para habitar, a veces como inversión comparativa), y cuya expectativa se centra en plazo, costo y calidad, con alta sensibilidad a terminaciones, cambios y comunicación. El principal desafío del perfil 2 no es "venderle", sino alinear expectativas con un producto definido (alcance, terminaciones, opciones, plazos, cambios) y un esquema de comunicación y control que evite ruidos; el del perfil 1 es sostener confianza mediante un modelo financiero claro, cumplimiento estricto de desembolsos y una propuesta consistente que permita reinversión.',
};

// Insights / OKRs for Q1-Q4
const INSIGHTS: Record<number, string> = {
  0: `Insight: LB hoy atrae inversores por confianza personal, no por un modelo de inversión claramente definido.

Por qué es crítico: Esto explica por qué el crecimiento depende tanto de relaciones individuales y por qué escalar sin Saso resulta difícil. Mientras el inversor se elija por vínculo y no por criterios claros (horizonte, ticket, riesgo, retorno), la empresa queda expuesta a fricciones futuras, expectativas mal gestionadas y un crecimiento poco predecible.

OKR propuesto (trimestral) — O: Profesionalizar el perfil y la propuesta de inversión para atraer capital de forma predecible y escalable.
KR1: Definir y documentar 2 perfiles de inversor aceptado (largo plazo / pozo) con criterios claros de ticket, horizonte y expectativas.
KR2: Diseñar una propuesta estándar de inversión por perfil (retorno, plazos, garantías) validada internamente.
KR3: Lograr que al menos el 70% de los nuevos inversores ingresen bajo el perfil definido y no solo por vínculo personal.
KR4: Reducir a cero los casos de conflicto por expectativas de inversores en el trimestre.
Owner sugerido: Dirección / CEO (con soporte financiero-administrativo).
Primeras 3 iniciativas: Workshop interno para definir perfiles de inversor aceptado y no aceptado. Armado de una ficha estándar de "Perfil de Inversor LB". Creación de un documento base de propuesta de inversión reutilizable.`,

  1: `Insight: El principal valor de LB para el inversor no es solo la tasa, sino la tranquilidad de delegar la gestión completa del activo.

Por qué es crítico: Este insight redefine la propuesta de valor: competir solo por tasa expone a LB a una carrera descendente de rentabilidad. En cambio, posicionarse como un vehículo de inversión "hands-off", seguro y respaldado por activos reales permite sostener márgenes, ordenar expectativas y atraer inversores alineados con el modelo.

OKR propuesto (trimestral) — O: Clarificar y comunicar una propuesta de inversión centrada en rentabilidad + tranquilidad para el inversor.
KR1: Definir y documentar una propuesta de valor única para inversores que combine retorno, garantía y gestión integral.
KR2: Incorporar explícitamente el concepto de "inversión sin gestión" en el 100% de las comunicaciones a inversores.
KR3: Lograr que al menos el 80% de los nuevos inversores comprendan y validen la propuesta completa (no solo la tasa).
KR4: Mantener la tasa promedio de captación sin necesidad de incrementarla para cerrar nuevos inversores.
Owner sugerido: Dirección / CEO.
Primeras 3 iniciativas: Redactar un statement claro de propuesta de valor para inversores. Diseñar un documento simple que explique cómo LB gestiona el activo de punta a punta. Ajustar el discurso comercial para dejar de vender solo "tasa" y empezar a vender "tranquilidad + retorno".`,

  2: `Insight: El mayor conflicto histórico de LB no proviene del inversor financiero, sino de confundir inversor con consumidor final.

Por qué es crítico: Este insight explica gran parte del desorden, el desgaste del equipo y la pérdida de foco. Mientras LB mezcle venta de pozo a usuarios finales con inversión financiera, seguirá absorbiendo expectativas incompatibles con un modelo de desarrollo eficiente y escalable.

OKR propuesto (trimestral) — O: Redefinir el modelo de captación para separar claramente inversores de compradores finales y reducir fricción operativa.
KR1: Definir formalmente qué perfiles de inversor y de comprador final NO son aceptados por el modelo LB.
KR2: Eliminar la venta de pozo a consumidor final en el 100% de los nuevos proyectos.
KR3: Reducir en al menos un 80% los pedidos de cambios en obra provenientes de terceros.
KR4: Aumentar la previsibilidad de flujo de fondos logrando que el 100% de los aportes de capital cumplan plazos pactados.
Owner sugerido: Dirección / CEO.
Primeras 3 iniciativas: Documentar criterios de aceptación y rechazo de inversores y compradores. Ajustar el modelo comercial para vender unidades terminadas o en esquema de renta. Comunicar internamente el cambio de modelo para alinear a todo el equipo.`,

  3: `Insight: LB no tiene "dos inversores": tiene un inversor financiero y un comprador anticipado; mezclar ambos sin definir producto y reglas genera fricción inevitable.

Por qué es crítico: Esto explica el desgaste operativo y la dificultad para escalar. Mientras el "pozo" no tenga un producto estandarizado (con opciones acotadas) y un contrato/ritual de comunicación claro, LB seguirá pagando el costo de la personalización improductiva: cambios, reclamos, demoras, desviaciones de costo y pérdida de previsibilidad.

OKR propuesto (trimestral) — O: Ordenar el modelo de captación definiendo dos perfiles con reglas claras de producto, comunicación y compromisos para reducir fricción y mejorar previsibilidad.
KR1: Definir y documentar formalmente los 2 perfiles (inversor renta vs comprador anticipado) con criterios de aceptación/rechazo y expectativas estándar.
KR2: Implementar un "paquete de producto" para comprador anticipado: catálogo de terminaciones + combos + alcance NO negociable (100% de nuevas operaciones).
KR3: Reducir en al menos 70% los pedidos de cambios fuera de alcance y los reclamos por terminaciones/plazo en proyectos activos.
KR4: Alcanzar cumplimiento >=95% de pagos de intereses en fecha para inversores de renta durante el trimestre.
KR5 (opcional): Lograr que al menos 30% de inversores de renta manifiesten intención de reinvertir (medido por encuesta/NPS inversor o carta de intención).
Owner sugerido: Dirección/CEO (con co-owner Operaciones/Arquitectura para producto y Administración para pagos).
Primeras 3 iniciativas: Diseñar el "Investor Pack LB" (financiero): propuesta, plazos, tasa, garantías, calendario de pagos, reglas y reportes. Diseñar el "Buyer Pack LB" (pozo): renders reales, memoria descriptiva, combos de terminación, protocolo de cambios y comunicación. Implementar un ritual de gestión de expectativas: reunión de kick-off + reporte quincenal estándar + registro único de decisiones/cambios.`,
};

export function BMCLoadLB() {
  const { organization, appUser } = useAuth();
  const [status, setStatus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const log = (msg: string) => setStatus(prev => [...prev, msg]);

  const loadData = async () => {
    if (!organization?.id || !appUser?.id) {
      log('ERROR: No hay organización o usuario activo');
      return;
    }

    setLoading(true);
    try {
      // 1. Find "LB Constructora" project
      log('Buscando proyecto "LB Constructora"...');
      const { data: projects, error: projErr } = await supabase
        .from('projects')
        .select('id, name')
        .eq('organization_id', organization.id)
        .ilike('name', '%LB%');

      if (projErr) throw projErr;

      let projectId: string;
      if (!projects || projects.length === 0) {
        log('No se encontró proyecto con "LB". Buscando todos los proyectos...');
        const { data: allProjects } = await supabase
          .from('projects')
          .select('id, name')
          .eq('organization_id', organization.id);
        log(`Proyectos disponibles: ${allProjects?.map(p => `${p.name} (${p.id})`).join(', ') || 'ninguno'}`);

        // Try to find by "Constructora" as well
        const lb = allProjects?.find(p =>
          p.name.toLowerCase().includes('lb') ||
          p.name.toLowerCase().includes('constructora')
        );
        if (lb) {
          projectId = lb.id;
          log(`Encontrado: ${lb.name}`);
        } else {
          log('ERROR: No se encontró proyecto LB Constructora. Creando proyecto...');
          const { data: newProj, error: newProjErr } = await supabase
            .from('projects')
            .insert({
              organization_id: organization.id,
              name: 'LB Constructora',
              status: 'active',
              created_by: appUser.id,
            })
            .select()
            .single();
          if (newProjErr) throw newProjErr;
          projectId = newProj.id;
          log(`Proyecto creado: LB Constructora (${projectId})`);
        }
      } else {
        projectId = projects[0].id;
        log(`Proyecto encontrado: ${projects[0].name} (${projectId})`);
      }

      // 2. Check if canvas already exists
      const { data: existingCanvases } = await supabase
        .from('bmc_canvases')
        .select('id, name')
        .eq('project_id', projectId);

      if (existingCanvases && existingCanvases.length > 0) {
        log(`Ya existen ${existingCanvases.length} canvas(es) para este proyecto: ${existingCanvases.map(c => c.name).join(', ')}`);
        log('Si querés recrear, eliminá los canvas existentes primero.');
        setLoading(false);
        return;
      }

      // 3. Create canvas
      log('Creando canvas BMC...');
      const { data: canvas, error: canvasErr } = await supabase
        .from('bmc_canvases')
        .insert({
          organization_id: organization.id,
          project_id: projectId,
          name: 'Diagnóstico BMC - LB Constructora',
          description: 'Diagnóstico inicial del Business Model Canvas de LB Constructora con respuestas de 5 participantes.',
          version: 1,
          type: 'initial',
          status: 'in_progress',
          anonymous_responses: false,
          allow_voting: false,
          show_others_responses: 'yes',
          created_by: appUser.id,
        })
        .select()
        .single();

      if (canvasErr) throw canvasErr;
      const canvasId = canvas.id;
      log(`Canvas creado: ${canvasId}`);

      // 4. Create the 9 blocks
      log('Creando bloques BMC...');
      const blockConfigs = Object.values(BMC_BLOCK_CONFIG);
      const blockInserts = blockConfigs.map((cfg, i) => ({
        canvas_id: canvasId,
        type: cfg.type,
        name: cfg.name,
        description: cfg.description,
        icon: cfg.icon,
        color: cfg.color,
        sort_order: i,
      }));

      const { data: blockRows, error: blockErr } = await supabase
        .from('bmc_blocks')
        .insert(blockInserts)
        .select();

      if (blockErr) throw blockErr;
      log(`${blockRows.length} bloques creados`);

      // Create block type -> id map
      const blockMap: Record<string, string> = {};
      for (const b of blockRows) {
        blockMap[b.type] = b.id;
      }

      // 5. Create questions
      log('Creando 65 preguntas...');
      const questionInserts = QUESTIONS.map((q, i) => {
        const blockType = BLOCK_MAP[q.block];
        const blockId = blockMap[blockType];
        // Calculate sort_order within each block
        const blockQuestions = QUESTIONS.filter(qq => qq.block === q.block);
        const sortOrder = blockQuestions.indexOf(q);
        return {
          block_id: blockId,
          question: q.question,
          help_text: q.helpText,
          sort_order: sortOrder,
          response_type: 'text',
          required: true,
        };
      });

      const { data: questionRows, error: qErr } = await supabase
        .from('bmc_questions')
        .insert(questionInserts)
        .select();

      if (qErr) throw qErr;
      log(`${questionRows.length} preguntas creadas`);

      // Get question IDs for the first 4 questions (Segmentos block)
      const segmentosBlockId = blockMap['customer_segments'];
      const segmentosQuestions = questionRows
        .filter(q => q.block_id === segmentosBlockId)
        .sort((a, b) => a.sort_order - b.sort_order);

      // 6. Create participants
      log('Creando 6 participantes...');
      const participantInserts = [
        ...PARTICIPANTS.map(name => ({
          canvas_id: canvasId,
          name,
          role: 'participant',
          status: 'completed',
        })),
        {
          canvas_id: canvasId,
          name: 'Respuesta Unificada',
          role: 'facilitator',
          status: 'completed',
        },
      ];

      const { data: participantRows, error: pErr } = await supabase
        .from('bmc_participants')
        .insert(participantInserts)
        .select();

      if (pErr) throw pErr;
      log(`${participantRows.length} participantes creados`);

      // Create participant name -> id map
      const participantMap: Record<string, string> = {};
      for (const p of participantRows) {
        participantMap[p.name] = p.id;
      }

      // 7. Create responses for Q1-Q4
      log('Cargando respuestas de participantes para las primeras 4 preguntas...');
      const responseInserts: any[] = [];

      for (let qi = 0; qi < 4; qi++) {
        const questionId = segmentosQuestions[qi].id;

        // Individual responses
        for (let pi = 0; pi < PARTICIPANTS.length; pi++) {
          const responseText = RESPONSES[qi][pi];
          if (responseText) { // Skip empty responses
            responseInserts.push({
              canvas_id: canvasId,
              block_id: segmentosBlockId,
              question_id: questionId,
              participant_id: participantMap[PARTICIPANTS[pi]],
              response: responseText,
              is_anonymous: false,
            });
          }
        }

        // Unified response
        responseInserts.push({
          canvas_id: canvasId,
          block_id: segmentosBlockId,
          question_id: questionId,
          participant_id: participantMap['Respuesta Unificada'],
          response: UNIFIED_RESPONSES[qi],
          is_anonymous: false,
        });
      }

      const { data: responseRows, error: rErr } = await supabase
        .from('bmc_responses')
        .insert(responseInserts)
        .select();

      if (rErr) throw rErr;
      log(`${responseRows.length} respuestas cargadas`);

      // 8. Save insights/OKRs as consolidated response for the Segmentos block
      log('Guardando insights/OKRs como consolidación del bloque Segmentos...');
      const consolidatedText = Object.entries(INSIGHTS)
        .map(([qi, text]) => {
          const q = QUESTIONS[parseInt(qi)].question;
          return `## ${q}\n\n${text}`;
        })
        .join('\n\n---\n\n');

      const { error: consErr } = await supabase
        .from('bmc_blocks')
        .update({
          consolidated_response: consolidatedText,
          consolidated_by: appUser.id,
          consolidated_at: new Date().toISOString(),
        })
        .eq('id', segmentosBlockId);

      if (consErr) throw consErr;
      log('Insights/OKRs guardados como consolidación del bloque Segmentos');

      log('');
      log('=== CARGA COMPLETA ===');
      log(`Canvas: Diagnóstico BMC - LB Constructora`);
      log(`65 preguntas en 9 bloques`);
      log(`5 participantes + Respuesta Unificada`);
      log(`${responseRows.length} respuestas (primeras 4 preguntas)`);
      log(`Insights/OKRs consolidados en bloque Segmentos`);
      setDone(true);
    } catch (err: any) {
      log(`ERROR: ${err.message || JSON.stringify(err)}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Cargar BMC - LB Constructora
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Este script carga las 65 preguntas del diagnóstico BMC con las respuestas de los 5 participantes
        (Saso, Joaco, Iván, Cecilia, Pancha) y las respuestas unificadas + insights/OKRs.
      </p>

      {!done && (
        <button
          onClick={loadData}
          disabled={loading}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Cargando...' : 'Cargar datos BMC'}
        </button>
      )}

      {status.length > 0 && (
        <div className="mt-6 bg-gray-50 dark:bg-[#1e1b1c] rounded-lg p-4 font-mono text-sm">
          {status.map((line, i) => (
            <div
              key={i}
              className={`${line.startsWith('ERROR') ? 'text-red-600' : line.startsWith('===') ? 'text-green-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
            >
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      )}

      {done && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-green-700 dark:text-green-400 font-medium">
            Datos cargados exitosamente. Podés ver el canvas en{' '}
            <a href="/bmc" className="underline">Diagnóstico BMC</a>.
          </p>
        </div>
      )}
    </div>
  );
}
