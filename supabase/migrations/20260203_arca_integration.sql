-- ARCA Integration: Electronic Invoicing (Facturación Electrónica Argentina)
-- Migration: 2026-02-03

-- ============================================================================
-- 1. Organization CUITs (configuración de CUITs por organización)
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_cuits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cuit VARCHAR(13) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  fantasy_name VARCHAR(255),
  iva_condition VARCHAR(50) NOT NULL,
  gross_income_number VARCHAR(50),
  activity_start_date DATE,
  address TEXT,

  -- Certificados digitales (encriptados con AES-256-CBC)
  certificate_data BYTEA,
  private_key_data BYTEA,
  certificate_expiry DATE,

  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  environment VARCHAR(20) DEFAULT 'testing',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (organization_id, cuit)
);

-- ============================================================================
-- 2. Puntos de Venta
-- ============================================================================

CREATE TABLE IF NOT EXISTS arca_puntos_venta (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_cuit_id UUID NOT NULL REFERENCES organization_cuits(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (organization_cuit_id, numero)
);

-- ============================================================================
-- 3. WSAA Tokens (cache de autenticación)
-- ============================================================================

CREATE TABLE IF NOT EXISTS arca_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_cuit_id UUID NOT NULL REFERENCES organization_cuits(id) ON DELETE CASCADE,
  service VARCHAR(50) NOT NULL DEFAULT 'wsfe',
  token TEXT NOT NULL,
  sign TEXT NOT NULL,
  generation_time TIMESTAMPTZ NOT NULL,
  expiration_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (organization_cuit_id, service)
);

-- ============================================================================
-- 4. ARCA Invoices (facturas electrónicas emitidas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS arca_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  organization_cuit_id UUID NOT NULL REFERENCES organization_cuits(id),
  punto_venta_id UUID NOT NULL REFERENCES arca_puntos_venta(id),

  tipo_comprobante INTEGER NOT NULL,
  tipo_comprobante_name VARCHAR(50),

  receptor_cuit VARCHAR(13),
  receptor_tipo_doc INTEGER,
  receptor_condicion_iva VARCHAR(50),

  numero_comprobante BIGINT,
  cae VARCHAR(14),
  cae_vencimiento DATE,

  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  error_code VARCHAR(20),
  error_message TEXT,
  observations TEXT,

  request_xml TEXT,
  response_xml TEXT,
  retry_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. Modificar tabla clients (agregar campos ARCA)
-- ============================================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS tipo_documento INTEGER DEFAULT 80,
  ADD COLUMN IF NOT EXISTS condicion_iva VARCHAR(50);

-- ============================================================================
-- 6. Modificar tabla invoices (agregar campos ARCA)
-- ============================================================================

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS arca_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cae VARCHAR(14),
  ADD COLUMN IF NOT EXISTS cae_vencimiento DATE;

-- ============================================================================
-- 7. Row Level Security
-- ============================================================================

ALTER TABLE organization_cuits ENABLE ROW LEVEL SECURITY;
ALTER TABLE arca_puntos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE arca_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE arca_invoices ENABLE ROW LEVEL SECURITY;

-- organization_cuits: acceso por organización del usuario
CREATE POLICY "org_cuits_access" ON organization_cuits
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- arca_puntos_venta: acceso via CUIT de la organización
CREATE POLICY "arca_pv_access" ON arca_puntos_venta
  FOR ALL USING (
    organization_cuit_id IN (
      SELECT oc.id FROM organization_cuits oc
      JOIN users u ON u.organization_id = oc.organization_id
      WHERE u.id = auth.uid()
    )
  );

-- arca_tokens: acceso via CUIT de la organización
CREATE POLICY "arca_tokens_access" ON arca_tokens
  FOR ALL USING (
    organization_cuit_id IN (
      SELECT oc.id FROM organization_cuits oc
      JOIN users u ON u.organization_id = oc.organization_id
      WHERE u.id = auth.uid()
    )
  );

-- arca_invoices: acceso via CUIT de la organización
CREATE POLICY "arca_invoices_access" ON arca_invoices
  FOR ALL USING (
    organization_cuit_id IN (
      SELECT oc.id FROM organization_cuits oc
      JOIN users u ON u.organization_id = oc.organization_id
      WHERE u.id = auth.uid()
    )
  );

-- ============================================================================
-- 8. Triggers de updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_organization_cuits
  BEFORE UPDATE ON organization_cuits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_arca_invoices
  BEFORE UPDATE ON arca_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
