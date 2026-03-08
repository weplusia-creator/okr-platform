import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceRoleKey || token !== serviceRoleKey) {
    return res.status(401).json({ error: 'Invalid service role key' });
  }

  const organizationId = req.query.organization_id as string;
  if (!organizationId) return res.status(400).json({ error: 'organization_id query param is required' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const db = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: projects, error: projErr } = await db
      .from('projects')
      .select('id, name, description, status, product, monthly_fee, budget, estimated_cost, start_date, estimated_end_date, actual_end_date, notes, created_at, updated_at, clients(id, name)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (projErr) return res.status(500).json({ error: projErr.message });

    const projectIds = (projects || []).map((p: any) => p.id);

    let payments: any[] = [];
    if (projectIds.length > 0) {
      const { data, error: payErr } = await db
        .from('project_payments')
        .select('id, project_id, month, amount, status, paid_date, notes')
        .in('project_id', projectIds)
        .order('month');

      if (payErr) return res.status(500).json({ error: payErr.message });
      payments = data || [];
    }

    const paymentsByProject: Record<string, any[]> = {};
    for (const p of payments) {
      if (!paymentsByProject[p.project_id]) paymentsByProject[p.project_id] = [];
      paymentsByProject[p.project_id].push(p);
    }

    const result = (projects || []).map((p: any) => ({
      ...p,
      payments: paymentsByProject[p.id] || [],
    }));

    return res.status(200).json({ total: result.length, projects: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
