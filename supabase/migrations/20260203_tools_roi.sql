-- ============================================
-- Tools: ROI Calculator
-- ============================================

-- ROI Analyses
CREATE TABLE roi_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- General
  name VARCHAR(255) NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(255),
  project_id UUID,
  solution_description TEXT,
  analysis_period INTEGER NOT NULL DEFAULT 12,
  currency VARCHAR(3) NOT NULL DEFAULT 'ARS',
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  responsible VARCHAR(255),

  -- Items (JSONB arrays)
  initial_costs JSONB DEFAULT '[]'::jsonb,
  recurring_costs JSONB DEFAULT '[]'::jsonb,
  hidden_costs JSONB DEFAULT '[]'::jsonb,
  direct_savings JSONB DEFAULT '[]'::jsonb,
  additional_revenue JSONB DEFAULT '[]'::jsonb,
  productivity_benefits JSONB DEFAULT '[]'::jsonb,
  intangible_benefits JSONB DEFAULT '[]'::jsonb,

  -- Notes
  context_notes TEXT,
  conclusion_notes TEXT,
  assumptions TEXT,

  status VARCHAR(20) NOT NULL DEFAULT 'draft',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- ROI Templates
CREATE TABLE roi_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  is_system BOOLEAN DEFAULT false,

  initial_costs JSONB DEFAULT '[]'::jsonb,
  recurring_costs JSONB DEFAULT '[]'::jsonb,
  hidden_costs JSONB DEFAULT '[]'::jsonb,
  direct_savings JSONB DEFAULT '[]'::jsonb,
  additional_revenue JSONB DEFAULT '[]'::jsonb,
  productivity_benefits JSONB DEFAULT '[]'::jsonb,
  intangible_benefits JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_roi_analyses_org ON roi_analyses(organization_id);
CREATE INDEX idx_roi_analyses_client ON roi_analyses(client_id);
CREATE INDEX idx_roi_analyses_status ON roi_analyses(status);
CREATE INDEX idx_roi_templates_org ON roi_templates(organization_id);

-- Updated at trigger
CREATE TRIGGER set_roi_analyses_updated_at
  BEFORE UPDATE ON roi_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE roi_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE roi_templates ENABLE ROW LEVEL SECURITY;

-- roi_analyses policies
CREATE POLICY "roi_analyses_select" ON roi_analyses
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "roi_analyses_insert" ON roi_analyses
  FOR INSERT WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "roi_analyses_update" ON roi_analyses
  FOR UPDATE USING (organization_id = get_user_org_id());

CREATE POLICY "roi_analyses_delete" ON roi_analyses
  FOR DELETE USING (organization_id = get_user_org_id());

