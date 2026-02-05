-- =============================================
-- CHECK-IN CLIENTE MODULE
-- =============================================

-- 1. Plantillas de check-in
CREATE TABLE IF NOT EXISTS checkin_plantillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL DEFAULT 'estandar', -- estandar, onboarding, avanzado, cierre, custom
  es_publica BOOLEAN NOT NULL DEFAULT false,
  creado_por UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE checkin_plantillas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkin_plantillas_select" ON checkin_plantillas
  FOR SELECT TO authenticated
  USING (
    es_publica = true
    OR organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "checkin_plantillas_insert" ON checkin_plantillas
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "checkin_plantillas_update" ON checkin_plantillas
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "checkin_plantillas_delete" ON checkin_plantillas
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 2. Preguntas de plantilla
CREATE TABLE IF NOT EXISTS checkin_plantilla_preguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id UUID NOT NULL REFERENCES checkin_plantillas(id) ON DELETE CASCADE,
  seccion TEXT NOT NULL, -- pulso, compromisos, avances, problemas, proxima_semana, feedback
  pregunta TEXT NOT NULL,
  tipo_respuesta TEXT NOT NULL DEFAULT 'texto', -- texto, emoji, slider, si_no, checkbox
  orden INT NOT NULL DEFAULT 0,
  es_requerida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE checkin_plantilla_preguntas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkin_plantilla_preguntas_select" ON checkin_plantilla_preguntas
  FOR SELECT TO authenticated
  USING (
    plantilla_id IN (
      SELECT id FROM checkin_plantillas WHERE es_publica = true
      OR organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "checkin_plantilla_preguntas_insert" ON checkin_plantilla_preguntas
  FOR INSERT TO authenticated
  WITH CHECK (
    plantilla_id IN (
      SELECT id FROM checkin_plantillas
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "checkin_plantilla_preguntas_update" ON checkin_plantilla_preguntas
  FOR UPDATE TO authenticated
  USING (
    plantilla_id IN (
      SELECT id FROM checkin_plantillas
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "checkin_plantilla_preguntas_delete" ON checkin_plantilla_preguntas
  FOR DELETE TO authenticated
  USING (
    plantilla_id IN (
      SELECT id FROM checkin_plantillas
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

-- 3. Configuración de check-in por proyecto
CREATE TABLE IF NOT EXISTS checkin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  frecuencia TEXT NOT NULL DEFAULT 'semanal', -- semanal, quincenal, mensual
  dia_preferido TEXT NOT NULL DEFAULT 'lunes', -- lunes, martes, miercoles, jueves, viernes
  hora_envio TEXT NOT NULL DEFAULT '09:00',
  activo BOOLEAN NOT NULL DEFAULT true,
  plantilla_id UUID REFERENCES checkin_plantillas(id) ON DELETE SET NULL,
  metricas_config JSONB DEFAULT '[]'::jsonb, -- [{nombre, unidad, meta}]
  creado_por UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, proyecto_id)
);

ALTER TABLE checkin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkin_config_select" ON checkin_config
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "checkin_config_insert" ON checkin_config
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "checkin_config_update" ON checkin_config
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "checkin_config_delete" ON checkin_config
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 4. Check-ins (cada instancia)
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  config_id UUID REFERENCES checkin_config(id) ON DELETE SET NULL,
  proyecto_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  numero INT NOT NULL DEFAULT 1,
  periodo TEXT, -- "Semana del 3 al 9 de febrero"
  estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente, completado_cliente, en_reunion, cerrado
  fecha_envio TIMESTAMPTZ,
  fecha_completado_cliente TIMESTAMPTZ,
  fecha_reunion TIMESTAMPTZ,
  fecha_cierre TIMESTAMPTZ,
  pulso_score INT, -- 1-10
  nps_score INT, -- 1-10
  emoji TEXT, -- feliz, neutral, triste
  palabra_clave TEXT, -- una palabra que describe la semana
  necesita_ayuda_urgente BOOLEAN DEFAULT false,
  detalle_ayuda_urgente TEXT,
  notas_consultor TEXT,
  resumen_reunion TEXT,
  creado_por UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_checkins_token ON checkins(token);
CREATE INDEX idx_checkins_proyecto ON checkins(proyecto_id);
CREATE INDEX idx_checkins_org ON checkins(organization_id);

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- Authenticated users: org isolation
CREATE POLICY "checkins_select" ON checkins
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "checkins_insert" ON checkins
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "checkins_update" ON checkins
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "checkins_delete" ON checkins
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Anonymous access: read/update by token (for public form)
CREATE POLICY "checkins_anon_select" ON checkins
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "checkins_anon_update" ON checkins
  FOR UPDATE TO anon
  USING (true);

-- 5. Preguntas y respuestas del check-in
CREATE TABLE IF NOT EXISTS checkin_preguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  seccion TEXT NOT NULL, -- pulso, avances, problemas, proxima_semana, feedback
  pregunta TEXT NOT NULL,
  respuesta TEXT,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkin_preguntas_checkin ON checkin_preguntas(checkin_id);

ALTER TABLE checkin_preguntas ENABLE ROW LEVEL SECURITY;

-- Authenticated: via checkin org
CREATE POLICY "checkin_preguntas_select" ON checkin_preguntas
  FOR SELECT TO authenticated
  USING (
    checkin_id IN (
      SELECT id FROM checkins
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "checkin_preguntas_insert" ON checkin_preguntas
  FOR INSERT TO authenticated
  WITH CHECK (
    checkin_id IN (
      SELECT id FROM checkins
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "checkin_preguntas_update" ON checkin_preguntas
  FOR UPDATE TO authenticated
  USING (
    checkin_id IN (
      SELECT id FROM checkins
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "checkin_preguntas_delete" ON checkin_preguntas
  FOR DELETE TO authenticated
  USING (
    checkin_id IN (
      SELECT id FROM checkins
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

-- Anonymous: can read and update preguntas for public form
CREATE POLICY "checkin_preguntas_anon_select" ON checkin_preguntas
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "checkin_preguntas_anon_update" ON checkin_preguntas
  FOR UPDATE TO anon
  USING (true);

-- 6. Compromisos
CREATE TABLE IF NOT EXISTS checkin_compromisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  responsable TEXT NOT NULL DEFAULT 'cliente', -- cliente, consultor
  fecha_limite DATE,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente, en_progreso, completado, no_cumplido
  prioridad TEXT NOT NULL DEFAULT 'media', -- alta, media, baja
  checkin_origen_id UUID REFERENCES checkins(id) ON DELETE SET NULL,
  checkin_revision_id UUID REFERENCES checkins(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkin_compromisos_checkin ON checkin_compromisos(checkin_id);
CREATE INDEX idx_checkin_compromisos_proyecto ON checkin_compromisos(proyecto_id);

ALTER TABLE checkin_compromisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkin_compromisos_select" ON checkin_compromisos
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "checkin_compromisos_insert" ON checkin_compromisos
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "checkin_compromisos_update" ON checkin_compromisos
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "checkin_compromisos_delete" ON checkin_compromisos
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Anonymous: can read and update compromisos for public form
CREATE POLICY "checkin_compromisos_anon_select" ON checkin_compromisos
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "checkin_compromisos_anon_update" ON checkin_compromisos
  FOR UPDATE TO anon
  USING (true);

-- 7. Métricas del check-in
CREATE TABLE IF NOT EXISTS checkin_metricas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  nombre_metrica TEXT NOT NULL,
  valor_actual NUMERIC,
  valor_meta NUMERIC,
  valor_anterior NUMERIC,
  tendencia TEXT DEFAULT 'igual', -- subio, bajo, igual
  unidad TEXT DEFAULT 'numero', -- porcentaje, numero, moneda
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkin_metricas_checkin ON checkin_metricas(checkin_id);

ALTER TABLE checkin_metricas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkin_metricas_select" ON checkin_metricas
  FOR SELECT TO authenticated
  USING (
    checkin_id IN (
      SELECT id FROM checkins
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "checkin_metricas_insert" ON checkin_metricas
  FOR INSERT TO authenticated
  WITH CHECK (
    checkin_id IN (
      SELECT id FROM checkins
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "checkin_metricas_update" ON checkin_metricas
  FOR UPDATE TO authenticated
  USING (
    checkin_id IN (
      SELECT id FROM checkins
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "checkin_metricas_delete" ON checkin_metricas
  FOR DELETE TO authenticated
  USING (
    checkin_id IN (
      SELECT id FROM checkins
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );
