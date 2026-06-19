-- 20260619_invoice_collector.sql
-- Track which team member collected each invoice.
--
-- Background: hasta hoy no se sabe en finanzas quién cobró cada factura.
-- Para liquidar entre socios y reportes de "balance por persona" se necesita
-- asociar cada cobro a un user de la org.
--
-- Approach: nullable FK a users(id). NULL = legacy (no se registró). En
-- cuanto el cobrador se selecciona al marcar la factura como 'paid', se
-- guarda acá.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS collected_by_user_id UUID
    REFERENCES users(id) ON DELETE SET NULL;

-- Index para queries por cobrador (e.g. "todas las facturas que cobró X")
-- y para los widgets de balance por socio.
CREATE INDEX IF NOT EXISTS idx_invoices_collected_by
  ON invoices(collected_by_user_id)
  WHERE collected_by_user_id IS NOT NULL;

-- RLS: same org scope as existing invoices policies. Verificar manualmente:
-- las policies de SELECT/UPDATE sobre invoices ya filtran por organization_id,
-- así que esta columna queda automáticamente protegida.

COMMENT ON COLUMN invoices.collected_by_user_id IS
  'Team member (users.id) que cobró la factura. NULL para invoices legacy o no asignadas.';