-- roi_templates policies (user's own + system templates)
CREATE POLICY "roi_templates_select" ON roi_templates
  FOR SELECT USING (is_system = true OR organization_id = get_user_org_id());

CREATE POLICY "roi_templates_insert" ON roi_templates
  FOR INSERT WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "roi_templates_update" ON roi_templates
  FOR UPDATE USING (organization_id = get_user_org_id());

CREATE POLICY "roi_templates_delete" ON roi_templates
  FOR DELETE USING (organization_id = get_user_org_id() AND is_system = false);

-- ============================================
-- System Templates (available to all orgs)
-- ============================================
INSERT INTO roi_templates (name, description, category, is_system, initial_costs, recurring_costs, hidden_costs, direct_savings, additional_revenue, productivity_benefits, intangible_benefits)
VALUES
(
  'ROI de Software / SaaS',
  'Plantilla para calcular el retorno de implementar una solución de software.',
  'software',
  true,
  '[{"id":"t1","concept":"Implementación y configuración","amount":0},{"id":"t2","concept":"Licencias iniciales","amount":0},{"id":"t3","concept":"Capacitación del equipo","amount":0}]'::jsonb,
  '[{"id":"t4","concept":"Suscripción mensual","monthlyAmount":0},{"id":"t5","concept":"Soporte técnico","monthlyAmount":0}]'::jsonb,
  '[{"id":"t6","concept":"Tiempo del equipo en implementación","hours":0,"hourlyRate":0},{"id":"t7","concept":"Migración de datos","hours":0,"hourlyRate":0}]'::jsonb,
  '[{"id":"t8","concept":"Eliminar herramienta actual","monthlyAmount":0,"confidence":"high"},{"id":"t9","concept":"Reducción de errores manuales","monthlyAmount":0,"confidence":"medium"}]'::jsonb,
  '[{"id":"t10","concept":"Aumento de ventas por mejor gestión","monthlyAmount":0,"confidence":"medium"}]'::jsonb,
  '[{"id":"t11","concept":"Automatización de procesos","hoursPerMonth":0,"hourlyRate":0,"peopleAffected":1,"confidence":"high"},{"id":"t12","concept":"Reducción tiempo en reportes","hoursPerMonth":0,"hourlyRate":0,"peopleAffected":1,"confidence":"high"}]'::jsonb,
  '[{"id":"t13","benefit":"Mejor experiencia del cliente","impact":"high"},{"id":"t14","benefit":"Información en tiempo real para decisiones","impact":"high"}]'::jsonb
),
(
  'ROI de Consultoría',
  'Plantilla para justificar el retorno de un servicio de consultoría.',
  'consulting',
  true,
  '[{"id":"t1","concept":"Fee de consultoría","amount":0},{"id":"t2","concept":"Diagnóstico inicial","amount":0}]'::jsonb,
  '[{"id":"t3","concept":"Acompañamiento mensual","monthlyAmount":0}]'::jsonb,
  '[{"id":"t4","concept":"Tiempo del equipo en reuniones","hours":0,"hourlyRate":0},{"id":"t5","concept":"Implementación de recomendaciones","hours":0,"hourlyRate":0}]'::jsonb,
  '[{"id":"t6","concept":"Optimización de costos operativos","monthlyAmount":0,"confidence":"medium"},{"id":"t7","concept":"Reducción de desperdicios","monthlyAmount":0,"confidence":"medium"}]'::jsonb,
  '[{"id":"t8","concept":"Crecimiento de facturación","monthlyAmount":0,"confidence":"low"},{"id":"t9","concept":"Nuevos canales de venta","monthlyAmount":0,"confidence":"low"}]'::jsonb,
  '[{"id":"t10","concept":"Mejora en procesos internos","hoursPerMonth":0,"hourlyRate":0,"peopleAffected":1,"confidence":"medium"}]'::jsonb,
  '[{"id":"t11","benefit":"Visión estratégica externa","impact":"high"},{"id":"t12","benefit":"Mejora en cultura organizacional","impact":"medium"}]'::jsonb
),
(
  'ROI de Automatización',
  'Plantilla para calcular el retorno de automatizar procesos.',
  'automation',
  true,
  '[{"id":"t1","concept":"Desarrollo / configuración","amount":0},{"id":"t2","concept":"Integración con sistemas existentes","amount":0}]'::jsonb,
  '[{"id":"t3","concept":"Mantenimiento mensual","monthlyAmount":0},{"id":"t4","concept":"Infraestructura / hosting","monthlyAmount":0}]'::jsonb,
  '[{"id":"t5","concept":"Curva de aprendizaje del equipo","hours":0,"hourlyRate":0}]'::jsonb,
  '[{"id":"t6","concept":"Reducción de personal para tarea","monthlyAmount":0,"confidence":"high"},{"id":"t7","concept":"Eliminación de errores humanos","monthlyAmount":0,"confidence":"medium"}]'::jsonb,
  '[{"id":"t8","concept":"Mayor capacidad de procesamiento","monthlyAmount":0,"confidence":"medium"}]'::jsonb,
  '[{"id":"t9","concept":"Horas ahorradas por automatización","hoursPerMonth":0,"hourlyRate":0,"peopleAffected":1,"confidence":"high"}]'::jsonb,
  '[{"id":"t10","benefit":"Disponibilidad 24/7","impact":"high"},{"id":"t11","benefit":"Escalabilidad sin costo adicional","impact":"high"}]'::jsonb
),
(
  'ROI de Capacitación',
  'Plantilla para justificar la inversión en formación del equipo.',
  'training',
  true,
  '[{"id":"t1","concept":"Programa de capacitación","amount":0},{"id":"t2","concept":"Material y recursos","amount":0}]'::jsonb,
  '[]'::jsonb,
  '[{"id":"t3","concept":"Horas del equipo en capacitación","hours":0,"hourlyRate":0}]'::jsonb,
  '[{"id":"t4","concept":"Reducción de errores","monthlyAmount":0,"confidence":"medium"},{"id":"t5","concept":"Menor rotación de personal","monthlyAmount":0,"confidence":"low"}]'::jsonb,
  '[{"id":"t6","concept":"Mayor productividad del equipo","monthlyAmount":0,"confidence":"medium"}]'::jsonb,
  '[{"id":"t7","concept":"Tareas realizadas más rápido","hoursPerMonth":0,"hourlyRate":0,"peopleAffected":1,"confidence":"medium"}]'::jsonb,
  '[{"id":"t8","benefit":"Mayor satisfacción del equipo","impact":"high"},{"id":"t9","benefit":"Mejor atención al cliente","impact":"medium"}]'::jsonb
),
(
  'ROI de Marketing Digital',
  'Plantilla para medir el retorno de campañas y estrategias digitales.',
  'marketing',
  true,
  '[{"id":"t1","concept":"Diseño y setup de campañas","amount":0},{"id":"t2","concept":"Creación de contenido inicial","amount":0}]'::jsonb,
  '[{"id":"t3","concept":"Inversión en pauta publicitaria","monthlyAmount":0},{"id":"t4","concept":"Gestión de redes / agencia","monthlyAmount":0},{"id":"t5","concept":"Herramientas de marketing","monthlyAmount":0}]'::jsonb,
  '[{"id":"t6","concept":"Tiempo del equipo en coordinación","hours":0,"hourlyRate":0}]'::jsonb,
  '[]'::jsonb,
  '[{"id":"t7","concept":"Nuevos clientes por mes","monthlyAmount":0,"confidence":"medium"},{"id":"t8","concept":"Aumento ticket promedio","monthlyAmount":0,"confidence":"low"}]'::jsonb,
  '[]'::jsonb,
  '[{"id":"t9","benefit":"Mayor visibilidad de marca","impact":"high"},{"id":"t10","benefit":"Posicionamiento como referente","impact":"medium"}]'::jsonb
);
